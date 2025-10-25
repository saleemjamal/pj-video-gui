import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs-extra';
import type { TextOverlay } from '../themes/types';

const execFileAsync = promisify(execFile);

// Get FFmpeg binary path
const ffmpegPath = ffmpegInstaller.path;

export interface LogoClipOptions {
  logoPath: string;
  duration: number;
  outputPath: string;
  width: number;
  height: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
}

export interface ConcatenateOptions {
  videoPaths: string[];
  outputPath: string;
}

export interface AddTextOverlaysOptions {
  videoPath: string;
  outputPath: string;
  overlays: TextOverlay[];
}

/**
 * Create a video clip from a static logo image with fade effects
 */
export async function createLogoClip(options: LogoClipOptions): Promise<string> {
  const { logoPath, duration, outputPath, width, height, fadeIn = true, fadeOut = true } = options;

  console.log(`Creating logo clip: ${duration}s at ${width}x${height}`);

  // Build filter complex for fade effects
  let filterComplex = `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25`;

  if (fadeIn && fadeOut) {
    // Fade in at start, fade out at end
    filterComplex += `,fade=t=in:st=0:d=0.5,fade=t=out:st=${duration - 0.5}:d=0.5`;
  } else if (fadeIn) {
    filterComplex += `,fade=t=in:st=0:d=0.5`;
  } else if (fadeOut) {
    filterComplex += `,fade=t=out:st=${duration - 0.5}:d=0.5`;
  }

  const args = [
    '-loop', '1',
    '-i', logoPath,
    '-filter_complex', filterComplex,
    '-t', duration.toString(),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-y',
    outputPath
  ];

  try {
    const { stdout, stderr } = await execFileAsync(ffmpegPath, args);
    console.log('Logo clip created successfully');
    if (stderr) console.log('FFmpeg output:', stderr);
    return outputPath;
  } catch (error) {
    console.error('Error creating logo clip:', error);
    throw new Error(`Failed to create logo clip: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Concatenate multiple video files into one
 */
export async function concatenateVideos(options: ConcatenateOptions): Promise<string> {
  const { videoPaths, outputPath } = options;

  if (videoPaths.length === 0) {
    throw new Error('No videos to concatenate');
  }

  // If only one video, just copy it
  if (videoPaths.length === 1) {
    await fs.copyFile(videoPaths[0], outputPath);
    return outputPath;
  }

  console.log(`Concatenating ${videoPaths.length} video clips`);

  // Create a temporary file list for FFmpeg concat demuxer
  const listFilePath = path.join(path.dirname(outputPath), 'concat_list.txt');
  const listContent = videoPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  await fs.writeFile(listFilePath, listContent, 'utf-8');

  const args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', listFilePath,
    '-c', 'copy',
    '-y',
    outputPath
  ];

  try {
    const { stdout, stderr } = await execFileAsync(ffmpegPath, args);
    console.log('Videos concatenated successfully');
    if (stderr) console.log('FFmpeg output:', stderr);

    // Clean up temp file
    await fs.remove(listFilePath);

    return outputPath;
  } catch (error) {
    console.error('Error concatenating videos:', error);
    // Clean up temp file on error
    try {
      await fs.remove(listFilePath);
    } catch {}
    throw new Error(`Failed to concatenate videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get video dimensions (width x height)
 */
export async function getVideoDimensions(videoPath: string): Promise<{ width: number; height: number }> {
  // Use ffmpeg instead of ffprobe to get dimensions
  const args = [
    '-i', videoPath,
    '-hide_banner'
  ];

  try {
    // FFmpeg outputs stream info to stderr even with error exit code
    try {
      await execFileAsync(ffmpegPath, args);
    } catch (execError: any) {
      // FFmpeg exits with error when no output specified, but stderr contains info
      const output = execError.stderr || '';

      // Parse dimensions from output like "Stream #0:0: Video: ..., 1080x1920"
      const match = output.match(/(\d{3,5})x(\d{3,5})/);
      if (match) {
        return { width: parseInt(match[1]), height: parseInt(match[2]) };
      }

      throw new Error('Could not parse video dimensions from FFmpeg output');
    }

    // Should not reach here
    throw new Error('Unexpected FFmpeg execution result');
  } catch (error) {
    console.error('Error getting video dimensions:', error);
    throw new Error(`Failed to get video dimensions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Add text overlays to a video with custom styling and timing
 */
export async function addTextOverlays(options: AddTextOverlaysOptions): Promise<string> {
  const { videoPath, outputPath, overlays } = options;

  if (overlays.length === 0) {
    // No overlays, just copy the video
    await fs.copyFile(videoPath, outputPath);
    return outputPath;
  }

  console.log(`Adding ${overlays.length} text overlay(s) to video`);

  // Helper function to escape text for FFmpeg
  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/:/g, '\\:')     // Escape colons
      .replace(/'/g, "\\'");    // Escape single quotes
  };

  // Helper function to get position expression
  const getPositionExpression = (position: TextOverlay['position']): { x: string; y: string } => {
    const margin = 50; // Margin from edges in pixels

    switch (position) {
      case 'top-left':
        return { x: `${margin}`, y: `${margin}` };
      case 'top-center':
        return { x: '(w-text_w)/2', y: `${margin}` };
      case 'top-right':
        return { x: `w-text_w-${margin}`, y: `${margin}` };
      case 'center':
        return { x: '(w-text_w)/2', y: '(h-text_h)/2' };
      case 'bottom-left':
        return { x: `${margin}`, y: `h-text_h-${margin}` };
      case 'bottom-center':
        return { x: '(w-text_w)/2', y: `h-text_h-${margin}` };
      case 'bottom-right':
        return { x: `w-text_w-${margin}`, y: `h-text_h-${margin}` };
      default:
        return { x: '(w-text_w)/2', y: '(h-text_h)/2' };
    }
  };

  // Helper function to convert hex color to FFmpeg color format
  const hexToFFmpegColor = (hexColor: string, opacity: number = 1.0): string => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    // FFmpeg uses hex colors directly, opacity via @ suffix
    return `0x${hex}@${opacity}`;
  };

  // Build drawtext filters for each overlay
  const drawtextFilters = overlays.map((overlay, index) => {
    const {
      text,
      position,
      startTime,
      endTime,
      fadeDuration = 0.5,
      textColor = '#FFFFFF',
      fontSize = 64,
      fontWeight = 'bold',
      backgroundColor,
      backgroundOpacity = 0.7,
    } = overlay;

    const escapedText = escapeText(text);
    const { x, y } = getPositionExpression(position);

    // Build drawtext filter parts
    const parts: string[] = [
      `text='${escapedText}'`,
      `fontfile=/Windows/Fonts/arialbd.ttf`, // Arial Bold on Windows
      `fontsize=${fontSize}`,
      `fontcolor=${hexToFFmpegColor(textColor, 1.0)}`,
      `x=${x}`,
      `y=${y}`,
    ];

    // Add background box if specified
    if (backgroundColor) {
      parts.push('box=1');
      parts.push(`boxcolor=${hexToFFmpegColor(backgroundColor, backgroundOpacity)}`);
      parts.push('boxborderw=10'); // Padding around text
    }

    // Add fade in/out effects using alpha expression
    const fadeIn = fadeDuration;
    const fadeOut = fadeDuration;
    const alphaParts: string[] = [];

    // Fade in at start
    if (fadeIn > 0) {
      alphaParts.push(`if(lt(t-${startTime}\\,${fadeIn})\\,(t-${startTime})/${fadeIn}\\,1)`);
    }

    // Fade out at end
    if (fadeOut > 0 && endTime > startTime + fadeOut) {
      const fadeStartTime = endTime - fadeOut;
      alphaParts.push(`if(gt(t\\,${fadeStartTime})\\,(${endTime}-t)/${fadeOut}\\,1)`);
    }

    // Apply alpha expression if we have fades
    if (alphaParts.length > 0) {
      const alphaExpr = alphaParts.length === 2
        ? `min(${alphaParts[0]}\\,${alphaParts[1]})`
        : alphaParts[0];
      parts.push(`alpha='${alphaExpr}'`);
    }

    // Enable only during specified time range
    parts.push(`enable='between(t\\,${startTime}\\,${endTime})'`);

    return `drawtext=${parts.join(':')}`;
  });

  // Combine all drawtext filters
  const filterComplex = drawtextFilters.join(',');

  const args = [
    '-i', videoPath,
    '-vf', filterComplex,
    '-c:v', 'libx264',
    '-c:a', 'copy', // Copy audio without re-encoding
    '-pix_fmt', 'yuv420p',
    '-y',
    outputPath
  ];

  try {
    const { stdout, stderr } = await execFileAsync(ffmpegPath, args);
    console.log('Text overlays added successfully');
    if (stderr) console.log('FFmpeg output:', stderr);
    return outputPath;
  } catch (error) {
    console.error('Error adding text overlays:', error);
    throw new Error(`Failed to add text overlays: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

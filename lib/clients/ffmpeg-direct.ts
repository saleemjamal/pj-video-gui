import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs-extra';

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

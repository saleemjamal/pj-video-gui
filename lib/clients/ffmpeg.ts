import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface MergeOptions {
  videoPath: string;
  audioPath: string;
  outputPath: string;
}

// Merge video and audio
export async function mergeVideoAudio(options: MergeOptions): Promise<string> {
  const { videoPath, audioPath, outputPath } = options;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        '-c:v copy',        // Copy video stream without re-encoding
        '-c:a aac',         // Encode audio as AAC
        '-map 0:v:0',       // Map video from first input
        '-map 1:a:0',       // Map audio from second input
        '-shortest',        // End when shortest stream ends
      ])
      .on('start', (cmd) => {
        console.log('FFmpeg command:', cmd);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Processing: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('Video with voiceover created successfully!');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message);
        reject(err);
      })
      .save(outputPath);
  });
}

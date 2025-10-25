import { getVideoProvider } from '../video/factory';
import { getVoiceoverProvider } from '../voiceover/factory';
import { generateVideoPrompt, generateScript } from '../clients/openai';
import { mergeVideoAudio } from '../clients/ffmpeg';
import { createLogoClip, concatenateVideos, getVideoDimensions, addTextOverlays } from '../clients/ffmpeg-direct';
import type { VideoTheme, TextOverlay } from '../themes/types';
import { DEFAULT_THEME } from '../themes/config';
import {
  createOutputFolder,
  downloadVideo,
  saveAudioFile,
  saveImageFile,
} from '../storage/files';
import { saveMetadata } from '../storage/metadata';
import type { GenerationMetadata } from '../storage/types';
import type { VideoProviderType } from '../video/types';
import type { VoiceoverProviderType } from '../voiceover/types';
import type { GenerationState } from './state-machine';
import path from 'path';

export interface PipelineConfig {
  // Image
  image: string; // base64

  // Video settings
  videoProvider: VideoProviderType;
  duration: number;
  aspectRatio: string;
  resolution: string;

  // Content
  prompt?: string; // If not provided, will be generated
  script?: string; // If not provided, will be generated

  // Theme (affects script tone and provides styling presets)
  theme?: VideoTheme; // Default: 'informational'

  // Voiceover
  voiceProvider: VoiceoverProviderType;
  voice: string;

  // Logo (optional)
  logo?: string; // base64
  enableLogoIntro?: boolean;
  enableLogoOutro?: boolean;
  introDuration?: number;
  outroDuration?: number;

  // Text Overlays (optional)
  textOverlays?: TextOverlay[];

  // Callbacks
  onStateChange?: (state: GenerationState) => void;
  onProgress?: (progress: number) => void;
}

export interface PipelineResult {
  success: boolean;
  outputFolder: string;
  finalVideoPath: string;
  metadata: GenerationMetadata;
  error?: string;
}

export class VideoGenerationPipeline {
  private config: PipelineConfig;
  private timings: Record<string, number> = {};

  constructor(config: PipelineConfig) {
    this.config = config;
  }

  private updateState(state: GenerationState) {
    if (this.config.onStateChange) {
      this.config.onStateChange(state);
    }
  }

  private startTimer(key: string) {
    this.timings[`${key}_start`] = Date.now();
  }

  private endTimer(key: string): number {
    const start = this.timings[`${key}_start`];
    if (!start) return 0;
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    this.timings[key] = duration;
    return duration;
  }

  async execute(): Promise<PipelineResult> {
    const totalStartTime = Date.now();
    let outputFolder = '';
    let finalVideoPath = '';

    // Get providers once
    const videoProvider = getVideoProvider(this.config.videoProvider);
    const voiceoverProvider = getVoiceoverProvider(this.config.voiceProvider);

    try {
      // Stage 1: Create output folder
      this.updateState('saving_files');
      outputFolder = await createOutputFolder();

      // Stage 2: Save uploaded image
      this.updateState('uploading_image');
      await saveImageFile(this.config.image, outputFolder, 'source_image.jpg');

      // Stage 3: Generate prompt if not provided
      let prompt = this.config.prompt;
      if (!prompt) {
        this.updateState('analyzing_image');
        this.startTimer('vision');

        prompt = await generateVideoPrompt(
          this.config.image,
          this.config.duration,
          this.config.aspectRatio,
          videoProvider.name
        );

        this.endTimer('vision');
      }

      // Stage 4: Generate script if not provided
      let script = this.config.script;
      if (!script) {
        this.updateState('generating_script');
        this.startTimer('script');

        const theme = this.config.theme || DEFAULT_THEME;
        script = await generateScript('Product from image', this.config.duration, theme);

        this.endTimer('script');
      }

      // Stage 5: Generate video
      this.updateState('generating_video');
      this.startTimer('video');
      const videoUrl = await videoProvider.generateVideo({
        prompt,
        duration: this.config.duration,
        aspectRatio: this.config.aspectRatio,
        resolution: this.config.resolution,
        image: this.config.image,
        generateAudio: false,
      });

      this.endTimer('video');

      // Stage 6: Download video
      const timestamp = Date.now();
      const originalVideoFilename = `video_original_${timestamp}.mp4`;
      const originalVideoPath = await downloadVideo(
        videoUrl,
        outputFolder,
        originalVideoFilename
      );

      // Stage 6.5: Add logo intro/outro if enabled (FAIL-SAFE: continues with original video if logo fails)
      let videoForAudioMerge = originalVideoPath; // This will be used for audio merging later
      let logoError: string | undefined;

      if (this.config.logo && (this.config.enableLogoIntro || this.config.enableLogoOutro)) {
        try {
          this.updateState('saving_files');
          this.startTimer('logo');

          console.log('Starting logo processing...');

          // Save logo file
          const logoFilename = `logo_${timestamp}.png`;
          await saveImageFile(this.config.logo, outputFolder, logoFilename);
          const logoPath = path.join(outputFolder, logoFilename);

          // Get product video dimensions to match logo clips
          const { width, height } = await getVideoDimensions(originalVideoPath);
          console.log(`Video dimensions: ${width}x${height}`);

          const videosToConcat: string[] = [];

          // Create intro clip if enabled
          if (this.config.enableLogoIntro && this.config.introDuration) {
            console.log(`Creating ${this.config.introDuration}s intro clip...`);
            const introPath = path.join(outputFolder, `logo_intro_${timestamp}.mp4`);
            await createLogoClip({
              logoPath,
              duration: this.config.introDuration,
              outputPath: introPath,
              width,
              height,
              fadeIn: true,
              fadeOut: false,
            });
            videosToConcat.push(introPath);
          }

          // Add product video
          videosToConcat.push(originalVideoPath);

          // Create outro clip if enabled
          if (this.config.enableLogoOutro && this.config.outroDuration) {
            console.log(`Creating ${this.config.outroDuration}s outro clip...`);
            const outroPath = path.join(outputFolder, `logo_outro_${timestamp}.mp4`);
            await createLogoClip({
              logoPath,
              duration: this.config.outroDuration,
              outputPath: outroPath,
              width,
              height,
              fadeIn: false,
              fadeOut: true,
            });
            videosToConcat.push(outroPath);
          }

          // Concatenate all clips
          if (videosToConcat.length > 1) {
            console.log('Concatenating video clips...');
            const concatenatedPath = path.join(outputFolder, `video_with_logo_${timestamp}.mp4`);
            await concatenateVideos({
              videoPaths: videosToConcat,
              outputPath: concatenatedPath,
            });
            videoForAudioMerge = concatenatedPath;
            console.log('Logo processing completed successfully!');
          }

          this.endTimer('logo');
        } catch (logoErr) {
          // FAIL-SAFE: Log error but continue with original video
          const errorMsg = logoErr instanceof Error ? logoErr.message : 'Unknown logo processing error';
          console.error('⚠️  Logo processing failed, continuing with original video:', errorMsg);
          logoError = errorMsg;
          videoForAudioMerge = originalVideoPath; // Fall back to original video
          this.timings.logo = 0; // Reset logo timing
        }
      }

      // Stage 7: Generate voiceover
      this.updateState('generating_voiceover');
      this.startTimer('voiceover');

      const audioBuffer = await voiceoverProvider.generateVoiceover(
        script,
        this.config.voice
      );

      this.endTimer('voiceover');

      // Stage 8: Save voiceover
      const voiceoverFilename = `voiceover_${timestamp}.mp3`;
      const voiceoverPath = await saveAudioFile(
        audioBuffer,
        outputFolder,
        voiceoverFilename
      );

      // Stage 9: Merge video and audio
      this.updateState('merging_audio');
      this.startTimer('merge');

      let finalVideoFilename = `video_final_${timestamp}.mp4`;
      finalVideoPath = path.join(outputFolder, finalVideoFilename);

      await mergeVideoAudio({
        videoPath: videoForAudioMerge, // Use concatenated video if logo was added
        audioPath: voiceoverPath,
        outputPath: finalVideoPath,
      });

      this.endTimer('merge');

      // Stage 9.5: Add text overlays if enabled (FAIL-SAFE: continues with merged video if overlays fail)
      let textOverlayError: string | undefined;

      if (this.config.textOverlays && this.config.textOverlays.length > 0) {
        try {
          this.updateState('saving_files');
          this.startTimer('text_overlays');

          console.log(`Starting text overlay processing (${this.config.textOverlays.length} overlays)...`);

          // Apply text overlays to the merged video
          const textOverlayFilename = `video_with_overlays_${timestamp}.mp4`;
          const textOverlayPath = path.join(outputFolder, textOverlayFilename);

          await addTextOverlays({
            videoPath: finalVideoPath,
            outputPath: textOverlayPath,
            overlays: this.config.textOverlays,
          });

          // Update finalVideoPath and filename to the version with overlays
          finalVideoPath = textOverlayPath;
          finalVideoFilename = textOverlayFilename;
          console.log('Text overlays applied successfully!');

          this.endTimer('text_overlays');
        } catch (textErr) {
          // FAIL-SAFE: Log error but continue with video without overlays
          const errorMsg = textErr instanceof Error ? textErr.message : 'Unknown text overlay error';
          console.error('⚠️  Text overlay processing failed, continuing with video without overlays:', errorMsg);
          textOverlayError = errorMsg;
          // finalVideoPath stays as the merged video without overlays
          this.timings.text_overlays = 0; // Reset timing
        }
      }

      // Stage 10: Calculate costs
      const costs = {
        vision_analysis: prompt === this.config.prompt ? 0 : 0.02,
        prompt_generation: prompt === this.config.prompt ? 0 : 0.005,
        script_generation: script === this.config.script ? 0 : 0.005,
        video_generation: videoProvider.pricing.costPerVideo(
          this.config.duration,
          this.config.resolution
        ),
        voiceover: voiceoverProvider.getCost(script),
        total: 0,
      };
      costs.total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);

      // Stage 11: Save metadata
      this.updateState('saving_files');

      const totalTime = (Date.now() - totalStartTime) / 1000;

      const metadata: GenerationMetadata = {
        timestamp: new Date().toISOString(),
        video_path: finalVideoPath,
        settings: {
          video_model: videoProvider.modelId,
          duration: this.config.duration,
          aspect_ratio: this.config.aspectRatio,
          resolution: this.config.resolution,
        },
        content: {
          prompt,
          script,
          voice: this.config.voice,
          voice_provider: this.config.voiceProvider,
          theme: this.config.theme || DEFAULT_THEME,
        },
        costs,
        timings: {
          vision: this.timings.vision || 0,
          prompt: this.timings.prompt || 0,
          script: this.timings.script || 0,
          video: this.timings.video || 0,
          voiceover: this.timings.voiceover || 0,
          logo: this.timings.logo || 0,
          merge: this.timings.merge || 0,
          text_overlays: this.timings.text_overlays || 0,
          total: totalTime,
        },
        files: {
          original_video: originalVideoFilename,
          voiceover: voiceoverFilename,
          final_video: finalVideoFilename,
        },
        logo: this.config.logo ? {
          enabled: true,
          intro: this.config.enableLogoIntro || false,
          outro: this.config.enableLogoOutro || false,
          intro_duration: this.config.introDuration || 0,
          outro_duration: this.config.outroDuration || 0,
          error: logoError, // Will be set if logo processing failed
        } : undefined,
        text_overlays: this.config.textOverlays && this.config.textOverlays.length > 0 ? {
          enabled: true,
          count: this.config.textOverlays.length,
          overlays: this.config.textOverlays,
          error: textOverlayError, // Will be set if text overlay processing failed
        } : undefined,
      };

      await saveMetadata(outputFolder, metadata);

      // Stage 12: Complete
      this.updateState('complete');

      return {
        success: true,
        outputFolder,
        finalVideoPath,
        metadata,
      };
    } catch (error) {
      this.updateState('error');

      return {
        success: false,
        outputFolder,
        finalVideoPath,
        metadata: {} as GenerationMetadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

import Replicate from 'replicate';
import type { VideoProvider, VideoGenerationParams, ValidationResult } from '../types';

export class Veo3FastProvider implements VideoProvider {
  name = 'Google Veo 3 Fast';
  modelId = 'google/veo-3-fast';
  description = 'Premium quality, cinematic video generation with fast processing';
  tier: 'premium' = 'premium';

  capabilities = {
    textToVideo: true,
    imageToVideo: true,
    audio: true, // Ambient audio, not voiceover
    minDuration: 4,
    maxDuration: 8,
    supportedDurations: [4, 6, 8],
    aspectRatios: ['16:9', '9:16'], // Veo 3 only supports these two
    resolutions: ['720p', '1080p'],
  };

  pricing = {
    costPerSecond: 0.15, // with audio (we'll use without audio = 0.10)
    costPerVideo: (duration: number, resolution?: string) => {
      // Without audio: $0.10/sec, with audio: $0.15/sec
      // We generate without audio since we handle voiceover separately
      return duration * 0.10;
    },
  };

  private replicate?: Replicate;

  private getReplicate(): Replicate {
    if (!this.replicate) {
      this.replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN!,
      });
    }
    return this.replicate;
  }

  validateParams(params: VideoGenerationParams): ValidationResult {
    const errors: string[] = [];

    // Validate duration
    if (!this.capabilities.supportedDurations.includes(params.duration)) {
      errors.push(`Duration must be one of: ${this.capabilities.supportedDurations.join(', ')} seconds`);
    }

    // Validate aspect ratio
    if (!this.capabilities.aspectRatios.includes(params.aspectRatio)) {
      errors.push(`Aspect ratio must be one of: ${this.capabilities.aspectRatios.join(', ')}`);
    }

    // Validate resolution
    if (params.resolution && !this.capabilities.resolutions.includes(params.resolution)) {
      errors.push(`Resolution must be one of: ${this.capabilities.resolutions.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async generateVideo(params: VideoGenerationParams): Promise<string> {
    const validation = this.validateParams(params);
    if (!validation.valid) {
      throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
    }

    const input: Record<string, any> = {
      prompt: params.prompt,
      duration: params.duration,
      resolution: params.resolution || '1080p',
      generate_audio: false, // We handle voiceover separately
    };

    // Only set aspect_ratio if no image is provided
    // When image is provided, aspect ratio is derived from the image
    if (!params.image && params.aspectRatio) {
      input.aspect_ratio = params.aspectRatio;
    }

    // Add image if provided (for image-to-video)
    if (params.image) {
      input.image = params.image;
    }

    // Add seed if provided
    if (params.seed !== undefined) {
      input.seed = params.seed;
    }

    const output = await this.getReplicate().run(this.modelId, { input });

    if (typeof output === 'string') {
      return output;
    }

    throw new Error('Unexpected output format from Veo 3 Fast');
  }

  estimateGenerationTime(duration: number): number {
    // Veo 3 Fast typically takes 60-120 seconds
    return 90; // Average 90 seconds
  }
}

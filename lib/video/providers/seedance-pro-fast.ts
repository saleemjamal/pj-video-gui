import Replicate from 'replicate';
import type { VideoProvider, VideoGenerationParams, ValidationResult } from '../types';

export class SeedanceProFastProvider implements VideoProvider {
  name = 'Seedance 1 Pro Fast';
  modelId = 'bytedance/seedance-1-pro-fast';
  description = 'Ultra budget-friendly with fast generation times';
  tier: 'ultra-budget' = 'ultra-budget';

  capabilities = {
    textToVideo: true,
    imageToVideo: true,
    audio: false,
    minDuration: 2,
    maxDuration: 12,
    supportedDurations: [2, 4, 6, 8, 10, 12], // Supports 2-12 seconds
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['480p', '720p', '1080p'],
  };

  pricing = {
    costPerSecond: (resolution: string) => {
      const costs: Record<string, number> = {
        '480p': 0.015,
        '720p': 0.025,
        '1080p': 0.06,
      };
      return costs[resolution] || costs['720p'];
    },
    costPerVideo: (duration: number, resolution: string = '720p') => {
      const costs: Record<string, number> = {
        '480p': 0.015,
        '720p': 0.025,
        '1080p': 0.06,
      };
      return duration * (costs[resolution] || costs['720p']);
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
    if (params.duration < this.capabilities.minDuration || params.duration > this.capabilities.maxDuration) {
      errors.push(`Duration must be between ${this.capabilities.minDuration} and ${this.capabilities.maxDuration} seconds`);
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
      resolution: params.resolution || '720p',
    };

    // Only set aspect_ratio if no image is provided
    // Seedance ignores aspect_ratio when an image is used
    if (!params.image && params.aspectRatio) {
      input.aspect_ratio = params.aspectRatio;
    }

    // Add image if provided (for image-to-video)
    if (params.image) {
      input.image = params.image;
    }

    const output = await this.getReplicate().run(this.modelId, { input });

    if (typeof output === 'string') {
      return output;
    }

    throw new Error('Unexpected output format from Seedance Pro Fast');
  }

  estimateGenerationTime(duration: number): number {
    // Seedance Pro Fast typically takes 40-80 seconds
    return 60; // Average 60 seconds
  }
}

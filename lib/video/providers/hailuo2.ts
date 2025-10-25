import Replicate from 'replicate';
import type { VideoProvider, VideoGenerationParams, ValidationResult } from '../types';

export class Hailuo2Provider implements VideoProvider {
  name = 'Hailuo 2';
  modelId = 'minimax/hailuo-02';
  description = 'Budget-friendly video generation with realistic physics';
  tier: 'budget' = 'budget';

  capabilities = {
    textToVideo: true,
    imageToVideo: true,
    audio: false,
    minDuration: 6,
    maxDuration: 10,
    supportedDurations: [6, 10],
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['512p', '768p', '1080p'],
  };

  pricing = {
    costPerSecond: (resolution: string) => {
      const costs: Record<string, number> = {
        '512p': 0.025,
        '768p': 0.045,
        '1080p': 0.08,
      };
      return costs[resolution] || costs['768p'];
    },
    costPerVideo: (duration: number, resolution: string = '768p') => {
      const costs: Record<string, number> = {
        '512p': 0.025,
        '768p': 0.045,
        '1080p': 0.08,
      };
      return duration * (costs[resolution] || costs['768p']);
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

    // Note: 10s only available for 512p and 768p (NOT 1080p)
    if (params.duration === 10 && params.resolution && params.resolution === '1080p') {
      errors.push('10-second videos are only available at 512p and 768p resolutions (1080p not supported for 10s)');
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
      resolution: params.resolution || '768p',
    };

    // Add image if provided (for image-to-video)
    // Hailuo 2 uses 'first_frame_image' parameter, not 'image'
    if (params.image) {
      input.first_frame_image = params.image;
    }

    const output = await this.getReplicate().run(this.modelId, { input });

    if (typeof output === 'string') {
      return output;
    }

    throw new Error('Unexpected output format from Hailuo 2');
  }

  estimateGenerationTime(duration: number): number {
    // Hailuo 2 typically takes 60-90 seconds
    return 75; // Average 75 seconds
  }
}

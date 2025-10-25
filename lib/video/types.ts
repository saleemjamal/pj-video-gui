// Video Provider Abstraction Types

export interface VideoGenerationParams {
  prompt: string;
  duration: number;
  aspectRatio: string;
  resolution?: string;
  image?: string; // base64 or URL
  generateAudio?: boolean;
  seed?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface VideoProviderCapabilities {
  textToVideo: boolean;
  imageToVideo: boolean;
  audio: boolean;
  minDuration: number;
  maxDuration: number;
  supportedDurations: number[];
  aspectRatios: string[];
  resolutions: string[];
}

export interface VideoProviderPricing {
  costPerSecond: number | ((resolution: string) => number);
  costPerVideo: (duration: number, resolution?: string) => number;
}

export interface VideoProvider {
  name: string;
  modelId: string;
  description: string;
  tier: 'premium' | 'budget' | 'ultra-budget';

  capabilities: VideoProviderCapabilities;
  pricing: VideoProviderPricing;

  generateVideo(params: VideoGenerationParams): Promise<string>;
  validateParams(params: VideoGenerationParams): ValidationResult;
  estimateGenerationTime(duration: number): number; // in seconds
}

export type VideoProviderType = 'veo3-fast' | 'veo3' | 'hailuo2' | 'seedance-pro-fast' | 'kling-v2.5-turbo';

import type { VideoProviderType } from '../video/types';
import { getVideoProvider } from '../video/factory';

export interface CostBreakdown {
  visionAnalysis: number;
  promptGeneration: number;
  scriptGeneration: number;
  videoGeneration: number;
  voiceover: number;
  total: number;
}

export function calculateCosts(
  videoProviderType: VideoProviderType,
  duration: number,
  resolution: string,
  scriptLength: number
): CostBreakdown {
  // OpenAI Vision analysis
  const visionAnalysis = 0.02;

  // Prompt generation (GPT-4o)
  const promptGeneration = 0.005;

  // Script generation (GPT-4o)
  const scriptGeneration = 0.005;

  // Video generation
  const videoProvider = getVideoProvider(videoProviderType);
  const videoGeneration = videoProvider.pricing.costPerVideo(duration, resolution);

  // Voiceover (OpenAI TTS)
  const voiceover = (scriptLength / 1000) * 0.015;

  const total = visionAnalysis + promptGeneration + scriptGeneration + videoGeneration + voiceover;

  return {
    visionAnalysis,
    promptGeneration,
    scriptGeneration,
    videoGeneration,
    voiceover,
    total,
  };
}

// Convert USD to INR (approximate)
export function usdToInr(usd: number): number {
  const rate = 85; // Approximate rate
  return usd * rate;
}

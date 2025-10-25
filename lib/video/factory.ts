import type { VideoProvider, VideoProviderType } from './types';
import { Veo3FastProvider } from './providers/veo3-fast';
import { Hailuo2Provider } from './providers/hailuo2';
import { SeedanceProFastProvider } from './providers/seedance-pro-fast';

// Provider factory
export function getVideoProvider(type: VideoProviderType): VideoProvider {
  switch (type) {
    case 'veo3-fast':
      return new Veo3FastProvider();
    case 'hailuo2':
      return new Hailuo2Provider();
    case 'seedance-pro-fast':
      return new SeedanceProFastProvider();
    default:
      return new Veo3FastProvider(); // Default to Veo 3 Fast
  }
}

// Get all available providers
export function getAllVideoProviders(): VideoProvider[] {
  return [
    new Veo3FastProvider(),
    new Hailuo2Provider(),
    new SeedanceProFastProvider(),
  ];
}

// Get provider info for UI display
export function getProviderInfo(type: VideoProviderType) {
  const provider = getVideoProvider(type);
  return {
    name: provider.name,
    modelId: provider.modelId,
    description: provider.description,
    tier: provider.tier,
    capabilities: provider.capabilities,
    costPerSecond: typeof provider.pricing.costPerSecond === 'function'
      ? 'Variable by resolution'
      : `$${provider.pricing.costPerSecond}/sec`,
    estimatedTime: `~${provider.estimateGenerationTime(6)}s`,
  };
}

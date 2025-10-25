import type { VoiceoverProvider, VoiceoverProviderType } from './types';
import { OpenAITTSProvider } from './providers/openai-tts';
import { ElevenLabsProvider } from './providers/elevenlabs';

// Provider factory
export function getVoiceoverProvider(type: VoiceoverProviderType): VoiceoverProvider {
  switch (type) {
    case 'openai':
      return new OpenAITTSProvider();
    case 'elevenlabs':
      return new ElevenLabsProvider();
    default:
      return new OpenAITTSProvider(); // Default to OpenAI
  }
}

// Get all available providers
export function getAllVoiceoverProviders(): VoiceoverProvider[] {
  return [
    new OpenAITTSProvider(),
    new ElevenLabsProvider(),
  ];
}

// Get default provider
export function getDefaultVoiceoverProvider(): VoiceoverProvider {
  const defaultType = (process.env.DEFAULT_VOICE_PROVIDER || 'openai') as VoiceoverProviderType;
  return getVoiceoverProvider(defaultType);
}

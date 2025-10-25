// Voiceover Provider Abstraction Types

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  description: string;
}

export interface VoiceoverProvider {
  name: string;
  providerType: 'openai' | 'elevenlabs';

  generateVoiceover(text: string, voice: string): Promise<Buffer>;
  getAvailableVoices(): Voice[];
  getCost(text: string): number;
  validateVoice(voice: string): boolean;
}

export type VoiceoverProviderType = 'openai' | 'elevenlabs';

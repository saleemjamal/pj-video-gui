import type { VoiceoverProvider, Voice } from '../types';

// Placeholder for ElevenLabs provider (Phase 2)
export class ElevenLabsProvider implements VoiceoverProvider {
  name = 'ElevenLabs';
  providerType: 'elevenlabs' = 'elevenlabs';

  getAvailableVoices(): Voice[] {
    // TODO: Fetch from ElevenLabs API
    return [];
  }

  validateVoice(voice: string): boolean {
    // TODO: Implement validation
    return false;
  }

  async generateVoiceover(text: string, voice: string): Promise<Buffer> {
    // TODO: Implement ElevenLabs TTS generation
    throw new Error('ElevenLabs provider not yet implemented (Phase 2)');
  }

  getCost(text: string): number {
    // ElevenLabs pricing: ~$0.30 per 1,000 characters
    const charactersLength = text.length;
    return (charactersLength / 1000) * 0.30;
  }
}

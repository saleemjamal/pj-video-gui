import type { VoiceoverProvider, Voice } from '../types';

// ElevenLabs TTS Provider
export class ElevenLabsProvider implements VoiceoverProvider {
  name = 'ElevenLabs';
  providerType: 'elevenlabs' = 'elevenlabs';
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  // Pre-configured voice IDs for Indian English and quality voices
  private voiceIds: Record<string, string> = {
    // Indian English voices
    'preethi': 'flq6f7yk4E4fJM5XTYuZ', // Indian female voice
    'prabhat': 'IKne3meq5aSn9XLyUdCD', // Indian male voice

    // High-quality multilingual voices that work well for Indian English
    'adam': '21m00Tcm4TlvDq8ikWAM', // Deep, clear male
    'bella': 'EXAVITQu4vr4xnSDxMaL', // Soft, clear female
    'rachel': 'nPczCjzI2devNBz1zQrb', // Warm female voice
    'antoni': 'ErXwobaYiN019PkySvjV', // Male, articulate
  };

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('ELEVENLABS_API_KEY not found in environment variables');
    }
  }

  getAvailableVoices(): Voice[] {
    return [
      { id: 'preethi', name: 'Preethi', gender: 'Female', description: 'Indian English - Warm, professional' },
      { id: 'prabhat', name: 'Prabhat', gender: 'Male', description: 'Indian English - Clear, authoritative' },
      { id: 'bella', name: 'Bella', gender: 'Female', description: 'International - Soft, friendly' },
      { id: 'rachel', name: 'Rachel', gender: 'Female', description: 'International - Warm, engaging' },
      { id: 'adam', name: 'Adam', gender: 'Male', description: 'International - Deep, professional' },
      { id: 'antoni', name: 'Antoni', gender: 'Male', description: 'International - Clear, articulate' },
    ];
  }

  validateVoice(voice: string): boolean {
    return voice in this.voiceIds;
  }

  async generateVoiceover(text: string, voice: string): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const voiceId = this.voiceIds[voice];
    if (!voiceId) {
      throw new Error(`Invalid voice: ${voice}`);
    }

    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2', // Best quality model
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error generating ElevenLabs voiceover:', error);
      throw error;
    }
  }

  getCost(text: string): number {
    // ElevenLabs pricing: ~$0.30 per 1,000 characters
    const charactersLength = text.length;
    return (charactersLength / 1000) * 0.30;
  }
}

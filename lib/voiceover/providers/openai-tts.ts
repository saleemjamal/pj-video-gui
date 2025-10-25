import OpenAI from 'openai';
import type { VoiceoverProvider, Voice } from '../types';

export class OpenAITTSProvider implements VoiceoverProvider {
  name = 'OpenAI TTS';
  providerType: 'openai' = 'openai';

  private openai?: OpenAI;

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });
    }
    return this.openai;
  }

  // Available OpenAI TTS voices
  private voices: Voice[] = [
    {
      id: 'alloy',
      name: 'Alloy',
      gender: 'neutral',
      description: 'Balanced, versatile voice',
    },
    {
      id: 'echo',
      name: 'Echo',
      gender: 'male',
      description: 'Clear, professional tone',
    },
    {
      id: 'fable',
      name: 'Fable',
      gender: 'neutral',
      description: 'Expressive, storytelling quality',
    },
    {
      id: 'onyx',
      name: 'Onyx',
      gender: 'male',
      description: 'Deep, authoritative voice',
    },
    {
      id: 'nova',
      name: 'Nova',
      gender: 'female',
      description: 'Bright, energetic tone',
    },
    {
      id: 'shimmer',
      name: 'Shimmer',
      gender: 'female',
      description: 'Warm, friendly voice',
    },
  ];

  getAvailableVoices(): Voice[] {
    return this.voices;
  }

  validateVoice(voice: string): boolean {
    return this.voices.some((v) => v.id === voice);
  }

  async generateVoiceover(text: string, voice: string): Promise<Buffer> {
    if (!this.validateVoice(voice)) {
      throw new Error(`Invalid voice: ${voice}. Must be one of: ${this.voices.map(v => v.id).join(', ')}`);
    }

    const mp3 = await this.getOpenAI().audio.speech.create({
      model: 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer;
  }

  getCost(text: string): number {
    // OpenAI TTS pricing: $0.015 per 1,000 characters
    const charactersLength = text.length;
    return (charactersLength / 1000) * 0.015;
  }
}

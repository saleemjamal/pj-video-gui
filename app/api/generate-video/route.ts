import { NextRequest, NextResponse } from 'next/server';
import { VideoGenerationPipeline } from '@/lib/pipeline/VideoGenerationPipeline';
import type { VideoProviderType } from '@/lib/video/types';
import type { VoiceoverProviderType } from '@/lib/voiceover/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      image,
      videoProvider,
      duration,
      aspectRatio,
      resolution,
      prompt,
      script,
      voiceProvider,
      voice,
      // Logo parameters
      logo,
      enableLogoIntro,
      enableLogoOutro,
      introDuration,
      outroDuration,
    } = body;

    // Validation
    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Create pipeline
    const pipeline = new VideoGenerationPipeline({
      image,
      videoProvider: (videoProvider || 'veo3-fast') as VideoProviderType,
      duration: duration || 6,
      aspectRatio: aspectRatio || '9:16',
      resolution: resolution || '1080p',
      prompt,
      script,
      voiceProvider: (voiceProvider || 'openai') as VoiceoverProviderType,
      voice: voice || 'nova',
      // Logo parameters
      logo: logo || undefined,
      enableLogoIntro: enableLogoIntro || false,
      enableLogoOutro: enableLogoOutro || false,
      introDuration: introDuration || 0,
      outroDuration: outroDuration || 0,
    });

    // Execute pipeline
    const result = await pipeline.execute();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Video generation failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      outputFolder: result.outputFolder,
      finalVideoPath: result.finalVideoPath,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Error generating video:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Video generation failed' },
      { status: 500 }
    );
  }
}

// Increase timeout for video generation (10 minutes)
export const maxDuration = 600;

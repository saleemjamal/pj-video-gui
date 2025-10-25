import { NextRequest, NextResponse } from 'next/server';
import { generateScript } from '@/lib/clients/openai';
import type { VideoTheme } from '@/lib/themes/types';
import { DEFAULT_THEME } from '@/lib/themes/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productDescription, duration, theme } = body;

    if (!duration) {
      return NextResponse.json(
        { error: 'Duration is required' },
        { status: 400 }
      );
    }

    console.log('Generating script with:', { productDescription, duration, theme });

    const script = await generateScript(
      productDescription || 'Product from image',
      duration,
      (theme as VideoTheme) || DEFAULT_THEME
    );

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Error generating script:', error);
    return NextResponse.json(
      { error: 'Failed to generate script' },
      { status: 500 }
    );
  }
}

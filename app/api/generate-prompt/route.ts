import { NextRequest, NextResponse } from 'next/server';
import { generateVideoPrompt, identifyProduct } from '@/lib/clients/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, duration, aspectRatio, modelName, productDescription } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Identify what product the AI sees
    const detectedProduct = await identifyProduct(image);

    // Generate prompt (using productDescription if provided)
    const prompt = await generateVideoPrompt(
      image,
      duration || 6,
      aspectRatio || '9:16',
      modelName || 'Google Veo 3 Fast',
      productDescription
    );

    return NextResponse.json({
      prompt,
      detectedProduct
    });
  } catch (error) {
    console.error('Error generating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to generate prompt' },
      { status: 500 }
    );
  }
}

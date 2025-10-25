import { NextRequest, NextResponse } from 'next/server';
import { generateScript } from '@/lib/clients/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productDescription, duration } = body;

    if (!duration) {
      return NextResponse.json(
        { error: 'Duration is required' },
        { status: 400 }
      );
    }

    const script = await generateScript(
      productDescription || 'Product from image',
      duration
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

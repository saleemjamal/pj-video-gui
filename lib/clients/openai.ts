import OpenAI from 'openai';

// Lazy initialize OpenAI client
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openaiInstance;
}

// Analyze image with GPT-4o Vision
export async function analyzeImage(base64Image: string, promptTemplate: string) {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptTemplate },
          {
            type: 'image_url',
            image_url: {
              url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`
            }
          },
        ],
      },
    ],
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content || '';
}

// Identify what product is in the image
export async function identifyProduct(base64Image: string): Promise<string> {
  const identificationPrompt = `Identify the product in this image. Be specific and concise.

Output format: Just the product name/type (e.g., "Olive Oil Mister", "Copper Tea Kettle", "Stainless Steel Colander")

Focus on:
- Product category and type
- Material if visible
- Primary function

Output ONLY the product name, nothing else.`;

  return await analyzeImage(base64Image, identificationPrompt);
}

// Generate video prompt
export async function generateVideoPrompt(
  base64Image: string,
  duration: number,
  aspectRatio: string,
  modelName: string,
  productDescription?: string
): Promise<string> {
  const productContext = productDescription
    ? `Product: ${productDescription}`
    : 'Product: (identify from image)';

  const promptTemplate = `Analyze this product image and create a cinematic video prompt optimized for ${modelName}.

${productContext}
Brand: Poppat Jamals (Premium homeware retailer)
Video Duration: ${duration}s
Aspect Ratio: ${aspectRatio}
Video Model: ${modelName}

Requirements:
- Describe camera movements (slow pan, dolly, zoom, rotate)
- Specify lighting (warm, natural, cinematic)
- Include setting/environment (modern Indian kitchen, elegant dining)
- Consider aspect ratio framing
- Emphasize: premium, classy, excellent value, quality, curation
- Overall aesthetic: cinematic product commercial with 4K quality look
- Visual style: rich, modern, contemporary
- DO NOT include any text overlays or captions in the video
${productDescription ? '\n- Use the provided product description to create accurate, specific prompts' : ''}

Output ONLY the prompt text, no explanations.`;

  return await analyzeImage(base64Image, promptTemplate);
}

// Generate voiceover script
export async function generateScript(
  productDescription: string,
  duration: number
): Promise<string> {
  // Strict word limits based on TTS rate of 150 words/min (2.5 words/sec)
  // Limits are HARD MAXIMUMS to prevent audio cutoff
  const wordLimits: Record<number, string> = {
    2: '5 words maximum',
    4: '10 words maximum',
    6: '15 words maximum',
    8: '20 words maximum',
    10: '25 words maximum',
    12: '30 words maximum',
  };

  const scriptPromptTemplate = `Create a voiceover script for a ${duration}s product video.

Product: ${productDescription}
Brand: Poppat Jamals - Premium homeware retailer
Tone: Premium, warm, trustworthy
Keywords: quality, curation, value, classy, elegance

CRITICAL LENGTH REQUIREMENT: ${wordLimits[duration] || '15 words maximum'}
⚠️ IMPORTANT: If you exceed this word count, the audio will be CUT OFF mid-sentence. Stay UNDER the limit.

Style:
- Conversational yet elegant
- Focus on emotional benefit, quality, and product appeal
- Optional tagline format: "Poppat Jamals — [quality descriptor]"
- Avoid excessive focus on brand history or age
- Prioritize brevity - every word counts!

Output ONLY the script text for voiceover, no explanations.`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: scriptPromptTemplate,
      },
    ],
    max_tokens: 150,
  });

  return response.choices[0]?.message?.content || '';
}

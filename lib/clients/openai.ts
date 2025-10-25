import OpenAI from 'openai';
import type { VideoTheme } from '../themes/types';
import { getThemeConfig, DEFAULT_THEME } from '../themes/config';

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
  duration: number,
  theme: VideoTheme = DEFAULT_THEME
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

  // Get theme configuration
  const themeConfig = getThemeConfig(theme);

  // Theme-specific templates and instructions
  const themeTemplates: Record<VideoTheme, string> = {
    'new-product': `
TEMPLATE STRUCTURE (STRICT):
- Opening: Start with "New Product Alert!" OR "Just Launched!" OR "Introducing [Product]!"
- Middle: Brief product description (use abbreviations like "w/" for "with", "&" for "and")
- Closing: Call-to-action ending with "at Poppat Jamals!" OR "Shop Poppat Jamals!"

EXAMPLES:
- "New Product Alert! Premium stainless steel colander w/ ergonomic handles. Get yours at Poppat Jamals!"
- "Just Launched! Beautiful copper tea kettle for your kitchen. Shop now at Poppat Jamals!"
- "Introducing premium olive oil mister! Easy cooking & healthy living. Buy it at Poppat Jamals!"`,

    'promotional': `
TEMPLATE STRUCTURE (STRICT):
- Opening: Lead with discount/offer (e.g., "50% Off!", "Special Deal!", "Save Big!")
- Middle: Brief product mention
- Closing: Urgency + "at Poppat Jamals!" (e.g., "Limited time at Poppat Jamals!")

EXAMPLES:
- "50% Off! Premium cookware for your dream kitchen. Limited time at Poppat Jamals!"
- "Flash Sale! Beautiful homeware essentials. Don't miss out - Shop Poppat Jamals!"`,

    'informational': `
TEMPLATE STRUCTURE:
- Opening: Product feature or quality statement
- Middle: Key benefit or use case
- Closing: Brand tagline (optional)

EXAMPLES:
- "Handcrafted copper tea kettle. Perfect heat distribution for the perfect brew. Poppat Jamals - Quality Curated."
- "Premium stainless steel construction. Designed for durability & elegance in your home."`,

    'seasonal': `
TEMPLATE STRUCTURE:
- Opening: Seasonal reference (e.g., "This Holiday Season", "Perfect for [Season]")
- Middle: Product + occasion fit
- Closing: Gift/seasonal message + brand

EXAMPLES:
- "This Holiday Season, gift premium homeware from Poppat Jamals. Elegance they'll treasure."
- "Perfect for festive cooking! Limited edition copper cookware. Available now at Poppat Jamals!"`,
  };

  const themeSpecificInstructions = themeTemplates[theme] || '';

  const scriptPromptTemplate = `Create a voiceover script for a ${duration}s product video.

Product: ${productDescription}
Brand: Poppat Jamals - Premium homeware retailer

VIDEO THEME: ${themeConfig.name}
Theme Tone: ${themeConfig.scriptTone}
Theme Keywords: ${themeConfig.scriptKeywords.join(', ')}
Theme Style: ${themeConfig.scriptStyle}

${themeSpecificInstructions}

Base Tone: Premium, warm, trustworthy
Base Keywords: quality, curation, value, classy, elegance

CRITICAL LENGTH REQUIREMENT: ${wordLimits[duration] || '15 words maximum'}
⚠️ IMPORTANT: If you exceed this word count, the audio will be CUT OFF mid-sentence. Stay UNDER the limit.

Style Guidelines:
- Conversational yet elegant
- Blend the theme tone with the premium brand voice
- ${theme === 'new-product' ? 'MUST follow the template structure above with opening alert, abbreviations, and CTA ending' : 'Use theme keywords naturally when relevant'}
- Focus on emotional benefit, quality, and product appeal
- Prioritize brevity - every word counts!
- Make the theme clear but don't be heavy-handed
${theme === 'new-product' ? '- Use abbreviations to save words (w/ = with, & = and, etc.)' : ''}

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

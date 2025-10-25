# PJ Video Generator GUI - Developer Documentation

## Overview

This is a Next.js 14 web application that generates social media product videos using AI. It orchestrates multiple AI services (Google Veo 3, Hailuo 2, Seedance Pro, OpenAI GPT-4o Vision, OpenAI TTS) through a provider abstraction pattern to create polished videos with voiceovers from a single product image.

**Key Technologies:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Replicate API (video generation)
- OpenAI API (vision analysis, TTS)
- FFmpeg (video/audio processing)

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see Environment Variables section)
cp .env.example .env.local

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

**Default URL:** http://localhost:3000

## Environment Variables

Required environment variables in `.env.local`:

```bash
# Replicate API (for video generation)
REPLICATE_API_TOKEN=your_replicate_token

# OpenAI API (for vision analysis and TTS)
OPENAI_API_KEY=your_openai_key

# Optional: Custom output path
OUTPUT_PATH=/path/to/output
# Default: ~/Desktop/PJ-Social-Content

# Optional: Default voice provider
DEFAULT_VOICE_PROVIDER=openai
```

## Architecture

### High-Level Flow

1. **User uploads product image** → Base64 encoded in browser
2. **Image analysis** → OpenAI GPT-4o Vision identifies product
3. **Prompt generation** → AI creates video generation prompt
4. **Script generation** → AI creates voiceover script (strict word limits)
5. **Video generation** → Replicate API generates video (4-12s)
6. **Logo processing (optional)** → FFmpeg creates intro/outro clips
7. **Voiceover generation** → OpenAI TTS creates audio
8. **Audio/Video merge** → FFmpeg combines final output
9. **Save to disk** → Organized folder structure with metadata

### Provider Abstraction Pattern

The codebase uses a factory pattern to support multiple AI providers:

**Video Providers** (`lib/video/`):
- `VideoProvider` interface defines the contract
- `getVideoProvider(type)` factory creates instances
- Providers: Veo 3 Fast, Hailuo 2, Seedance Pro Fast
- Each has unique capabilities, constraints, and pricing

**Voiceover Providers** (`lib/voiceover/`):
- `VoiceoverProvider` interface defines the contract
- `getVoiceoverProvider(type)` factory creates instances
- Providers: OpenAI TTS (active), ElevenLabs (stub for Phase 2)

### Critical Implementation Details

#### 1. Lazy Initialization Pattern

**Problem:** API clients (OpenAI, Replicate) initialized in constructors would fail during Next.js build because environment variables aren't available.

**Solution:** All API clients use lazy initialization - created only when methods are called:

```typescript
// lib/clients/openai.ts
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openaiInstance;
}
```

Same pattern used in:
- `lib/video/providers/veo3-fast.ts:38-44`
- `lib/video/providers/hailuo2.ts:43-49`
- `lib/video/providers/seedance-pro-fast.ts:38-44`
- `lib/voiceover/providers/openai-tts.ts:20-26`

#### 2. Webpack Configuration for FFmpeg

**Problem:** Next.js tries to bundle native Node modules (`@ffmpeg-installer/ffmpeg`, `fluent-ffmpeg`) which breaks the build.

**Solution:** Externalize these packages in `next.config.js:13-22`:

```javascript
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals = config.externals || [];
    config.externals.push({
      '@ffmpeg-installer/ffmpeg': 'commonjs @ffmpeg-installer/ffmpeg',
      'fluent-ffmpeg': 'commonjs fluent-ffmpeg',
    });
  }
  config.module = {
    ...config.module,
    exprContextCritical: false,
  };
  return config;
}
```

**⚠️ CRITICAL:** If you get FFmpeg module errors, this is the first place to check.

#### 3. Dual FFmpeg Approach

**Why two different approaches?**

1. **Audio merging** (`lib/clients/ffmpeg.ts`) - Uses `fluent-ffmpeg` wrapper
   - Legacy code from CLI project
   - Stable and working
   - **DO NOT MODIFY** unless necessary

2. **Logo processing** (`lib/clients/ffmpeg-direct.ts`) - Uses direct `execFile`
   - New feature added later
   - Avoids deprecated fluent-ffmpeg wrapper
   - Uses `@ffmpeg-installer/ffmpeg` to get binary path
   - **PREFER THIS** for new FFmpeg features

**Important:** There is no separate `@ffprobe-installer` package. Use FFmpeg directly for metadata extraction (see `getVideoDimensions` in `lib/clients/ffmpeg-direct.ts:123-153`).

#### 4. Fail-Safe Pattern for Logo Processing

**Problem:** Logo processing happens AFTER expensive video generation. If it fails, we'd lose the generated video.

**Solution:** Fail-safe try-catch in `VideoGenerationPipeline.ts:155-229`:

```typescript
let videoForAudioMerge = originalVideoPath; // Default to original
let logoError: string | undefined;

if (this.config.logo && (this.config.enableLogoIntro || this.config.enableLogoOutro)) {
  try {
    // Logo processing...
    videoForAudioMerge = concatenatedPath; // Use concatenated if successful
  } catch (logoErr) {
    console.error('⚠️  Logo processing failed, continuing with original video:', logoErr);
    logoError = errorMsg;
    videoForAudioMerge = originalVideoPath; // Fall back to original
  }
}

// Audio merge continues regardless
await mergeVideoAudio({
  videoPath: videoForAudioMerge, // Either concatenated or original
  audioPath: voiceoverPath,
  outputPath: finalVideoPath,
});
```

**Result:** Logo failures are logged in metadata but don't break the pipeline.

## Video Provider Constraints

Each provider has specific technical constraints that must be enforced in the UI:

### Google Veo 3 Fast (`veo3-fast`)
- **Durations:** 4s, 6s, 8s
- **Resolutions:** 720p, 1080p
- **Aspect Ratios:** 16:9, 9:16 (ONLY these two)
- **Pricing:** $0.10/second (fixed)
- **Image Parameter:** `image` (standard)
- **Aspect Ratio Behavior:** When image provided, aspect ratio derived from image

### Hailuo 2 (`hailuo2`)
- **Durations:** 6s, 10s
- **Resolutions:** 512p, 768p, 1080p
- **CONSTRAINT:** 10s videos only available at 512p and 768p (NOT 1080p)
- **Aspect Ratios:** 16:9, 9:16, 1:1
- **Pricing:** Variable by resolution
- **Image Parameter:** `first_frame_image` (NOT `image`)
- **Aspect Ratio Behavior:** Don't send aspect_ratio when image provided

### Seedance Pro Fast (`seedance-pro-fast`)
- **Durations:** 2s, 4s, 6s, 8s, 10s, 12s (widest range)
- **Resolutions:** 720p, 1080p
- **Aspect Ratios:** 16:9, 9:16, 1:1
- **Pricing:** Variable by resolution
- **Image Parameter:** `image` (standard)

**Implementation:** See `app/page.tsx:44-94` for UI constraint enforcement and `lib/video/providers/` for validation logic.

## Audio Cutoff Prevention

**Problem:** TTS can generate audio longer than video duration, causing cutoff.

**Solution:** Strict word limits based on 150 words/min (2.5 words/sec) in `lib/clients/openai.ts:97-104`:

```typescript
const wordLimits: Record<number, string> = {
  2: '5 words maximum',
  4: '10 words maximum',
  6: '15 words maximum',
  8: '20 words maximum',
  10: '25 words maximum',
  12: '30 words maximum',
};
```

The AI prompt includes a CRITICAL warning about cutoff (line 114).

**⚠️ IMPORTANT:** These limits are intentionally conservative. DO NOT increase without testing.

## Product Identification

**Challenge:** AI vision may misidentify products (e.g., oil mister → spray bottle).

**Solution:** Two-step identification in `app/page.tsx:244-271`:

1. **Auto-detect:** `identifyProduct(image)` uses GPT-4o Vision
2. **Display detection:** Shows "AI detected: [product]" under image
3. **Manual override:** User can provide product description in text field
4. **Priority:** Manual description overrides AI detection

Both are passed to prompt/script generation for context.

## File Organization

```
lib/
├── clients/           # External API clients
│   ├── ffmpeg.ts           # Audio merge (fluent-ffmpeg)
│   ├── ffmpeg-direct.ts    # Logo processing (direct exec)
│   └── openai.ts           # Vision analysis, script generation
├── pipeline/          # Orchestration
│   ├── VideoGenerationPipeline.ts  # Main orchestrator
│   └── state-machine.ts            # State definitions
├── storage/           # File management
│   ├── files.ts            # Save/download utilities
│   ├── metadata.ts         # JSON metadata generation
│   └── types.ts
├── video/             # Video provider abstraction
│   ├── factory.ts          # Provider factory
│   ├── types.ts            # Interface definitions
│   └── providers/
│       ├── veo3-fast.ts
│       ├── hailuo2.ts
│       └── seedance-pro-fast.ts
└── voiceover/         # Voiceover provider abstraction
    ├── factory.ts          # Provider factory
    ├── types.ts            # Interface definitions
    └── providers/
        ├── openai-tts.ts
        └── elevenlabs.ts   # Stub for Phase 2

app/
├── page.tsx           # Main UI component
├── api/
│   ├── generate-video/
│   │   └── route.ts        # Video generation endpoint
│   ├── generate-prompt/
│   │   └── route.ts        # Prompt generation endpoint
│   └── generate-script/
│       └── route.ts        # Script generation endpoint
└── layout.tsx
```

## Output Structure

Videos are saved to `~/Desktop/PJ-Social-Content/` by default (configurable via `OUTPUT_PATH`):

```
PJ-Social-Content/
└── 2025-01-15/                    # Date folder
    └── generation_2025-01-15_14-30-25/  # Unique generation folder
        ├── source_image.jpg
        ├── logo_1737123456789.png (if provided)
        ├── video_original_1737123456789.mp4
        ├── logo_intro_1737123456789.mp4 (if enabled)
        ├── logo_outro_1737123456789.mp4 (if enabled)
        ├── video_with_logo_1737123456789.mp4 (if logo used)
        ├── voiceover_1737123456789.mp3
        ├── video_final_1737123456789.mp4
        └── metadata.json
```

**Metadata JSON includes:**
- Settings (model, duration, aspect ratio, resolution)
- Content (prompt, script, voice)
- Costs (itemized and total)
- Timings (each stage + total)
- Files (all generated filenames)
- Logo config (if used, including any errors)

## Cost Optimization

**Approximate costs per video:**
- Vision analysis: $0.02
- Prompt generation: $0.005
- Script generation: $0.005
- Video generation: $0.40 - $1.20 (depends on model/duration/resolution)
- Voiceover: $0.015 - $0.030 (depends on script length)

**Total per video: ~$0.44 - $1.26**

**Optimization tips:**
1. **Reuse prompts/scripts:** Provide them manually to skip AI generation
2. **Shorter durations:** 4s videos cost less than 10s
3. **Lower resolutions:** 720p cheaper than 1080p
4. **Batch processing:** Use consistent settings across multiple products

## Common Pitfalls

### 1. FFmpeg Module Not Found

**Error:** `Cannot find module '@ffmpeg-installer/ffmpeg'`

**Causes:**
- Webpack not externalizing the package
- Missing from node_modules

**Fix:**
1. Check `next.config.js` externals configuration
2. Run `npm install` to ensure packages present
3. Restart dev server

### 2. 500 Error on Page Load

**Error:** API routes fail with "Configuration error"

**Cause:** API clients initializing before environment variables loaded

**Fix:**
- Ensure all providers use lazy initialization pattern
- Check that `.env.local` exists with valid keys
- Restart dev server after env changes

### 3. Invalid Parameter Combinations

**Error:** `Invalid parameters: 10-second videos are only available at 768p resolution`

**Cause:** UI allowed selecting incompatible duration/resolution

**Fix:**
- UI has dynamic filtering in `app/page.tsx:181-190`
- Check `getValidResolutions()` function
- Verify provider constraints in `lib/video/providers/`

### 4. Wrong Image Used in Video

**Cause:** Using wrong parameter name for image-to-video

**Fix:**
- Veo 3 / Seedance: use `image` parameter
- Hailuo 2: use `first_frame_image` parameter
- Don't send `aspect_ratio` when image provided (derived from image)

### 5. Audio Cutoff

**Cause:** TTS generating audio longer than video

**Fix:**
- Word limits already enforced in `lib/clients/openai.ts:97-104`
- DO NOT increase limits without testing
- Consider using longer video duration if script requires it

### 6. Logo Processing Fails Entire Pipeline

**This should NOT happen** due to fail-safe pattern. If it does:
- Check try-catch in `VideoGenerationPipeline.ts:155-229`
- Verify `videoForAudioMerge` fallback logic
- Check that original video is still downloaded before logo processing

## Brand Voice Guidelines

**Brand:** Poppat Jamals - Premium homeware retailer

**Tone:** Premium, warm, trustworthy

**Keywords to emphasize:**
- Quality
- Curation
- Value
- Classy
- Elegance
- Premium

**Keywords to AVOID:**
- Heritage / 120 years (don't overemphasize)
- Craftsmanship (we're a retailer, not a manufacturer)
- Cheap / budget

**Visual style prompts:**
- Rich, modern, contemporary
- 4K quality
- Cinematic product commercial
- Warm, natural lighting
- Modern Indian kitchen / elegant dining settings

## Development Tips

1. **Test with real images:** Vision AI can misidentify products
2. **Monitor costs:** Each generation costs real money
3. **Use product descriptions:** Override AI when it misidentifies
4. **Check metadata.json:** Contains detailed timing and cost breakdown
5. **Logo is optional:** Skip it during development to speed up testing
6. **Port conflicts:** Multiple dev servers may be running (3000, 3001, 3002) - kill zombie processes if needed

## Future Enhancements (Phase 2)

- ElevenLabs voiceover provider integration (stub exists at `lib/voiceover/providers/elevenlabs.ts`)
- Additional video models as they become available on Replicate
- Batch processing UI for multiple products
- Video preview before final generation
- Custom brand voice fine-tuning

## Debugging

**Enable detailed logging:**
- FFmpeg operations log to console by default
- Pipeline stages update via `onStateChange` callback
- Check browser Network tab for API calls
- Server logs show provider initialization and errors

**Common debug locations:**
- `VideoGenerationPipeline.ts:160-217` - Logo processing
- `lib/clients/ffmpeg-direct.ts:58-66` - FFmpeg execution
- `lib/video/providers/*.ts` - Provider-specific logic
- `app/api/generate-video/route.ts:54-62` - API error handling

## Support

For issues or questions:
1. Check this CLAUDE.md first
2. Review `REQUIREMENTS.md` for detailed specifications
3. Check console logs for error messages
4. Verify environment variables are set correctly
5. Ensure all dependencies are installed (`npm install`)

---

**Last Updated:** January 2025
**Version:** 1.0
**License:** Proprietary - Poppat Jamals

# PJ Video Generator GUI - Requirements Documentation

## Project Overview
A Next.js web application for generating social media videos using multiple AI video generation models (Google Veo 3, Hailuo 2, Seedance) via Replicate API, with OpenAI-powered prompt generation, script generation, and flexible voiceover providers (OpenAI TTS, ElevenLabs). Built for Poppat Jamals heritage homeware business.

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **APIs**:
  - OpenAI API (GPT-4o for image analysis and prompt/script generation, TTS for voiceover)
  - Replicate API (Multiple video generation models with provider abstraction)
  - ElevenLabs API (Optional - voiceover alternative)
- **Media Processing**: FFmpeg (audio + video merging)
- **File System**: Node.js fs for local file operations

---

## Architecture Overview

### Provider Abstraction Pattern

The application uses a **provider abstraction pattern** for both video generation and voiceover synthesis, allowing easy switching between different AI models and services.

#### Video Provider Abstraction
```typescript
interface VideoProvider {
  name: string;
  modelId: string;
  capabilities: {
    textToVideo: boolean;
    imageToVideo: boolean;
    audio: boolean;
    minDuration: number;
    maxDuration: number;
    aspectRatios: string[];
    resolutions: string[];
  };
  pricing: {
    costPerSecond: number;
    costPerVideo: (duration: number, resolution?: string) => number;
  };
  generateVideo(params: VideoGenerationParams): Promise<string>;
}
```

#### Voiceover Provider Abstraction
```typescript
interface VoiceoverProvider {
  name: string;
  generateVoiceover(text: string, voice: string): Promise<Buffer>;
  getAvailableVoices(): Voice[];
  getCost(text: string): number;
}
```

**Benefits:**
- ✅ Swap providers without changing core logic
- ✅ A/B test different models
- ✅ Cost optimization (choose cheaper models for testing)
- ✅ Failover if provider is down
- ✅ Future-proof (add new providers easily)

---

## Supported Video Generation Models

### Model Comparison

| Model | Text-to-Video | Image-to-Video | Duration | Resolution | Cost (6s) | Best For |
|-------|---------------|----------------|----------|------------|-----------|----------|
| **Google Veo 3 Fast** (Default) | ✅ | ✅ | 4-8s | 720p/1080p | **$0.60-0.90** | Best quality |
| **Hailuo 2** | ✅ | ✅ | 6-10s | 512p-1080p | **$0.27-0.48** | Budget-friendly |
| **Seedance 1 Pro Fast** | ✅ | ✅ | 2-10s | 480p-1080p | **$0.09-0.36** | Ultra budget |

### Detailed Model Specifications

#### 1. Google Veo 3 Fast (Default)
- **Model ID**: `google/veo-3-fast`
- **Pricing**: $0.10/sec (without audio), $0.15/sec (with audio)
- **Durations**: 4s, 6s, 8s
- **Resolutions**: 720p, 1080p
- **Aspect Ratios**: 16:9, 9:16, 1:1, 4:3, 3:4, 21:9, 9:21
- **Audio**: Ambient audio generation (NOT voiceover)
- **Quality**: Premium, cinematic
- **Generation Time**: 60-120 seconds

#### 2. Hailuo 2
- **Model ID**: `minimax/hailuo-02`
- **Pricing**:
  - 512p: $0.025/sec
  - 768p: $0.045/sec
  - 1080p: $0.08/sec
- **Durations**: 6s, 10s
- **Resolutions**: 512p, 768p, 1080p
- **Aspect Ratios**: 16:9, 9:16, 1:1
- **Audio**: No
- **Quality**: Good, realistic physics
- **Generation Time**: 60-90 seconds

#### 3. Seedance 1 Pro Fast
- **Model ID**: `bytedance/seedance-1-pro-fast`
- **Pricing**:
  - 480p: $0.015/sec
  - 720p: $0.025/sec
  - 1080p: $0.06/sec
- **Durations**: 2-10s
- **Resolutions**: 480p, 720p, 1080p
- **Aspect Ratios**: 16:9, 9:16, 1:1
- **Audio**: No
- **Quality**: Good, fast generation
- **Generation Time**: 40-80 seconds

---

## Supported Voiceover Providers

### 1. OpenAI TTS (Default - Phase 1)
- **Model**: tts-1
- **Voices**:
  - **Female**: Nova (bright), Shimmer (warm)
  - **Male**: Onyx (deep), Echo (clear)
  - **Neutral**: Alloy (balanced), Fable (expressive)
- **Pricing**: ~$0.015 per request (fixed)
- **Quality**: Excellent, natural
- **Language**: English (primary), multi-language support

### 2. ElevenLabs (Future - Phase 2)
- **Model**: eleven_multilingual_v2
- **Voices**: 100+ professional voices
- **Pricing**: Variable by plan ($0.30/1000 characters)
- **Quality**: Premium, highly realistic
- **Language**: 29+ languages
- **Cloning**: Custom voice cloning available

---

## Core Features

### 1. Image Upload
**Requirements:**
- Single image upload interface
- Image preview after upload
- Supported formats: JPG, PNG, WebP
- Store image temporarily for OpenAI Vision analysis
- Display image dimensions and file size

**UI Components:**
- File input with drag-and-drop zone
- Image preview card
- Clear/remove image button

---

### 2. Video Configuration

#### 2.1 Video Model Selection
**Requirements:**
- Dropdown selector for video generation model
- Display model capabilities:
  - Quality tier (Premium/Budget/Ultra Budget)
  - Supported durations
  - Supported resolutions
  - Cost per second
  - Generation time estimate
- Default: Google Veo 3 Fast
- Real-time cost calculation based on selection

**UI Example:**
```
Video Model: [Google Veo 3 Fast ▾]
Quality: Premium | Cost: $0.15/sec | Time: ~90s
✅ Image-to-video | ✅ Up to 1080p
```

#### 2.2 Duration Selection
**Requirements:**
- Radio buttons or segmented control for duration
- Options dynamically adjust based on selected model:
  - **Veo 3 Fast**: 4s, 6s, 8s
  - **Hailuo 2**: 6s, 10s
  - **Seedance Pro Fast**: 4s, 6s, 8s, 10s
- Default: 6s
- Display estimated cost per duration (model-dependent)

#### 2.3 Resolution Selection
**Requirements:**
- Dropdown for resolution selection
- Options dynamically adjust based on selected model:
  - **Veo 3 Fast**: 720p, 1080p
  - **Hailuo 2**: 512p, 768p, 1080p
  - **Seedance Pro Fast**: 480p, 720p, 1080p
- Default: 1080p
- Show cost impact of resolution change

#### 2.4 Aspect Ratio Selection
**Requirements:**
- Dropdown or segmented control for aspect ratio
- Options with platform labels:
  - **9:16** (Instagram Reels, YouTube Shorts) - Default
  - **16:9** (YouTube, Landscape)
  - **1:1** (Instagram Feed, Facebook)
  - **4:3** (Traditional)
  - **3:4** (Portrait)
  - **21:9** (Cinematic Wide)
  - **9:21** (Ultra Portrait)
- Display platform use case for each ratio
- Default: 9:16
- Some models may have limited aspect ratio support

---

### 3. AI-Generated Content

#### 3.1 Video Prompt Generation
**Requirements:**
- OpenAI GPT-4o with Vision analyzes uploaded image
- Generates model-optimized video prompt
- Incorporates brand keywords: classy, excellent value, premium, heritage, quality
- Style descriptors: rich, modern, contemporary, 4K, cinematic
- Editable textarea (3-4 rows)
- "Regenerate Prompt" button
- Shows loading state during generation

**Prompt Structure:**
```
[Product description], [setting/environment], [camera movement],
[lighting details], [brand aesthetic], cinematic, 4K quality
```

**Example API Call:**
```javascript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: promptTemplate },
        { type: "image_url", image_url: { url: base64Image } }
      ]
    }
  ]
});
```

#### 3.2 Script Generation
**Requirements:**
- OpenAI GPT-4o generates voiceover script based on image and video duration
- Script length varies by duration:
  - 4s: ~10-12 words (optional)
  - 6s: ~15-20 words
  - 8s: ~25-30 words
  - 10s: ~35-40 words
- Incorporates Poppat Jamals brand voice
- Editable textarea (2-3 rows)
- "Regenerate Script" button
- Independent regeneration from prompt

**Script Guidelines:**
- Emphasize heritage (120+ years), quality, value
- Conversational yet premium tone
- End with brand tagline option: "Poppat Jamals — [quality descriptor]"

---

### 4. Voice Selection

**Requirements:**
- Dropdown for voiceover provider selection (Phase 2)
- Dropdown for voice selection within provider
- **OpenAI TTS Voices** (Phase 1):
  - **Female**: Nova (bright), Shimmer (warm)
  - **Male**: Onyx (deep), Echo (clear)
  - **Neutral**: Alloy (balanced), Fable (expressive)
- **ElevenLabs Voices** (Phase 2): Dynamic list from API
- Default: Nova (OpenAI)
- Display gender/tone labels
- Voice preview sample (optional future enhancement)

---

### 5. Video Generation Workflow

**Complete Pipeline:**

```
1. Image Upload
   ↓
2. OpenAI Vision Analysis → Generate Prompt (3-5s)
   ↓
3. OpenAI GPT-4o → Generate Script (2-3s)
   ↓
4. User Reviews/Edits Prompt & Script
   ↓
5. Video Generation (Selected Model) (60-120s)
   ↓
6. OpenAI TTS → Generate Voiceover (2-3s)
   ↓
7. FFmpeg → Merge Video + Voiceover (3-5s)
   ↓
8. Save Files (Video + Metadata + Audio)
```

**Step-by-step Process:**

#### Stage 1: User Input Validation
- Image uploaded ✓
- Video model selected ✓
- Duration selected ✓
- Resolution selected ✓
- Aspect ratio selected ✓
- Prompt generated/edited ✓
- Script generated/edited ✓
- Voice selected ✓

#### Stage 2: Generate Video Button
- Disabled until all inputs valid
- Shows loading spinner and progress
- Displays current stage with state machine:
  - `idle` → Ready to generate
  - `analyzing_image` → Analyzing image with AI...
  - `generating_prompt` → Creating video prompt...
  - `generating_script` → Writing voiceover script...
  - `generating_video` → Generating video (1-2 min)...
  - `generating_voiceover` → Creating voiceover audio...
  - `merging_audio` → Merging video with voiceover...
  - `saving_files` → Saving files...
  - `complete` → Complete!
  - `error` → Error occurred

#### Stage 3: Video Generation API Call
```javascript
// Step 1: Generate video (no built-in voiceover)
const videoUrl = await replicate.run(selectedModel.modelId, {
  input: {
    prompt: generatedPrompt,
    duration: selectedDuration,
    aspect_ratio: selectedAspectRatio,
    resolution: selectedResolution,
    image: base64Image, // Optional for image-to-video
    generate_audio: false, // We handle audio separately
  }
});
```

#### Stage 4: Voiceover Generation
```javascript
// Step 2: Generate voiceover with OpenAI TTS
const mp3 = await openai.audio.speech.create({
  model: "tts-1",
  voice: selectedVoice, // alloy, echo, fable, onyx, nova, shimmer
  input: scriptText,
});
```

#### Stage 5: Audio/Video Merge
```javascript
// Step 3: Merge video + voiceover with FFmpeg
await ffmpeg()
  .input(videoPath)
  .input(audioPath)
  .outputOptions([
    '-c:v copy',      // Copy video without re-encoding
    '-c:a aac',       // Encode audio as AAC
    '-map 0:v:0',     // Map video from first input
    '-map 1:a:0',     // Map audio from second input
    '-shortest'       // End when shortest stream ends
  ])
  .save(outputPath);
```

#### Stage 6: File Storage
Save to: `C:\Users\Saleem\Desktop\PJ-Social-Content\<YYYY-MM-DD>\<timestamp>\`

**Files Saved:**
1. `video_original_<timestamp>.mp4` - Video from Replicate (no voiceover)
2. `voiceover_<timestamp>.mp3` - Generated voiceover audio
3. `video_final_<timestamp>.mp4` - Final merged video with voiceover
4. `metadata_<timestamp>.json` - Complete generation metadata

**Metadata Structure:**
```json
{
  "timestamp": "2025-10-25T17:30:00Z",
  "video_path": "video_final_12345.mp4",
  "settings": {
    "video_model": "google/veo-3-fast",
    "duration": 6,
    "aspect_ratio": "9:16",
    "resolution": "1080p"
  },
  "content": {
    "prompt": "...",
    "script": "...",
    "voice": "nova",
    "voice_provider": "openai"
  },
  "costs": {
    "vision_analysis": 0.02,
    "prompt_generation": 0.005,
    "script_generation": 0.005,
    "video_generation": 0.90,
    "voiceover": 0.015,
    "total": 0.945
  },
  "timings": {
    "vision": 4.2,
    "prompt": 2.8,
    "script": 2.5,
    "video": 87.5,
    "voiceover": 2.1,
    "merge": 3.8,
    "total": 102.9
  },
  "files": {
    "original_video": "video_original_12345.mp4",
    "voiceover": "voiceover_12345.mp3",
    "final_video": "video_final_12345.mp4"
  }
}
```

---

## UI/UX Design

### Layout
```
┌─────────────────────────────────────┐
│  PJ Video Generator                 │
│  Poppat Jamals Heritage Homeware    │
├─────────────────────────────────────┤
│                                     │
│  [Image Upload Zone]                │
│  (Drag & drop or click)             │
│                                     │
├─────────────────────────────────────┤
│  Video Model:                       │
│  [Google Veo 3 Fast ▾]              │
│  Premium | $0.90/6s | ~90s          │
├─────────────────────────────────────┤
│  Duration: ○ 4s ● 6s ○ 8s           │
│  Resolution: [1080p ▾]              │
│  Aspect Ratio: [9:16 ▾]             │
│  Est. Cost: ~₹76 ($0.90)            │
├─────────────────────────────────────┤
│  Video Prompt:                      │
│  ┌───────────────────────────────┐  │
│  │ [AI-generated prompt...]      │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│  [🔄 Regenerate Prompt]             │
├─────────────────────────────────────┤
│  Voiceover Script:                  │
│  ┌───────────────────────────────┐  │
│  │ [AI-generated script...]      │  │
│  └───────────────────────────────┘  │
│  [🔄 Regenerate Script]             │
├─────────────────────────────────────┤
│  Voice: [Nova ▾]                    │
├─────────────────────────────────────┤
│  [Generate Video 🎬]                │
├─────────────────────────────────────┤
│  Status: ⏳ Generating video...     │
│  Progress: ████████░░░░ 65%         │
└─────────────────────────────────────┘
```

### Design Guidelines
- Clean, modern interface
- Heritage brand colors (if available)
- Generous whitespace
- Clear visual hierarchy
- Responsive design (desktop-focused)
- Loading states for all async operations
- Error states with helpful messages
- Real-time cost calculation
- Dynamic UI based on selected model capabilities

---

## API Integration

### OpenAI API

#### Vision Analysis + Prompt Generation
```javascript
const response = await openai.chat.completions.create({
  model: "gpt-4o", // Updated from gpt-4-vision-preview
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: promptTemplate },
        { type: "image_url", image_url: { url: base64Image } }
      ]
    }
  ]
});
```

**Prompt Template:**
```
Analyze this product image and create a cinematic video prompt optimized for [MODEL_NAME].

Brand: Poppat Jamals (120-year heritage homeware retailer)
Product Category: [Detected from image - cookware/crockery/glassware/kitchenware]
Video Duration: [4s/6s/8s/10s]
Aspect Ratio: [Selected ratio - 9:16/16:9/1:1/etc.]
Video Model: [Veo 3 Fast/Hailuo 2/Seedance Pro Fast]

Requirements:
- Describe camera movements (slow pan, dolly, zoom, rotate)
- Specify lighting (warm, natural, cinematic)
- Include setting/environment (modern Indian kitchen, elegant dining)
- Consider aspect ratio framing (vertical portrait, landscape, square)
- Emphasize: premium, classy, heritage, excellent value, quality
- Visual style: rich, modern, contemporary, 4K
- End with: "cinematic product commercial, 4K quality"

Output ONLY the prompt text, no explanations.
```

#### Script Generation
```javascript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: scriptPromptTemplate
    }
  ]
});
```

**Script Prompt Template:**
```
Create a voiceover script for a [duration]s product video.

Product: [From image analysis]
Brand: Poppat Jamals - 120-year heritage homeware retailer
Tone: Premium, warm, trustworthy
Keywords: heritage, quality, craftsmanship, value, classy

Length:
- 4 seconds: 10-12 words maximum
- 6 seconds: 15-20 words maximum
- 8 seconds: 25-30 words maximum
- 10 seconds: 35-40 words maximum

Style:
- Conversational yet elegant
- Focus on emotional benefit or heritage
- Optional tagline format: "Poppat Jamals — [quality descriptor]"

Output ONLY the script text for voiceover, no explanations.
```

#### TTS Generation
```javascript
const mp3 = await openai.audio.speech.create({
  model: "tts-1",
  voice: selectedVoice, // alloy, echo, fable, onyx, nova, shimmer
  input: scriptText,
});
```

### Replicate API (Video Generation)

#### Dynamic Model Selection
```javascript
// Get selected provider
const provider = getVideoProvider(selectedModelType);

// Validate parameters against model capabilities
const validation = provider.validateParams({
  duration: selectedDuration,
  resolution: selectedResolution,
  aspectRatio: selectedAspectRatio,
});

// Generate video
const videoUrl = await provider.generateVideo({
  prompt: generatedPrompt,
  duration: selectedDuration,
  aspect_ratio: selectedAspectRatio,
  resolution: selectedResolution,
  image: base64Image, // Optional
  generate_audio: false,
});
```

#### Example: Veo 3 Fast
```javascript
const output = await replicate.run("google/veo-3-fast", {
  input: {
    prompt: videoPrompt,
    duration: 6,
    aspect_ratio: "9:16",
    resolution: "1080p",
    image: base64ImageData, // Optional for image-to-video
    generate_audio: false, // We handle voiceover separately
  }
});
```

#### Example: Hailuo 2
```javascript
const output = await replicate.run("minimax/hailuo-02", {
  input: {
    prompt: videoPrompt,
    duration: 6, // 6 or 10 only
    aspect_ratio: "9:16",
    resolution: "768p",
    image: base64ImageData, // Optional
  }
});
```

---

## File Structure

```
pj-video-gui/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                       # Main generator UI
│   ├── api/
│   │   ├── analyze-image/
│   │   │   └── route.ts               # OpenAI Vision analysis
│   │   ├── generate-prompt/
│   │   │   └── route.ts               # AI prompt generation
│   │   ├── generate-script/
│   │   │   └── route.ts               # AI script generation
│   │   ├── generate-video/
│   │   │   └── route.ts               # Full pipeline orchestrator
│   │   └── settings/
│   │       └── route.ts               # Save/load settings (Phase 2)
│   └── globals.css
├── components/
│   ├── ImageUpload.tsx
│   ├── VideoModelSelector.tsx         # Model selection with capabilities
│   ├── VideoConfig.tsx                # Duration + Resolution + Aspect Ratio
│   ├── PromptEditor.tsx
│   ├── ScriptEditor.tsx
│   ├── VoiceSelector.tsx
│   ├── GenerateButton.tsx
│   ├── ProgressTracker.tsx            # State machine display
│   └── CostCalculator.tsx             # Real-time cost display
├── lib/
│   ├── video/
│   │   ├── types.ts                   # VideoProvider interface
│   │   ├── factory.ts                 # Provider factory
│   │   └── providers/
│   │       ├── veo3-fast.ts
│   │       ├── veo3.ts
│   │       ├── hailuo2.ts
│   │       └── seedance-pro-fast.ts
│   ├── voiceover/
│   │   ├── types.ts                   # VoiceoverProvider interface
│   │   ├── factory.ts                 # Provider factory
│   │   └── providers/
│   │       ├── openai-tts.ts
│   │       └── elevenlabs.ts          # Phase 2
│   ├── pipeline/
│   │   ├── VideoGenerationPipeline.ts # Main orchestrator
│   │   └── state-machine.ts           # State management
│   ├── clients/
│   │   ├── openai.ts
│   │   ├── replicate.ts
│   │   └── ffmpeg.ts
│   ├── storage/
│   │   ├── files.ts                   # File operations
│   │   └── metadata.ts                # JSON metadata
│   └── utils/
│       ├── cost-calculator.ts
│       ├── validator.ts
│       └── error-handler.ts
├── public/
├── .env.local
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Replicate Configuration
REPLICATE_API_TOKEN=r8_...

# ElevenLabs Configuration (Phase 2)
ELEVENLABS_API_KEY=...

# Output Configuration
OUTPUT_PATH=C:\Users\Saleem\Desktop\PJ-Social-Content

# Default Settings (Optional)
DEFAULT_VIDEO_MODEL=veo3-fast
DEFAULT_VOICE_PROVIDER=openai
DEFAULT_VOICE=nova
```

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "openai": "^4.0.0",
    "replicate": "^0.30.0",
    "axios": "^1.6.0",
    "fs-extra": "^11.2.0",
    "fluent-ffmpeg": "^2.1.2",
    "@ffmpeg-installer/ffmpeg": "^1.1.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "eslint": "^8.57.0",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/fluent-ffmpeg": "^2.1.24"
  }
}
```

---

## Error Handling

### User-Facing Errors
- **No image uploaded**: "Please upload an image first"
- **Invalid image format**: "Please upload JPG, PNG, or WebP"
- **API key missing**: "Configuration error. Please check API keys"
- **Model unavailable**: "Selected model is currently unavailable. Try another model."
- **Invalid duration**: "Selected duration not supported by this model"
- **API failure**: "Generation failed. Please try again"
- **Network timeout**: "Request timed out. Check your connection"
- **FFmpeg merge failed**: "Video created but voiceover merge failed. Files preserved."

### Error Recovery
- **Preserve intermediate files**: If FFmpeg fails, keep video and audio files
- **Retry mechanism**: Offer retry from last successful checkpoint
- **Checkpoint system**:
  ```
  Checkpoint 1: Video generated ✓ (saved)
  Checkpoint 2: Voiceover generated ✓ (saved)
  Checkpoint 3: Merge failed ✗ (retry available)
  ```
- **Graceful degradation**: Allow download of video without voiceover if merge fails

### Developer Logging
- Log all API requests/responses
- Capture error stack traces
- Track generation times per stage
- Monitor API costs per model
- Track model success/failure rates

---

## Performance Considerations

### Optimization
- Compress images before sending to OpenAI (max 2MB)
- Show progress indicators for all async operations
- Cache API responses during same session
- Lazy load components
- Stream progress updates via WebSocket/SSE (Phase 2)
- Parallel processing where possible (prompt + script generation)

### Expected Timing by Model

**Google Veo 3 Fast:**
- OpenAI Vision: 3-5s
- Prompt generation: 2-3s
- Script generation: 2-3s
- Video generation: 60-120s
- Voiceover: 2-3s
- FFmpeg merge: 3-5s
- **Total**: ~70-140s (1.2-2.3 min)

**Hailuo 2:**
- Video generation: 60-90s
- **Total**: ~70-110s (1.2-1.8 min)

**Seedance Pro Fast:**
- Video generation: 40-80s
- **Total**: ~50-100s (0.8-1.7 min)

---

## Cost Tracking

### Per Video Cost Breakdown

#### Google Veo 3 Fast (6s, 1080p)
- OpenAI Vision: $0.02
- Prompt generation: $0.005
- Script generation: $0.005
- Video generation: $0.90 (6s × $0.15)
- Voiceover: $0.015
- **Total**: ~$0.945 (~₹80)

#### Hailuo 2 (6s, 768p)
- OpenAI Vision: $0.02
- Prompt generation: $0.005
- Script generation: $0.005
- Video generation: $0.27 (6s × $0.045)
- Voiceover: $0.015
- **Total**: ~$0.315 (~₹27)

#### Seedance Pro Fast (6s, 720p)
- OpenAI Vision: $0.02
- Prompt generation: $0.005
- Script generation: $0.005
- Video generation: $0.15 (6s × $0.025)
- Voiceover: $0.015
- **Total**: ~$0.195 (~₹17)

### Cost Tracking Features
- Display estimated cost before generation
- Log actual costs in metadata
- Cumulative cost tracking (Phase 2)
- Cost comparison between models
- Budget alerts (Phase 2)

---

## Aspect Ratio Guide

### Platform-Specific Recommendations

| Aspect Ratio | Platforms | Best For | Notes |
|--------------|-----------|----------|-------|
| **9:16** | Instagram Reels, YouTube Shorts, TikTok, Facebook Reels | Mobile-first vertical video | Default for social media |
| **16:9** | YouTube (main feed), Facebook Video, LinkedIn | Landscape, traditional viewing | Desktop & TV friendly |
| **1:1** | Instagram Feed, Facebook Feed, Twitter/X | Square format, feed posts | Works on all devices |
| **4:3** | Older platforms, presentations | Traditional format | Less common now |
| **3:4** | Pinterest, portrait displays | Tall portrait | Good for product showcases |
| **21:9** | Cinematic content, premium ads | Ultra-wide cinematic | Premium/artistic feel |
| **9:21** | Experimental vertical | Ultra-tall vertical | Niche use cases |

### Selection Strategy
- **Primary Social (Default)**: 9:16 for Reels/Shorts/Stories
- **YouTube Main Feed**: 16:9 for channel content
- **Multi-Platform Feed**: 1:1 for maximum compatibility
- **Product Focus**: 3:4 or 9:16 for vertical product showcases

---

## Phase Implementation Plan

### Phase 1 (MVP) - Current Scope
**Timeline**: 4-6 hours

**Features:**
- ✅ Next.js 14 setup with TypeScript + Tailwind + shadcn/ui
- ✅ Image upload + preview
- ✅ **Video provider abstraction** (3 models: Veo 3 Fast, Hailuo 2, Seedance Pro Fast)
- ✅ **Voiceover provider abstraction** (OpenAI TTS with ElevenLabs-ready interface)
- ✅ OpenAI Vision → prompt generation
- ✅ OpenAI GPT-4o → script generation
- ✅ Dynamic UI (duration/resolution adjust per model)
- ✅ **Live cost calculator**
- ✅ Full pipeline orchestration
- ✅ **State machine progress tracking**
- ✅ **Metadata persistence** (JSON files)
- ✅ FFmpeg audio/video merging
- ✅ File storage system
- ✅ Error handling with checkpoints

**Testing:**
- [ ] Test all 3 video models
- [ ] Test different durations/resolutions
- [ ] Test error recovery
- [ ] Test cost calculations
- [ ] Test metadata generation

### Phase 2 (Enhanced UX)
**Timeline**: 2-3 hours

**Features:**
- Video preview in browser
- ElevenLabs integration
- Settings page (API keys, preferences)
- Generation history viewer
- Retry failed generations
- WebSocket progress updates

### Phase 3 (Advanced)
**Timeline**: Future

**Features:**
- Batch processing (multiple images)
- Template library (saved prompts/scripts)
- Cost analytics dashboard
- A/B testing (multiple model comparison)
- Background music integration
- Direct social media upload
- Multi-language support
- Custom voice cloning (ElevenLabs)

---

## Testing Requirements

### Manual Testing Checklist
- [ ] Image upload and preview
- [ ] Video model selection updates options
- [ ] Duration selection updates cost
- [ ] Resolution selection updates cost
- [ ] Aspect ratio selection works
- [ ] Prompt generation works (OpenAI Vision)
- [ ] Prompt regeneration works
- [ ] Script generation works (OpenAI GPT)
- [ ] Script regeneration works
- [ ] Voice selection applies correctly
- [ ] Video generation end-to-end (all 3 models)
- [ ] Voiceover generation works
- [ ] FFmpeg merge succeeds
- [ ] Files save to correct location
- [ ] Metadata saved correctly
- [ ] Error states display properly
- [ ] Loading states show progress
- [ ] Cost calculations accurate
- [ ] State machine transitions correctly

### Edge Cases
- Very large images (>10MB)
- Very small images (<100px)
- Network interruptions during generation
- API rate limits
- Invalid model parameters
- FFmpeg merge failure
- Out of disk space
- Concurrent generations
- Invalid API responses
- Model unavailability

---

## Deployment

### Local Development
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

### Desktop Deployment (Electron - Optional)
- Package as desktop app
- Direct file system access
- System tray integration
- No server required

---

## Brand Guidelines Integration

### Poppat Jamals Voice
- **Tone**: Premium yet approachable, heritage-forward
- **Keywords**: 120-year legacy, craftsmanship, quality, value, trust
- **Avoid**: Overly technical, cold, discount-focused language

### Visual Style
- Rich, warm color palette
- High-quality product photography
- Modern Indian aesthetic
- Emphasis on craftsmanship details

---

## Success Metrics

### MVP Success Criteria
1. Generate video in <3 minutes (any model)
2. 90%+ prompt/script quality (minimal manual edits)
3. Successful file save 100% of time
4. Clear error messages with recovery options
5. Intuitive UI (minimal training needed)
6. Accurate cost calculation
7. All 3 models working reliably

### Quality Benchmarks
- Videos feel premium and on-brand
- Scripts sound natural when spoken
- Camera movements are smooth and professional
- Lighting and composition are cinematic
- Cost predictions within 5% of actual

---

## Security & Privacy

- API keys stored in environment variables only
- No image data stored on servers (local processing)
- Temporary files cleaned up after generation
- No third-party analytics tracking user content
- All processing happens locally
- Metadata stored locally only

---

## Support & Documentation

### User Guide Topics
1. Getting started
2. Uploading images
3. Choosing the right video model
4. Editing prompts and scripts
5. Voice selection guide
6. Understanding costs
7. Troubleshooting common issues

### Developer Documentation
- API integration guide
- Provider abstraction pattern
- Component architecture
- State management patterns
- Error handling strategies
- Testing procedures
- Adding new video/voice providers

---

## Version History

### v1.0 (MVP - Phase 1)
- Image upload
- Video model selection (3 models)
- Duration/resolution/aspect ratio selection
- AI prompt generation (OpenAI Vision)
- AI script generation (OpenAI GPT-4o)
- Voice selection (OpenAI TTS)
- Video generation (multi-model support)
- Voiceover synthesis
- FFmpeg audio/video merging
- Metadata persistence
- Cost tracking
- Local file save

### v1.1 (Phase 2 - Planned)
- Video preview in app
- ElevenLabs integration
- Settings page
- Generation history
- Error recovery UI
- Template save/load

### v2.0 (Phase 3 - Future)
- Batch processing
- Cost dashboard
- A/B testing
- Social media upload
- Multi-language support

---

## Contact & Support

**Project Owner**: Sal
**Business**: Poppat Jamals
**Location**: Chennai, Tamil Nadu
**Use Case**: Social media content generation for heritage homeware products

---

*This requirements document serves as the single source of truth for the PJ Video Generator GUI project.*

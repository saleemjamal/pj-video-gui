# PJ Video Generator - Setup Instructions

## ✅ Phase 1 Complete!

The application has been successfully built with all features:

- ✅ Video provider abstraction (3 models: Veo 3 Fast, Hailuo 2, Seedance Pro Fast)
- ✅ Voiceover provider abstraction (OpenAI TTS with ElevenLabs-ready interface)
- ✅ OpenAI Vision → prompt generation
- ✅ OpenAI GPT-4o → script generation
- ✅ Full pipeline orchestration
- ✅ State machine progress tracking
- ✅ Metadata persistence (JSON files)
- ✅ FFmpeg audio/video merging
- ✅ File storage system
- ✅ Complete UI with all controls

---

## 🚀 Quick Start

### 1. Create .env.local File

Create a file named `.env.local` in the root directory (`C:\Projects\pj-video-gui\.env.local`) with your API keys:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...

# Replicate Configuration
REPLICATE_API_TOKEN=r8_...

# Output Configuration (optional)
OUTPUT_PATH=C:\Users\Saleem\Desktop\PJ-Social-Content

# Default Settings (optional)
DEFAULT_VIDEO_MODEL=veo3-fast
DEFAULT_VOICE_PROVIDER=openai
DEFAULT_VOICE=nova
```

**Where to get API keys:**
- **OpenAI**: https://platform.openai.com/api-keys
- **Replicate**: https://replicate.com/account/api-tokens

### 2. Start the Development Server

```bash
npm run dev
```

The application will open at: http://localhost:3000

---

## 📖 How to Use

### Step 1: Upload Product Image
- Click "Choose Image" and select a product photo
- Supported formats: JPG, PNG, WebP

### Step 2: Configure Video Settings
- **Video Model**: Choose from:
  - **Google Veo 3 Fast** (Premium, $0.60-0.90 for 6s) - Default
  - **Hailuo 2** (Budget, $0.27-0.48 for 6s)
  - **Seedance 1 Pro Fast** (Ultra Budget, $0.09-0.36 for 6s)
- **Duration**: 4s, 6s, or 8s (depends on model)
- **Resolution**: 720p or 1080p (depends on model)
- **Aspect Ratio**: 9:16 (Reels/Shorts), 16:9 (YouTube), or 1:1 (Feed)

### Step 3: Generate Video Prompt
- Click "🔄 Generate Prompt"
- AI will analyze your image and create an optimized video prompt
- You can edit the prompt if needed

### Step 4: Generate Voiceover Script
- Click "🔄 Generate Script"
- AI will create a brand-appropriate script based on duration
- You can edit the script if needed

### Step 5: Select Voice
- Choose from 6 voices:
  - **Nova** (Female, bright)
  - **Shimmer** (Female, warm)
  - **Alloy** (Neutral, balanced) - Great default
  - **Echo** (Male, clear)
  - **Onyx** (Male, deep)
  - **Fable** (Neutral, expressive)

### Step 6: Generate Video
- Click "🎬 Generate Video"
- Wait 1-2 minutes for complete generation
- Files will be saved to your Desktop in a dated folder

---

## 📁 Output Files

Videos are saved to:
```
C:\Users\Saleem\Desktop\PJ-Social-Content\
└── 2025-10-25\
    └── generation_2025-10-25_14-30-00\
        ├── source_image.jpg
        ├── video_original_1234567890.mp4
        ├── voiceover_1234567890.mp3
        ├── video_final_1234567890.mp4  ← **Final video with voiceover**
        └── metadata_1234567890.json    ← **All generation details**
```

---

## 💰 Cost Estimates

### Per 6-second Video:

| Model | Resolution | Video Cost | Total Cost* |
|-------|------------|------------|-------------|
| **Veo 3 Fast** | 1080p | $0.60 | **~$0.65** (~₹55) |
| **Hailuo 2** | 768p | $0.27 | **~$0.32** (~₹27) |
| **Seedance Pro Fast** | 720p | $0.15 | **~$0.20** (~₹17) |

*Total includes OpenAI costs (Vision + Prompt + Script + TTS)

---

## 🐛 Troubleshooting

### Issue: "Configuration error. Please check API keys"
**Solution**: Ensure `.env.local` exists with valid `OPENAI_API_KEY` and `REPLICATE_API_TOKEN`

### Issue: Video generation fails
**Solution**:
1. Check your Replicate account has credits
2. Ensure the selected model is available
3. Try a different video model (switch to Hailuo 2 or Seedance)

### Issue: FFmpeg merge failed
**Solution**: The video and audio files are preserved. Check the output folder - you can manually merge them if needed.

### Issue: Port 3000 already in use
**Solution**:
```bash
# Kill process on port 3000 (Windows)
npx kill-port 3000

# Or use a different port
PORT=3001 npm run dev
```

---

## 🎯 Quick Test

1. Start the dev server: `npm run dev`
2. Upload a test image
3. Click "Generate Prompt" (wait 5 seconds)
4. Click "Generate Script" (wait 3 seconds)
5. Click "Generate Video" (wait 1-2 minutes)
6. Check your Desktop for the output folder!

---

## 🚀 Next Steps (Phase 2)

Future enhancements to add:
- Video preview in browser
- ElevenLabs voice integration
- Settings page for API keys
- Generation history viewer
- Batch processing

---

## 📞 Support

If you encounter issues:
1. Check the browser console for errors (F12)
2. Check the terminal where `npm run dev` is running
3. Verify all dependencies installed: `npm install`
4. Ensure `.env.local` has correct API keys

---

## ✨ Features Overview

### Video Generation Models
- **3 models** with different quality/price tiers
- **Dynamic UI** - options change based on selected model
- **Real-time cost calculator**

### AI-Powered Content
- **OpenAI Vision** analyzes product images
- **GPT-4o** generates optimized video prompts
- **GPT-4o** creates brand-appropriate scripts
- **OpenAI TTS** generates professional voiceovers

### Pipeline Features
- **State machine** progress tracking
- **Error recovery** with preserved intermediate files
- **Metadata persistence** - all settings and costs logged
- **FFmpeg integration** - seamless audio/video merging

---

**Ready to generate your first video!** 🎬

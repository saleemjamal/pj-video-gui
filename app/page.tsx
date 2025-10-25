'use client';

import { useState, useCallback } from 'react';
import type { VideoTheme, TextOverlay } from '@/lib/themes/types';
import { getAllThemes, getThemeConfig, DEFAULT_THEME } from '@/lib/themes/config';

type VideoProviderType = 'veo3-fast' | 'hailuo2' | 'seedance-pro-fast';
type GenerationState = 'idle' | 'generating' | 'complete' | 'error';

const VIDEO_MODELS = {
  'veo3-fast': {
    name: 'Google Veo 3 Fast',
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16'], // Veo 3 only supports these
    costPerSec: 0.10,
  },
  'hailuo2': {
    name: 'Hailuo 2',
    durations: [6, 10],
    resolutions: ['512p', '768p', '1080p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    // 10s only available for 512p and 768p (NOT 1080p)
    getValidResolutions: (duration: number) => {
      if (duration === 10) return ['512p', '768p'];
      return ['512p', '768p', '1080p'];
    },
    costPerSec: 0.045,
  },
  'seedance-pro-fast': {
    name: 'Seedance 1 Pro Fast',
    durations: [2, 4, 6, 8, 10, 12], // Supports 2-12 seconds
    resolutions: ['480p', '720p', '1080p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    costPerSec: 0.025,
  },
};

const OPENAI_VOICES = [
  { id: 'nova', name: 'Nova', gender: 'Female', description: 'Bright, energetic' },
  { id: 'shimmer', name: 'Shimmer', gender: 'Female', description: 'Warm, friendly' },
  { id: 'alloy', name: 'Alloy', gender: 'Neutral', description: 'Balanced' },
  { id: 'echo', name: 'Echo', gender: 'Male', description: 'Clear, professional' },
  { id: 'onyx', name: 'Onyx', gender: 'Male', description: 'Deep, authoritative' },
  { id: 'fable', name: 'Fable', gender: 'Neutral', description: 'Expressive' },
];

const ELEVENLABS_VOICES = [
  { id: 'preethi', name: 'Preethi', gender: 'Female', description: 'Indian English - Warm, professional' },
  { id: 'prabhat', name: 'Prabhat', gender: 'Male', description: 'Indian English - Clear, authoritative' },
  { id: 'bella', name: 'Bella', gender: 'Female', description: 'International - Soft, friendly' },
  { id: 'rachel', name: 'Rachel', gender: 'Female', description: 'International - Warm, engaging' },
  { id: 'adam', name: 'Adam', gender: 'Male', description: 'International - Deep, professional' },
  { id: 'antoni', name: 'Antoni', gender: 'Male', description: 'International - Clear, articulate' },
];

const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 (YouTube)' },
  { value: '9:16', label: '9:16 (Reels/Shorts)', default: true },
  { value: '1:1', label: '1:1 (Feed)' },
];

// Helper: Get valid resolutions for a model and duration
const getValidResolutions = (model: VideoProviderType, duration: number): string[] => {
  const modelConfig = VIDEO_MODELS[model];
  if ('getValidResolutions' in modelConfig && modelConfig.getValidResolutions) {
    return modelConfig.getValidResolutions(duration);
  }
  return modelConfig.resolutions;
};

// Helper: Get valid aspect ratios for a model
const getValidAspectRatios = (model: VideoProviderType): typeof ASPECT_RATIOS => {
  const modelConfig = VIDEO_MODELS[model];
  const validRatios = modelConfig.aspectRatios || ['16:9', '9:16', '1:1'];
  return ASPECT_RATIOS.filter(ar => validRatios.includes(ar.value));
};

export default function Home() {
  // State
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [productDescription, setProductDescription] = useState('');
  const [detectedProduct, setDetectedProduct] = useState('');
  const [videoModel, setVideoModel] = useState<VideoProviderType>('veo3-fast');
  const [duration, setDuration] = useState(6);
  const [resolution, setResolution] = useState('1080p');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [prompt, setPrompt] = useState('');
  const [script, setScript] = useState('');
  const [voiceProvider, setVoiceProvider] = useState<VoiceoverProviderType>('elevenlabs');
  const [voice, setVoice] = useState('preethi'); // Default to Indian English voice
  const [state, setState] = useState<GenerationState>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);

  // Logo state
  const [logoChoice, setLogoChoice] = useState<'pending' | 'yes' | 'no'>('pending'); // Track logo decision
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [enableLogoIntro, setEnableLogoIntro] = useState(false);
  const [enableLogoOutro, setEnableLogoOutro] = useState(false);
  const [introDuration, setIntroDuration] = useState(2);
  const [outroDuration, setOutroDuration] = useState(2);

  // Theme and text overlay state
  const [theme, setTheme] = useState<VideoTheme>(DEFAULT_THEME);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);

  // Calculate cost
  const estimatedCost = () => {
    const model = VIDEO_MODELS[videoModel];
    const videoCost = duration * model.costPerSec;
    const aiCost = 0.03; // OpenAI costs
    const total = videoCost + aiCost;
    return { usd: total, inr: Math.round(total * 85) };
  };

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle logo upload
  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    // Enable intro and outro by default (2s each)
    setEnableLogoIntro(true);
    setEnableLogoOutro(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogo(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Get available voices based on selected provider
  const getAvailableVoices = () => {
    return voiceProvider === 'elevenlabs' ? ELEVENLABS_VOICES : OPENAI_VOICES;
  };

  // Handle voice provider change
  const handleVoiceProviderChange = (provider: VoiceoverProviderType) => {
    setVoiceProvider(provider);
    // Set default voice for the new provider
    if (provider === 'elevenlabs') {
      setVoice('preethi'); // Indian English female
    } else {
      setVoice('nova'); // OpenAI default
    }
  };

  // Calculate total video duration with logo intro/outro
  const getTotalDuration = () => {
    let total = duration;
    if (enableLogoIntro) total += introDuration;
    if (enableLogoOutro) total += outroDuration;
    return total;
  };

  // Generate prompt
  const handleGeneratePrompt = async () => {
    if (!image) return;

    setGeneratingPrompt(true);
    setError('');

    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          duration,
          aspectRatio,
          modelName: VIDEO_MODELS[videoModel].name,
          productDescription: productDescription || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setPrompt(data.prompt);
        setDetectedProduct(data.detectedProduct || '');
      } else {
        setError(data.error || 'Failed to generate prompt');
      }
    } catch (err) {
      setError('Failed to generate prompt');
    } finally {
      setGeneratingPrompt(false);
    }
  };

  // Generate script
  const handleGenerateScript = async () => {
    setGeneratingScript(true);
    setError('');

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productDescription: productDescription || detectedProduct || 'Product from image',
          duration,
          theme,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setScript(data.script);
      } else {
        setError(data.error || 'Failed to generate script');
      }
    } catch (err) {
      setError('Failed to generate script');
    } finally {
      setGeneratingScript(false);
    }
  };

  // Generate video
  const handleGenerateVideo = async () => {
    if (!image || !prompt || !script) {
      setError('Please complete all fields');
      return;
    }

    setState('generating');
    setError('');

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          videoProvider: videoModel,
          duration,
          aspectRatio,
          resolution,
          prompt,
          script,
          theme, // Video theme
          voiceProvider,
          voice,
          // Logo parameters
          logo: logo || undefined,
          enableLogoIntro: enableLogoIntro && logo ? true : false,
          enableLogoOutro: enableLogoOutro && logo ? true : false,
          introDuration: enableLogoIntro ? introDuration : 0,
          outroDuration: enableLogoOutro ? outroDuration : 0,
          // Text overlay parameters
          textOverlays,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
        setState('complete');
      } else {
        setError(data.error || 'Failed to generate video');
        setState('error');
      }
    } catch (err) {
      setError('Failed to generate video');
      setState('error');
    }
  };

  const cost = estimatedCost();
  const canGenerate = image && prompt && script && logoChoice !== 'pending' && state === 'idle';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">PJ Video Generator</h1>
          <p className="text-indigo-100 mt-2 text-lg">Poppat Jamals Heritage Homeware</p>
        </div>

        {/* Image Upload */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 mb-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
              1
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Upload Product Image</h2>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            {!image ? (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
                >
                  Choose Image
                </label>
                <p className="text-gray-500 text-sm mt-2">JPG, PNG, WebP supported</p>
              </div>
            ) : (
              <div>
                <img src={image} alt="Preview" className="max-h-64 mx-auto rounded" />
                {detectedProduct && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">AI detected:</span> {detectedProduct}
                  </p>
                )}
                <button
                  onClick={() => {
                    setImage(null);
                    setImageFile(null);
                    setDetectedProduct('');
                    setProductDescription('');
                  }}
                  className="mt-4 text-red-600 text-sm hover:underline"
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>

          {/* Product Description Field */}
          {image && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Description (Optional)
              </label>
              <input
                type="text"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="e.g., olive oil pourer, stainless steel tea kettle"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Help the AI by specifying what this product is if it's misidentified
              </p>
            </div>
          )}
        </div>

        {/* Theme Selection */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 mb-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
              2
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Select Video Theme</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Choose a theme that influences the voiceover tone and provides text overlay presets
          </p>

          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as VideoTheme)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
          >
            {getAllThemes().map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} - {t.description}
              </option>
            ))}
          </select>

          {/* Quick Preset Buttons */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Text Overlay Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {getThemeConfig(theme).presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const themeStyle = getThemeConfig(theme).textStyle;
                    const newOverlay: TextOverlay = {
                      text: preset.text,
                      position: preset.position,
                      startTime: preset.startTime,
                      endTime: Math.min(preset.endTime, duration),
                      fadeDuration: preset.fadeDuration || 0.5,
                      textColor: themeStyle.textColor,
                      fontSize: themeStyle.fontSize,
                      fontWeight: themeStyle.fontWeight,
                      backgroundColor: themeStyle.backgroundColor,
                      backgroundOpacity: themeStyle.backgroundOpacity,
                    };
                    setTextOverlays([...textOverlays, newOverlay]);
                  }}
                  className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 text-sm font-medium"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Click to add preset overlays to your video (customizable below)
            </p>
          </div>
        </div>

        {/* Video Configuration */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 mb-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
              3
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Video Configuration</h2>
          </div>

          {/* Model Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Video Model</label>
            <select
              value={videoModel}
              onChange={(e) => {
                const newModel = e.target.value as VideoProviderType;
                setVideoModel(newModel);
                // Reset duration to middle value (safe default)
                const newDuration = VIDEO_MODELS[newModel].durations[1] || VIDEO_MODELS[newModel].durations[0];
                setDuration(newDuration);
                // Reset resolution to highest valid for that duration
                const validResolutions = getValidResolutions(newModel, newDuration);
                setResolution(validResolutions[validResolutions.length - 1]);
                // Reset aspect ratio to valid value for model
                const validAspectRatios = getValidAspectRatios(newModel);
                if (!validAspectRatios.find(ar => ar.value === aspectRatio)) {
                  setAspectRatio(validAspectRatios.find(ar => ar.default)?.value || validAspectRatios[0].value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            >
              {Object.entries(VIDEO_MODELS).map(([key, model]) => (
                <option key={key} value={key}>{model.name}</option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            <div className="flex gap-2">
              {VIDEO_MODELS[videoModel].durations.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDuration(d);
                    // Auto-adjust resolution if current selection becomes invalid
                    const validResolutions = getValidResolutions(videoModel, d);
                    if (!validResolutions.includes(resolution)) {
                      setResolution(validResolutions[validResolutions.length - 1] || validResolutions[0]);
                    }
                  }}
                  className={`px-4 py-2 rounded-md ${
                    duration === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
            {/* Show constraint hint for Hailuo 2 */}
            {videoModel === 'hailuo2' && duration === 10 && (
              <p className="text-xs text-amber-600 mt-2">
                ⓘ 10-second videos only support 512p and 768p resolutions
              </p>
            )}
          </div>

          {/* Resolution */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            >
              {getValidResolutions(videoModel, duration).map((res) => (
                <option key={res} value={res}>{res}</option>
              ))}
            </select>
          </div>

          {/* Aspect Ratio */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            >
              {getValidAspectRatios(videoModel).map((ratio) => (
                <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
              ))}
            </select>
            {/* Show constraint hint for Veo 3 */}
            {videoModel === 'veo3-fast' && (
              <p className="text-xs text-blue-600 mt-2">
                ⓘ Veo 3 only supports 16:9 and 9:16 aspect ratios
              </p>
            )}
            {/* Show note about image aspect ratio */}
            {image && (
              <p className="text-xs text-gray-600 mt-2">
                ⓘ The uploaded image will be used as the first frame - video will match your image's aspect ratio
              </p>
            )}
          </div>

          {/* Cost Estimate */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Estimated Cost:</span> ${cost.usd.toFixed(2)} (₹{cost.inr})
            </p>
          </div>
        </div>

        {/* Prompt Generation */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 mb-6 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                4
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Video Prompt</h2>
            </div>
            <button
              onClick={handleGeneratePrompt}
              disabled={!image || generatingPrompt}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all disabled:bg-slate-300 disabled:cursor-not-allowed text-sm font-medium"
            >
              {generatingPrompt ? 'Generating...' : '🔄 Generate Prompt'}
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="AI-generated video prompt will appear here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-gray-900 bg-white placeholder-gray-400"
            rows={4}
          />
        </div>

        {/* Script Generation */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 mb-6 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                5
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Voiceover Script</h2>
            </div>
            <button
              onClick={handleGenerateScript}
              disabled={generatingScript}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all disabled:bg-slate-300 disabled:cursor-not-allowed text-sm font-medium"
            >
              {generatingScript ? 'Generating...' : '🔄 Generate Script'}
            </button>
          </div>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="AI-generated voiceover script will appear here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-gray-900 bg-white placeholder-gray-400"
            rows={3}
          />
        </div>

        {/* Voice Selection */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 mb-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
              6
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Select Voice</h2>
          </div>

          {/* Voice Provider Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Voice Provider</label>
            <select
              value={voiceProvider}
              onChange={(e) => handleVoiceProviderChange(e.target.value as VoiceoverProviderType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            >
              <option value="elevenlabs">ElevenLabs (Premium, Indian English)</option>
              <option value="openai">OpenAI (Standard)</option>
            </select>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Voice</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
            >
              {getAvailableVoices().map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.gender}) - {v.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Logo Intro/Outro (Optional) */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 mb-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
              7
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Brand Logo</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Do you want to add a logo intro/outro to your video?
          </p>

          {/* Logo Choice */}
          <div className="mb-4">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setLogoChoice('yes');
                  // Enable intro and outro by default (2s each) when choosing to add logo
                  if (!logo) {
                    setEnableLogoIntro(true);
                    setEnableLogoOutro(true);
                  }
                }}
                className={`flex-1 px-4 py-3 rounded-md border-2 text-sm font-medium transition-colors ${
                  logoChoice === 'yes'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Add Logo
              </button>
              <button
                onClick={() => {
                  setLogoChoice('no');
                  setLogo(null);
                  setLogoFile(null);
                  setEnableLogoIntro(false);
                  setEnableLogoOutro(false);
                }}
                className={`flex-1 px-4 py-3 rounded-md border-2 text-sm font-medium transition-colors ${
                  logoChoice === 'no'
                    ? 'border-gray-600 bg-gray-50 text-gray-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                No Logo
              </button>
            </div>
            {logoChoice === 'pending' && (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ Please make a selection to continue
              </p>
            )}
          </div>

          {/* Confirmation when "No Logo" is selected */}
          {logoChoice === 'no' && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
              <p className="text-sm text-gray-700">
                ✓ Video will be generated without logo intro/outro
              </p>
            </div>
          )}

          {/* Logo Upload (only show if "Add Logo" selected) */}
          {logoChoice === 'yes' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Logo</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {!logo ? (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex items-center px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                    >
                      Choose Logo
                    </label>
                    <p className="text-gray-500 text-xs mt-2">PNG recommended for transparency</p>
                  </div>
                ) : (
                  <div>
                    <img src={logo} alt="Logo Preview" className="max-h-24 mx-auto rounded" />
                    <button
                      onClick={() => {
                        setLogo(null);
                        setLogoFile(null);
                        setEnableLogoIntro(false);
                        setEnableLogoOutro(false);
                      }}
                      className="mt-2 text-red-600 text-xs hover:underline"
                    >
                      Remove Logo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logo Options (only show if logo uploaded) */}
          {logo && (
            <>
              <div className="mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={enableLogoIntro}
                    onChange={(e) => setEnableLogoIntro(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Add logo intro</span>
                </label>
                {enableLogoIntro && (
                  <div className="mt-2 ml-6">
                    <label className="block text-xs text-gray-600 mb-1">
                      Intro duration: {introDuration}s
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.5"
                      value={introDuration}
                      onChange={(e) => setIntroDuration(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={enableLogoOutro}
                    onChange={(e) => setEnableLogoOutro(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Add logo outro</span>
                </label>
                {enableLogoOutro && (
                  <div className="mt-2 ml-6">
                    <label className="block text-xs text-gray-600 mb-1">
                      Outro duration: {outroDuration}s
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.5"
                      value={outroDuration}
                      onChange={(e) => setOutroDuration(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Total Duration Display */}
              {(enableLogoIntro || enableLogoOutro) && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">Total video length:</span> {getTotalDuration()}s
                    {' '}({enableLogoIntro ? `${introDuration}s intro + ` : ''}{duration}s product{enableLogoOutro ? ` + ${outroDuration}s outro` : ''})
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Text Overlays Editor */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 mb-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
              8
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Text Overlays (Optional)</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Add or customize text overlays on your video. Use quick presets from the theme section above, or add custom text.
          </p>

          {/* List of current overlays */}
          {textOverlays.length > 0 ? (
            <div className="space-y-3 mb-4">
              {textOverlays.map((overlay, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={overlay.text}
                        onChange={(e) => {
                          const updated = [...textOverlays];
                          updated[index].text = e.target.value;
                          setTextOverlays(updated);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-medium text-gray-900 bg-white"
                        placeholder="Overlay text"
                      />
                    </div>
                    <button
                      onClick={() => setTextOverlays(textOverlays.filter((_, i) => i !== index))}
                      className="ml-2 text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Position */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
                      <select
                        value={overlay.position}
                        onChange={(e) => {
                          const updated = [...textOverlays];
                          updated[index].position = e.target.value as TextOverlay['position'];
                          setTextOverlays(updated);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 bg-white"
                      >
                        <option value="top-left">Top Left</option>
                        <option value="top-center">Top Center</option>
                        <option value="top-right">Top Right</option>
                        <option value="center">Center</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-center">Bottom Center</option>
                        <option value="bottom-right">Bottom Right</option>
                      </select>
                    </div>

                    {/* Timing */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Timing: {overlay.startTime}s - {overlay.endTime}s
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max={duration}
                          step="0.5"
                          value={overlay.startTime}
                          onChange={(e) => {
                            const updated = [...textOverlays];
                            updated[index].startTime = parseFloat(e.target.value);
                            setTextOverlays(updated);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 bg-white"
                          placeholder="Start"
                        />
                        <input
                          type="number"
                          min="0"
                          max={duration}
                          step="0.5"
                          value={overlay.endTime}
                          onChange={(e) => {
                            const updated = [...textOverlays];
                            updated[index].endTime = parseFloat(e.target.value);
                            setTextOverlays(updated);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 bg-white"
                          placeholder="End"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Styling Controls (Collapsible) */}
                  <details className="mt-3">
                    <summary className="text-xs font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                      Customize Styling
                    </summary>
                    <div className="mt-2 grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                      {/* Text Color */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Text Color</label>
                        <input
                          type="color"
                          value={overlay.textColor || '#FFFFFF'}
                          onChange={(e) => {
                            const updated = [...textOverlays];
                            updated[index].textColor = e.target.value;
                            setTextOverlays(updated);
                          }}
                          className="w-full h-8 rounded border border-gray-300"
                        />
                      </div>

                      {/* Font Size */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Size: {overlay.fontSize || 64}px
                        </label>
                        <input
                          type="range"
                          min="24"
                          max="120"
                          step="4"
                          value={overlay.fontSize || 64}
                          onChange={(e) => {
                            const updated = [...textOverlays];
                            updated[index].fontSize = parseInt(e.target.value);
                            setTextOverlays(updated);
                          }}
                          className="w-full"
                        />
                      </div>

                      {/* Background Color */}
                      <div>
                        <label className="flex items-center text-xs text-gray-600 mb-1">
                          <input
                            type="checkbox"
                            checked={!!overlay.backgroundColor}
                            onChange={(e) => {
                              const updated = [...textOverlays];
                              updated[index].backgroundColor = e.target.checked ? '#000000' : undefined;
                              setTextOverlays(updated);
                            }}
                            className="mr-1"
                          />
                          Background
                        </label>
                        {overlay.backgroundColor && (
                          <input
                            type="color"
                            value={overlay.backgroundColor}
                            onChange={(e) => {
                              const updated = [...textOverlays];
                              updated[index].backgroundColor = e.target.value;
                              setTextOverlays(updated);
                            }}
                            className="w-full h-8 rounded border border-gray-300"
                          />
                        )}
                      </div>

                      {/* Fade Duration */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Fade: {overlay.fadeDuration || 0.5}s
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={overlay.fadeDuration || 0.5}
                          onChange={(e) => {
                            const updated = [...textOverlays];
                            updated[index].fadeDuration = parseFloat(e.target.value);
                            setTextOverlays(updated);
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4">No overlays added yet. Use preset buttons above or add custom text below.</p>
          )}

          {/* Add Custom Overlay Button */}
          <button
            onClick={() => {
              const themeStyle = getThemeConfig(theme).textStyle;
              setTextOverlays([
                ...textOverlays,
                {
                  text: 'Custom Text',
                  position: 'top-center',
                  startTime: 0,
                  endTime: Math.min(3, duration),
                  fadeDuration: 0.5,
                  textColor: themeStyle.textColor,
                  fontSize: themeStyle.fontSize,
                  backgroundColor: themeStyle.backgroundColor,
                  backgroundOpacity: themeStyle.backgroundOpacity,
                },
              ]);
            }}
            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800 text-sm"
          >
            + Add Custom Text Overlay
          </button>
        </div>

        {/* Generate Button */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 mb-6 hover:shadow-lg transition-shadow">
          <button
            onClick={handleGenerateVideo}
            disabled={!canGenerate || state === 'generating'}
            className="w-full px-8 py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xl font-bold rounded-xl shadow-lg hover:from-indigo-700 hover:to-indigo-800 hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed disabled:transform-none"
          >
            {state === 'generating' ? '⏳ Generating Video (1-2 min)...' : '🎬 Generate Video'}
          </button>

          {/* Status */}
          {state === 'generating' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-900 text-sm">
                Video generation in progress. This may take 1-2 minutes...
              </p>
            </div>
          )}

          {state === 'complete' && result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-900 font-medium mb-2">✅ Video Generated Successfully!</p>
              <p className="text-sm text-green-800 mb-1">
                <span className="font-medium">Output Folder:</span> {result.outputFolder}
              </p>
              <p className="text-sm text-green-800 mb-1">
                <span className="font-medium">Final Video:</span> {result.finalVideoPath}
              </p>
              <p className="text-sm text-green-800">
                <span className="font-medium">Total Cost:</span> ${result.metadata.costs.total.toFixed(2)}
              </p>
              {result.metadata.logo?.error && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-xs text-amber-800">
                    ⚠️ Logo processing failed. Video saved without logo intro/outro.
                  </p>
                </div>
              )}
            </div>
          )}

          {state === 'error' && error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-900">❌ Error: {error}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

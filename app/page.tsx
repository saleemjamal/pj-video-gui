'use client';

import { useState, useCallback } from 'react';

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

const VOICES = [
  { id: 'nova', name: 'Nova', gender: 'Female', description: 'Bright, energetic' },
  { id: 'shimmer', name: 'Shimmer', gender: 'Female', description: 'Warm, friendly' },
  { id: 'alloy', name: 'Alloy', gender: 'Neutral', description: 'Balanced' },
  { id: 'echo', name: 'Echo', gender: 'Male', description: 'Clear, professional' },
  { id: 'onyx', name: 'Onyx', gender: 'Male', description: 'Deep, authoritative' },
  { id: 'fable', name: 'Fable', gender: 'Neutral', description: 'Expressive' },
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
  const [voice, setVoice] = useState('nova');
  const [state, setState] = useState<GenerationState>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);

  // Logo state
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [enableLogoIntro, setEnableLogoIntro] = useState(false);
  const [enableLogoOutro, setEnableLogoOutro] = useState(false);
  const [introDuration, setIntroDuration] = useState(2);
  const [outroDuration, setOutroDuration] = useState(2);

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
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogo(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

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
          voiceProvider: 'openai',
          voice,
          // Logo parameters
          logo: logo || undefined,
          enableLogoIntro: enableLogoIntro && logo ? true : false,
          enableLogoOutro: enableLogoOutro && logo ? true : false,
          introDuration: enableLogoIntro ? introDuration : 0,
          outroDuration: enableLogoOutro ? outroDuration : 0,
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
  const canGenerate = image && prompt && script && state === 'idle';

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">PJ Video Generator</h1>
          <p className="text-gray-600 mt-1">Poppat Jamals Heritage Homeware</p>
        </div>

        {/* Image Upload */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">1. Upload Product Image</h2>
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
                  className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Help the AI by specifying what this product is if it's misidentified
              </p>
            </div>
          )}
        </div>

        {/* Video Configuration */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">2. Video Configuration</h2>

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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">3. Video Prompt</h2>
            <button
              onClick={handleGeneratePrompt}
              disabled={!image || generatingPrompt}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
            >
              {generatingPrompt ? 'Generating...' : '🔄 Generate Prompt'}
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="AI-generated video prompt will appear here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 bg-white placeholder-gray-400"
            rows={4}
          />
        </div>

        {/* Script Generation */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">4. Voiceover Script</h2>
            <button
              onClick={handleGenerateScript}
              disabled={generatingScript}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
            >
              {generatingScript ? 'Generating...' : '🔄 Generate Script'}
            </button>
          </div>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="AI-generated voiceover script will appear here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 bg-white placeholder-gray-400"
            rows={3}
          />
        </div>

        {/* Voice Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">5. Select Voice</h2>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.gender}) - {v.description}
              </option>
            ))}
          </select>
        </div>

        {/* Logo Intro/Outro (Optional) */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">6. Brand Logo (Optional)</h2>

          {/* Logo Upload */}
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

        {/* Generate Button */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <button
            onClick={handleGenerateVideo}
            disabled={!canGenerate || state === 'generating'}
            className="w-full px-6 py-4 bg-blue-600 text-white text-lg font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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

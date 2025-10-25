// Storage types

export interface GenerationMetadata {
  timestamp: string;
  video_path: string;
  settings: {
    video_model: string;
    duration: number;
    aspect_ratio: string;
    resolution: string;
  };
  content: {
    prompt: string;
    script: string;
    voice: string;
    voice_provider: string;
  };
  costs: {
    vision_analysis: number;
    prompt_generation: number;
    script_generation: number;
    video_generation: number;
    voiceover: number;
    total: number;
  };
  timings: {
    vision: number;
    prompt: number;
    script: number;
    video: number;
    voiceover: number;
    merge: number;
    total: number;
  };
  files: {
    original_video: string;
    voiceover: string;
    final_video: string;
  };
}

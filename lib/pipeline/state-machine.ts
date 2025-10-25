// State machine for video generation pipeline

export type GenerationState =
  | 'idle'
  | 'uploading_image'
  | 'analyzing_image'
  | 'generating_prompt'
  | 'generating_script'
  | 'generating_video'
  | 'generating_voiceover'
  | 'merging_audio'
  | 'saving_files'
  | 'complete'
  | 'error';

export interface StateInfo {
  state: GenerationState;
  message: string;
  progress: number; // 0-100
}

export const stateMessages: Record<GenerationState, string> = {
  idle: 'Ready to generate',
  uploading_image: 'Uploading image...',
  analyzing_image: 'Analyzing image with AI...',
  generating_prompt: 'Creating video prompt...',
  generating_script: 'Writing voiceover script...',
  generating_video: 'Generating video (1-2 min)...',
  generating_voiceover: 'Creating voiceover audio...',
  merging_audio: 'Merging video with voiceover...',
  saving_files: 'Saving files...',
  complete: 'Complete!',
  error: 'Error occurred',
};

export const stateProgress: Record<GenerationState, number> = {
  idle: 0,
  uploading_image: 5,
  analyzing_image: 10,
  generating_prompt: 20,
  generating_script: 25,
  generating_video: 40, // This is the longest step
  generating_voiceover: 85,
  merging_audio: 90,
  saving_files: 95,
  complete: 100,
  error: 0,
};

export function getStateInfo(state: GenerationState): StateInfo {
  return {
    state,
    message: stateMessages[state],
    progress: stateProgress[state],
  };
}

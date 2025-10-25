import Replicate from 'replicate';

// Initialize Replicate client
export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// Note: Video generation is handled by provider classes
// This client is for any additional Replicate operations if needed

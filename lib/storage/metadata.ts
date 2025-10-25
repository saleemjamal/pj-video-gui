import fs from 'fs-extra';
import path from 'path';
import type { GenerationMetadata } from './types';

// Save metadata to JSON file
export async function saveMetadata(
  outputPath: string,
  metadata: GenerationMetadata
): Promise<string> {
  const timestamp = Date.now();
  const filename = `metadata_${timestamp}.json`;
  const filePath = path.join(outputPath, filename);

  await fs.writeJSON(filePath, metadata, { spaces: 2 });

  return filePath;
}

// Load metadata from JSON file
export async function loadMetadata(filePath: string): Promise<GenerationMetadata> {
  return await fs.readJSON(filePath);
}

// List all metadata files in a directory
export async function listMetadataFiles(directoryPath: string): Promise<string[]> {
  const files = await fs.readdir(directoryPath);
  return files.filter((file) => file.startsWith('metadata_') && file.endsWith('.json'));
}

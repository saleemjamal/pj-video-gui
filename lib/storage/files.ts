import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import axios from 'axios';

// Get output directory
export function getOutputPath(): string {
  const customPath = process.env.OUTPUT_PATH;
  if (customPath) {
    return customPath;
  }
  // Default to Desktop/PJ-Social-Content
  return path.join(os.homedir(), 'Desktop', 'PJ-Social-Content');
}

// Create dated folder structure
export async function createOutputFolder(): Promise<string> {
  const basePath = getOutputPath();
  await fs.ensureDir(basePath);

  // Create dated subfolder
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const datePath = path.join(basePath, today);
  await fs.ensureDir(datePath);

  // Create unique subfolder for this generation
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .split('T')
    .join('_')
    .substring(0, 19);
  const generationPath = path.join(datePath, `generation_${timestamp}`);
  await fs.ensureDir(generationPath);

  return generationPath;
}

// Download video from URL
export async function downloadVideo(url: string, outputPath: string, filename: string): Promise<string> {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  const filePath = path.join(outputPath, filename);
  const writer = fs.createWriteStream(filePath);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath));
    writer.on('error', reject);
  });
}

// Save audio buffer to file
export async function saveAudioFile(buffer: Buffer, outputPath: string, filename: string): Promise<string> {
  const filePath = path.join(outputPath, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

// Save base64 image to file
export async function saveImageFile(base64Data: string, outputPath: string, filename: string): Promise<string> {
  const filePath = path.join(outputPath, filename);

  // Remove data URL prefix if present
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Image, 'base64');

  await fs.writeFile(filePath, buffer);
  return filePath;
}

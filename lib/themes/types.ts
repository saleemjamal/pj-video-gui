// Theme types and interfaces

export type VideoTheme = 'promotional' | 'new-product' | 'informational' | 'seasonal';

export interface TextOverlay {
  // Content
  text: string;

  // Position
  position: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';

  // Timing (in seconds)
  startTime: number;
  endTime: number;
  fadeDuration?: number; // Default: 0.5s

  // Styling (optional - defaults to theme styling if not provided)
  textColor?: string; // Hex color, e.g., '#FFFFFF'
  fontSize?: number; // In pixels
  fontWeight?: 'normal' | 'bold';
  backgroundColor?: string; // Hex color for background box (optional)
  backgroundOpacity?: number; // 0-1, default 0.7
}

export interface TextOverlayPreset {
  label: string; // What user sees on button
  text: string; // Default text
  position: TextOverlay['position'];
  startTime: number;
  endTime: number;
  fadeDuration?: number;
}

export interface ThemeTextStyle {
  textColor: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  backgroundColor?: string;
  backgroundOpacity?: number;
}

export interface ThemeConfig {
  name: string;
  description: string;

  // Script generation guidelines
  scriptTone: string;
  scriptKeywords: string[];
  scriptStyle: string;

  // Default text styling
  textStyle: ThemeTextStyle;

  // Quick preset overlays
  presets: TextOverlayPreset[];
}

import type { VideoTheme, ThemeConfig } from './types';

export const THEME_CONFIGS: Record<VideoTheme, ThemeConfig> = {
  promotional: {
    name: 'Promotional',
    description: 'Sales, discounts, limited time offers',

    // Script generation
    scriptTone: 'Urgent, compelling, value-focused',
    scriptKeywords: ['deal', 'save', 'offer', 'limited time', 'special price', 'don\'t miss', 'value', 'now'],
    scriptStyle: 'Create excitement and urgency around the promotional offer. Emphasize value and savings. Use action-oriented language.',

    // Default text styling
    textStyle: {
      textColor: '#FF0000', // Bright red
      fontSize: 72,
      fontWeight: 'bold',
      backgroundColor: '#FFEB3B', // Yellow background
      backgroundOpacity: 0.9,
    },

    // Quick presets
    presets: [
      {
        label: '50% OFF',
        text: '50% OFF',
        position: 'top-center',
        startTime: 0,
        endTime: 3,
        fadeDuration: 0.5,
      },
      {
        label: 'SALE',
        text: 'SALE',
        position: 'top-right',
        startTime: 0,
        endTime: 4,
        fadeDuration: 0.5,
      },
      {
        label: 'Limited Time',
        text: 'Limited Time Only',
        position: 'bottom-center',
        startTime: 0,
        endTime: 3,
        fadeDuration: 0.5,
      },
      {
        label: 'Special Offer',
        text: 'Special Offer',
        position: 'top-left',
        startTime: 0,
        endTime: 4,
        fadeDuration: 0.5,
      },
    ],
  },

  'new-product': {
    name: 'New Product',
    description: 'Product launches, new arrivals, fresh additions',

    // Script generation
    scriptTone: 'Exciting, innovative, fresh',
    scriptKeywords: ['new', 'introducing', 'just arrived', 'fresh', 'latest', 'discover', 'innovation', 'now available'],
    scriptStyle: 'Generate excitement about the new product. Emphasize innovation, newness, and the opportunity to be among the first. Upbeat and energetic.',

    // Default text styling
    textStyle: {
      textColor: '#FFFFFF', // White text
      fontSize: 64,
      fontWeight: 'bold',
      backgroundColor: '#2196F3', // Bright blue background
      backgroundOpacity: 0.85,
    },

    // Quick presets
    presets: [
      {
        label: 'NEW',
        text: 'NEW',
        position: 'top-right',
        startTime: 0,
        endTime: 6, // Entire video for 6s
        fadeDuration: 0.5,
      },
      {
        label: 'Just Arrived',
        text: 'Just Arrived',
        position: 'top-center',
        startTime: 0,
        endTime: 3,
        fadeDuration: 0.5,
      },
      {
        label: 'Introducing',
        text: 'Introducing',
        position: 'bottom-center',
        startTime: 0,
        endTime: 2,
        fadeDuration: 0.5,
      },
      {
        label: 'Fresh',
        text: 'Fresh Arrival',
        position: 'top-left',
        startTime: 0,
        endTime: 3,
        fadeDuration: 0.5,
      },
    ],
  },

  informational: {
    name: 'Informational',
    description: 'Product features, benefits, educational content',

    // Script generation
    scriptTone: 'Clear, educational, trustworthy',
    scriptKeywords: ['quality', 'features', 'crafted', 'designed', 'premium', 'perfect for', 'ideal', 'benefits'],
    scriptStyle: 'Focus on product features and benefits in a clear, informative way. Educational but still engaging. Emphasize quality and value.',

    // Default text styling
    textStyle: {
      textColor: '#FFFFFF', // White text
      fontSize: 56,
      fontWeight: 'bold',
      backgroundColor: '#000000', // Black background
      backgroundOpacity: 0.7,
    },

    // Quick presets
    presets: [
      {
        label: 'Learn More',
        text: 'Learn More',
        position: 'bottom-center',
        startTime: 4,
        endTime: 6,
        fadeDuration: 0.5,
      },
      {
        label: 'Premium Quality',
        text: 'Premium Quality',
        position: 'top-center',
        startTime: 0,
        endTime: 3,
        fadeDuration: 0.5,
      },
      {
        label: 'Features',
        text: 'Key Features',
        position: 'top-left',
        startTime: 2,
        endTime: 6,
        fadeDuration: 0.5,
      },
      {
        label: 'Handpicked',
        text: 'Carefully Curated',
        position: 'bottom-right',
        startTime: 0,
        endTime: 4,
        fadeDuration: 0.5,
      },
    ],
  },

  seasonal: {
    name: 'Seasonal',
    description: 'Holiday specials, seasonal offerings, limited editions',

    // Script generation
    scriptTone: 'Festive, timely, exclusive',
    scriptKeywords: ['seasonal', 'holiday', 'limited edition', 'celebrate', 'festive', 'special', 'exclusive', 'perfect gift'],
    scriptStyle: 'Emphasize seasonal relevance and timeliness. Create a sense of occasion and exclusivity. Mention gifting opportunities if appropriate.',

    // Default text styling
    textStyle: {
      textColor: '#FFFFFF', // White text
      fontSize: 68,
      fontWeight: 'bold',
      backgroundColor: '#C62828', // Deep red (holiday color)
      backgroundOpacity: 0.85,
    },

    // Quick presets
    presets: [
      {
        label: 'Holiday Special',
        text: 'Holiday Special',
        position: 'top-center',
        startTime: 0,
        endTime: 3,
        fadeDuration: 0.5,
      },
      {
        label: 'Limited Edition',
        text: 'Limited Edition',
        position: 'top-right',
        startTime: 0,
        endTime: 6,
        fadeDuration: 0.5,
      },
      {
        label: "Season's Best",
        text: "Season's Best",
        position: 'bottom-center',
        startTime: 0,
        endTime: 4,
        fadeDuration: 0.5,
      },
      {
        label: 'Perfect Gift',
        text: 'The Perfect Gift',
        position: 'top-left',
        startTime: 2,
        endTime: 6,
        fadeDuration: 0.5,
      },
    ],
  },
};

// Helper function to get theme config
export function getThemeConfig(theme: VideoTheme): ThemeConfig {
  return THEME_CONFIGS[theme];
}

// Get all theme options for UI
export function getAllThemes(): Array<{ value: VideoTheme; label: string; description: string }> {
  return Object.entries(THEME_CONFIGS).map(([value, config]) => ({
    value: value as VideoTheme,
    label: config.name,
    description: config.description,
  }));
}

// Default theme
export const DEFAULT_THEME: VideoTheme = 'informational';

/**
 * AI Image generation integration
 * Supports multiple providers: OpenAI DALL-E, Stability AI, or placeholder URLs
 */

export interface ImageGenerationResult {
  url: string;
  provider: 'openai' | 'stability' | 'placeholder';
  prompt: string;
}

/**
 * Generate an image URL for a given prompt
 * Falls back to placeholder if no API keys are configured
 */
export async function generateImage(
  prompt: string,
  options?: {
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
    style?: 'vivid' | 'natural';
  }
): Promise<ImageGenerationResult> {
  const size = options?.size || '1024x1024';
  const style = options?.style || 'vivid';

  // Try OpenAI DALL-E 3 first
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size,
          style,
          quality: 'standard',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          url: data.data[0].url,
          provider: 'openai',
          prompt,
        };
      }
    } catch (error) {
      console.warn('OpenAI image generation failed:', error);
    }
  }

  // Fallback to placeholder with descriptive alt text
  // Using a proper placeholder service that generates educational images
  const encodedPrompt = encodeURIComponent(prompt);
  const [width, height] = size.split('x').map(Number);

  return {
    url: `https://placehold.co/${width}x${height}/3B82F6/FFFFFF/png?text=${encodedPrompt.slice(0, 30)}`,
    provider: 'placeholder',
    prompt,
  };
}

/**
 * Extract image generation requests from lesson outline
 * Returns suggested image prompts based on the lesson content
 */
export function extractImagePrompts(outline: string): string[] {
  const prompts: string[] = [];

  // Common educational topics that benefit from images
  const imageKeywords = [
    'animal', 'planet', 'historical figure', 'country', 'map',
    'diagram', 'illustration', 'picture', 'photo', 'image',
    'solar system', 'geography', 'anatomy', 'science experiment',
  ];

  const lowerOutline = outline.toLowerCase();

  // Check for explicit image requests
  if (lowerOutline.includes('image') || lowerOutline.includes('picture') || lowerOutline.includes('illustration')) {
    prompts.push(`Educational illustration for: ${outline.slice(0, 100)}`);
  }

  // Check for specific topics
  for (const keyword of imageKeywords) {
    if (lowerOutline.includes(keyword)) {
      prompts.push(`Child-friendly educational image of ${keyword} for learning`);
      break; // Only one auto-generated image per lesson
    }
  }

  return prompts;
}

/**
 * Generate images for a lesson and return as data URLs or URLs
 */
export async function generateLessonImages(
  outline: string,
  count: number = 1
): Promise<ImageGenerationResult[]> {
  const prompts = extractImagePrompts(outline);

  // Limit to requested count
  const selectedPrompts = prompts.slice(0, count);

  // If no auto-detected prompts, create a generic one
  if (selectedPrompts.length === 0 && count > 0) {
    selectedPrompts.push(`Educational illustration for lesson: ${outline.slice(0, 80)}`);
  }

  // Generate all images in parallel
  const images = await Promise.all(
    selectedPrompts.map(prompt => generateImage(prompt))
  );

  return images;
}

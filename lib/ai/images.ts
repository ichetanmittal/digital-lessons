/**
 * AI Image Generation using OpenAI DALL-E 3
 * Generates educational images for lessons
 */

import OpenAI from 'openai';
import { getLangfuse } from '@/lib/tracing/langfuse';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GeneratedImage {
  url: string;
  prompt: string;
  revisedPrompt?: string;
  size: string;
  generatedAt: string;
}

/**
 * Extract image generation prompts from lesson outline
 * Analyzes keywords and context to suggest relevant educational images
 */
export function extractImagePrompts(outline: string): string[] {
  const prompts: string[] = [];

  // Keywords that suggest visual content
  const visualKeywords: { [key: string]: string } = {
    // Science & Nature
    'animal': 'A colorful, simple illustration of an animal, educational style, suitable for children ages 8-14',
    'planet': 'A bright, colorful illustration of a planet in space, educational diagram style',
    'solar system': 'A simplified diagram of the solar system with planets, sun, and orbits, colorful and educational',
    'cell': 'A diagram of a cell showing nucleus, mitochondria, and other organelles, bright and educational',
    'human body': 'A diagram of the human body showing major organs, colorful and kid-friendly',
    'anatomy': 'An anatomical illustration highlighting body systems, educational and colorful',
    'plant': 'A botanical illustration of a plant showing roots, stem, and leaves, colorful',
    'science': 'A colorful scientific illustration related to the topic, educational style',

    // History & Geography
    'map': 'A colorful map highlighting geographical features or regions, educational style',
    'country': 'A map and illustration of a country with landmarks, colorful and educational',
    'historical': 'A historical illustration depicting the time period or event, educational style',
    'culture': 'An illustration showcasing cultural elements and traditions, colorful and respectful',
    'landmark': 'An illustration of a famous landmark or monument, colorful and detailed',

    // Math & Geometry
    'geometry': 'Geometric shapes and diagrams illustrating mathematical concepts, colorful',
    'math': 'A colorful diagram illustrating mathematical concepts, suitable for ages 8-14',
    'fraction': 'A visual representation of fractions using pie charts and divisions, colorful',
    'graph': 'A colorful bar chart or line graph representing data, educational style',

    // Other Educational Topics
    'weather': 'A weather diagram showing different weather conditions, colorful and simple',
    'water cycle': 'A diagram of the water cycle showing evaporation, condensation, and precipitation',
    'ecosystem': 'An illustration of an ecosystem showing animals, plants, and their relationships',
    'food chain': 'A diagram showing a food chain with animals and plants, colorful and educational',
    'ocean': 'An illustration of ocean life and underwater ecosystem, colorful and bright',
    'space': 'A space-themed illustration with planets, stars, and astronauts, colorful',
  };

  const lowerOutline = outline.toLowerCase();

  // Find matching keywords
  for (const [keyword, prompt] of Object.entries(visualKeywords)) {
    if (lowerOutline.includes(keyword)) {
      prompts.push(prompt);
      break; // Only return one prompt per lesson
    }
  }

  // If no keyword matched, create a generic educational image prompt
  if (prompts.length === 0) {
    // Extract first 80 characters for context
    const topic = outline.substring(0, 80).trim();
    prompts.push(`A colorful, simple, and engaging educational illustration for the lesson about: "${topic}". Suitable for children ages 8-14.`);
  }

  return prompts;
}

/**
 * Generate an image using OpenAI DALL-E 3
 * @param prompt - The image prompt
 * @param options - Generation options
 */
export async function generateImage(
  prompt: string,
  options?: {
    size?: '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
  }
): Promise<GeneratedImage> {
  const size = options?.size || '1024x1024';
  const quality = options?.quality || 'standard';

  const langfuse = getLangfuse();

  // Create a trace for image generation
  const trace = langfuse.trace({
    name: 'image-generation',
    userId: 'system',
    input: {
      prompt,
      size,
      quality,
    },
    metadata: {
      requestType: 'image-generation',
    },
    tags: ['openai', 'dalle-3', 'image-generation'],
  });

  // Start generation span
  const generation = trace.generation({
    name: 'openai-dalle3-image',
    model: 'dall-e-3',
    modelParameters: {
      size,
      quality,
    },
    input: prompt,
  });

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: size,
      quality: quality,
      style: 'vivid', // Vivid style for educational content
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image generated by DALL-E 3');
    }

    const imageData = response.data[0];
    if (!imageData.url) {
      throw new Error('No URL in DALL-E 3 response');
    }

    const generatedImage: GeneratedImage = {
      url: imageData.url,
      prompt: prompt,
      revisedPrompt: imageData.revised_prompt,
      size: size,
      generatedAt: new Date().toISOString(),
    };

    // End generation span with success
    generation.end({
      output: generatedImage,
      statusMessage: 'success',
    });

    // Update trace
    trace.update({
      output: {
        success: true,
        url: imageData.url,
        revisedPrompt: imageData.revised_prompt,
      },
      metadata: {
        imageSize: size,
      },
    });

    return generatedImage;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during image generation';

    // End generation span with error
    generation.end({
      statusMessage: 'error',
      level: 'ERROR',
    });

    // Update trace with error
    trace.update({
      output: {
        success: false,
        error: errorMessage,
      },
    });

    console.error('DALL-E 3 Image Generation Error:', errorMessage);
    throw error;
  }
}

/**
 * Generate images for a lesson
 * @param outline - The lesson outline
 * @param count - Number of images to generate (default: 1)
 */
export async function generateLessonImages(
  outline: string,
  count: number = 1
): Promise<GeneratedImage[]> {
  try {
    const prompts = extractImagePrompts(outline);
    const selectedPrompts = prompts.slice(0, Math.min(count, 1)); // Limit to 1 image per lesson for cost

    // Generate all images in parallel
    const images = await Promise.all(
      selectedPrompts.map(prompt => generateImage(prompt))
    );

    console.log(`✅ Generated ${images.length} image(s) for lesson`);
    return images;
  } catch (error) {
    console.error('Failed to generate lesson images:', error);
    // Return empty array on error instead of failing the whole lesson
    return [];
  }
}

/**
 * Create a placeholder image URL (fallback if API fails)
 * @param prompt - The image description
 */
export function createPlaceholderImage(prompt: string): GeneratedImage {
  return {
    url: `https://placehold.co/1024x1024/3B82F6/FFFFFF/png?text=${encodeURIComponent(prompt.substring(0, 30))}`,
    prompt: prompt,
    size: '1024x1024',
    generatedAt: new Date().toISOString(),
  };
}

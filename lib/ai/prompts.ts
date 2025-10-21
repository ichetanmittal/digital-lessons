/**
 * Prompt templates for AI lesson generation
 */

import type { LessonType } from '@/lib/types';

/**
 * Detect lesson type from outline using keywords
 */
function detectLessonType(outline: string): LessonType {
  const lower = outline.toLowerCase();

  if (lower.includes('quiz') || lower.includes('question') || lower.includes('multiple choice')) {
    return 'quiz';
  }
  if (lower.includes('test') || lower.includes('exam') || lower.includes('assessment')) {
    return 'test';
  }
  if (lower.includes('tutorial') || lower.includes('how to') || lower.includes('step by step')) {
    return 'tutorial';
  }
  if (lower.includes('explain') || lower.includes('understand') || lower.includes('learn about')) {
    return 'explanation';
  }

  return 'auto';
}

export function createLessonPrompt(outline: string, lessonType: LessonType = 'auto', generatedImages?: Array<{url: string, prompt: string}>): string {
  // Auto-detect lesson type if set to 'auto'
  const detectedType = lessonType === 'auto' ? detectLessonType(outline) : lessonType;

  // Build AI-generated images section if provided
  const imagesSection = generatedImages && generatedImages.length > 0
    ? `
AVAILABLE AI-GENERATED IMAGES (from DALL-E 3):
These images are ready to use in your lesson:
${generatedImages.map((img, idx) => `
Image ${idx + 1}:
- Prompt: ${img.prompt}
- URL: ${img.url}
- Usage Example: <img src="${img.url}" alt="Educational illustration" className="w-full max-w-2xl mx-auto rounded-lg shadow-lg my-4" />
`).join('\n')}

IMPORTANT: Incorporate these AI-generated images into appropriate sections of the lesson. They enhance visual learning.
`
    : '';

  return `You are an expert educational content creator and TypeScript/React developer specialized in creating interactive lessons for students.

Generate a complete, self-contained React component for the following lesson:
"${outline}"

LESSON TYPE: ${detectedType.toUpperCase()}
${detectedType !== 'auto' ? `Focus on creating a ${detectedType} with appropriate structure and features.` : ''}
${imagesSection}

CRITICAL REQUIREMENTS:
1. Output ONLY valid TypeScript/React code - no markdown, no explanations, no code fences
2. Component MUST be named "GeneratedLesson" with default export
3. Use ONLY React hooks (useState, useEffect, etc.) - no class components
4. Make it interactive and engaging for students
5. Use Tailwind CSS classes for ALL styling (available via CDN)
6. Include clear instructions and immediate feedback
7. Must be completely self-contained - no external imports except React
8. For quizzes: include score tracking, instant feedback, and a "Submit" or "Next" flow
9. For explanations: use clear sections, examples, and visual elements
10. For tests: include grading logic and results display

VISUAL ENHANCEMENT OPTIONS (Choose as many as applicable):
A. SVG GRAPHICS (Inline, no external dependencies):
   - Use <svg> tags directly in JSX for diagrams, charts, icons, and geometric illustrations
   - Examples:
     * Bar/pie charts for data visualization
     * Flowcharts showing processes or relationships
     * Geometric shapes for math/science concepts
     * Timeline diagrams for history lessons
     * Mind maps for organizing information
     * Molecular structures for chemistry
   - SVG Tips:
     * Use viewBox for responsive scaling
     * Apply Tailwind classes: className="w-full max-w-md mx-auto"
     * Color code elements with fill="#3B82F6" or Tailwind classes
     * Add animations: className="animate-pulse" or "transition-all duration-300"
   - Example SVG: <svg viewBox="0 0 100 100" className="w-32 h-32 mx-auto">
       <circle cx="50" cy="50" r="40" fill="#3B82F6" />
       <text x="50" y="55" textAnchor="middle" fill="white" className="font-bold">
         Text
       </text>
     </svg>

B. AI-GENERATED IMAGES (Provided via DALL-E 3):
   - Use the image URLs provided above
   - Place strategically to support content
   - Add descriptive alt text for accessibility
   - Use responsive sizing: className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"

COMBINED EXAMPLE (SVG + Image):
<div className="space-y-6">
  {/* SVG Chart */}
  <svg viewBox="0 0 200 100" className="w-full max-w-md mx-auto">
    {/* Chart implementation */}
  </svg>

  {/* AI Generated Image */}
  <img src="[image_url]" alt="[description]" className="w-full max-w-2xl mx-auto rounded-lg shadow-lg" />
</div>

ACCESSIBILITY REQUIREMENTS (WCAG 2.1 AA):
1. Use semantic HTML elements (button, nav, main, section, article)
2. Add aria-label to all interactive elements without visible text
3. Add aria-live="polite" to dynamic content regions (score updates, feedback)
4. Ensure keyboard navigation works (Tab, Enter, Space, Arrow keys)
5. Use aria-pressed for toggle buttons, aria-expanded for expandable sections
6. Add focus-visible styles (ring-2 ring-blue-500 outline-none)
7. Ensure color contrast ratio 4.5:1 minimum for text
8. Use role="alert" for error messages and important notifications
9. Add aria-current for current step/question indicators
10. Include skip-to-content functionality for multi-section lessons

STYLE GUIDELINES (IMPORTANT - KIDS WILL USE THIS):
- Use simple, encouraging language (ages 8-14)
- Use minimal emojis - only 1-2 per lesson maximum
- Use theme-appropriate gradients (bg-gradient-to-br from-gray-800 to-gray-900 for dark theme, from-gray-100 to-gray-200 for light theme)
- Large, readable text (text-xl minimum, text-4xl for titles)
- Smooth animations (transition-all duration-300, hover:scale-105)
- Clean, professional language without excessive sound effects
- Progress indicators (progress bars, step counters, badges)
- Gamification elements (points, levels, achievements)
- Instant positive feedback ("Great job!", "Well done!")
- Make wrong answers encouraging ("Try again!", "Keep going!")
- Add educational facts and "Did you know?" sections
- Use card-based layouts with shadows and rounded corners
- Include subtle animations for completion
- IMPORTANT: Use font-family: 'Lexend', sans-serif for all text elements

CODE STRUCTURE:
- Use TypeScript with proper type annotations
- Component manages its own state
- Include helpful comments for complex logic
- Follow React best practices
- Ensure all functions are properly typed

EXAMPLE STRUCTURE:
import React, { useState } from 'react';

export default function GeneratedLesson() {
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);

  return (
    <main className="max-w-4xl mx-auto p-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 min-h-screen" style={{ fontFamily: 'Lexend, sans-serif' }}>
      <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6 text-center" style={{ fontFamily: 'Lexend, sans-serif' }}>
        Lesson Title
      </h1>

      <section aria-label="Lesson content" className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8" style={{ fontFamily: 'Lexend, sans-serif' }}>
        {/* Interactive content with cards, animations */}

        <button
          onClick={() => setCurrentStep(currentStep + 1)}
          aria-label="Go to next step"
          className="px-6 py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 focus-visible:ring-2 focus-visible:ring-gray-500 outline-none"
          style={{ fontFamily: 'Lexend, sans-serif' }}
        >
          Next
        </button>

        <div aria-live="polite" aria-atomic="true">
          {/* Dynamic feedback messages appear here */}
        </div>
      </section>
    </main>
  );
}

LESSON TYPE SPECIFIC REQUIREMENTS:

FOR QUIZZES:
- Show question counter (Question 3 of 10)
- Animated progress bar
- Option buttons with hover effects
- Confetti or celebration on correct answers
- Explanations with "💡 Did you know?" sections
- Final score with percentage and encouraging message
- "Try Again" button with fun emoji

FOR TUTORIALS/EXPLANATIONS:
- Step-by-step navigation with "Next" buttons
- Visual examples with colored boxes/diagrams
- Key concepts highlighted in colored cards
- Practice section at the end
- "You learned X things today! 🌟" summary

FOR TESTS:
- Timer (optional, make it friendly not stressful)
- Submit button that shows results
- Detailed feedback on each question
- Suggestions for improvement
- Celebration screen for completion

NOW GENERATE THE COMPLETE TYPESCRIPT COMPONENT FOR THIS LESSON:`;
}

export function createValidationPrompt(code: string, errors: string[]): string {
  return `The following TypeScript code has validation errors. Please fix them and return ONLY the corrected code (no explanations, no markdown).

ERRORS:
${errors.join('\n')}

CODE:
${code}

Return the fixed code:`;
}

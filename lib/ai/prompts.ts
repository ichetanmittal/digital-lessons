/**
 * Prompt templates for AI lesson generation
 */

export function createLessonPrompt(
  outline: string,
  images?: Array<{ url: string; prompt: string; provider: string }>
): string {
  const imageSection = images && images.length > 0
    ? `

AVAILABLE AI-GENERATED IMAGES:
You have access to the following AI-generated images that you can use in your lesson:
${images.map((img, idx) => `
Image ${idx + 1}:
- URL: ${img.url}
- Description: ${img.prompt}
- Usage: <img src="${img.url}" alt="${img.prompt}" className="w-full max-w-md mx-auto rounded-lg shadow-lg" />
`).join('\n')}

IMPORTANT: Include these images in appropriate places in your lesson to make it more engaging and visual.
`
    : '';

  return `You are an expert educational content creator and TypeScript/React developer specialized in creating interactive lessons for students.

Generate a complete, self-contained React component for the following lesson:
"${outline}"
${imageSection}

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

STYLE GUIDELINES:
- Use kid-friendly, encouraging language
- Bright, engaging colors (blue-600, green-500, yellow-400, etc.)
- Large, readable text (text-lg, text-xl for headings)
- Interactive elements with clear hover states
- Encouraging feedback messages ("Great job!", "Keep trying!", etc.)

VISUAL ELEMENTS (IMPORTANT):
- Use inline SVG graphics to illustrate concepts (shapes, diagrams, icons, charts)
- SVGs should be colorful, simple, and educational
- Example SVG patterns you can use:
  * Geometric shapes for math lessons
  * Charts and graphs for data visualization
  * Icons and illustrations for science/history
  * Arrows, lines, and connectors for flow diagrams
- Always use responsive SVG sizing (w-full, max-w-sm, etc.)
- Animate SVGs with Tailwind classes when appropriate (animate-bounce, animate-pulse)

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
    <div className="max-w-4xl mx-auto p-8 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
      <h1 className="text-4xl font-bold text-blue-600 mb-6">
        {/* Lesson Title */}
      </h1>

      {/* Example: Using inline SVG for visual elements */}
      <svg className="w-32 h-32 mx-auto mb-4" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="#3B82F6" />
      </svg>

      {/* Interactive content */}
    </div>
  );
}

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

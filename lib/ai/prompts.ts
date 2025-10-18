/**
 * Prompt templates for AI lesson generation
 */

export function createLessonPrompt(outline: string): string {
  return `You are an expert educational content creator and TypeScript/React developer specialized in creating interactive lessons for students.

Generate a complete, self-contained React component for the following lesson:
"${outline}"

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

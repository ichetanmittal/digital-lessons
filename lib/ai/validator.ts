/**
 * TypeScript code validation to ensure AI-generated code is safe and valid
 * Note: We do lightweight validation here since Sandpack will handle full compilation
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  code?: string;
}

/**
 * Validate TypeScript/React code for safety and correctness
 */
export function validateTypeScriptCode(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check for required elements
  if (!code.includes('export default')) {
    errors.push('Missing default export - component must have "export default function GeneratedLesson()"');
  }

  if (!code.includes('import React')) {
    errors.push('Missing React import - add "import React from \'react\';"');
  }

  if (!code.includes('function GeneratedLesson') && !code.includes('const GeneratedLesson')) {
    warnings.push('Component should be named "GeneratedLesson" for consistency');
  }

  // 2. Check for dangerous patterns (SECURITY)
  const dangerousPatterns = [
    { pattern: /eval\s*\(/g, message: 'eval() is not allowed' },
    { pattern: /Function\s*\(/g, message: 'Function() constructor is not allowed' },
    { pattern: /document\.cookie/g, message: 'Accessing document.cookie is not allowed' },
    { pattern: /localStorage\.clear/g, message: 'localStorage.clear() is not allowed' },
    { pattern: /sessionStorage\.clear/g, message: 'sessionStorage.clear() is not allowed' },
    { pattern: /window\.location\s*=/g, message: 'Redirecting via window.location is not allowed' },
    { pattern: /<script/gi, message: 'Script tags are not allowed' },
    { pattern: /dangerouslySetInnerHTML/g, message: 'dangerouslySetInnerHTML is not recommended' },
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(code)) {
      errors.push(`Security: ${message}`);
    }
  }

  // 3. Check for basic React structure
  if (!code.includes('return')) {
    errors.push('Component must have a return statement');
  }

  if (!code.match(/<div|<main|<section|<article|<>/)) {
    warnings.push('Component should return JSX elements');
  }

  // 4. Basic syntax checks (without full TS compilation)

  // Check for unmatched braces
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push('Unmatched braces - check your code syntax');
  }

  // Check for unmatched parentheses
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push('Unmatched parentheses - check your code syntax');
  }

  // Check for common syntax errors
  if (code.includes('import React') && !code.includes('from')) {
    errors.push('Invalid import statement - missing "from"');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    code: errors.length === 0 ? code : undefined,
  };
}

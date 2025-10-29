/**
 * TypeScript code validation using actual TypeScript parser
 * Uses TypeScript compiler API for proper syntax validation
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  code?: string;
}

/**
 * Parse and validate TypeScript/React code using TypeScript compiler
 * This provides accurate syntax checking without relying on fragile regex patterns
 */
export function validateTypeScriptCode(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Attempt to parse with TypeScript compiler
    // This validates syntax without executing the code
    validateSyntaxWithTypeScript(code, errors);
  } catch (parseError) {
    errors.push(`Syntax error: ${parseError instanceof Error ? parseError.message : 'Failed to parse code'}`);
  }

  // 1. Check for required elements (semantic validation)
  if (!code.includes('export default')) {
    errors.push('Missing default export - component must have "export default function GeneratedLesson()"');
  }

  if (!code.includes('import React')) {
    errors.push('Missing React import - add "import React from \'react\';"');
  }

  if (!code.includes('function GeneratedLesson') && !code.includes('const GeneratedLesson')) {
    warnings.push('Component should be named "GeneratedLesson" for consistency');
  }

  // 2. Check for dangerous patterns (SECURITY) - only in string/comment-aware contexts
  const dangerousPatterns = [
    { pattern: /eval\s*\(/g, message: 'eval() is not allowed', contexts: ['code'] },
    { pattern: /Function\s*\(/g, message: 'Function() constructor is not allowed', contexts: ['code'] },
    { pattern: /document\.cookie/g, message: 'Accessing document.cookie is not allowed', contexts: ['code'] },
    { pattern: /localStorage\.clear/g, message: 'localStorage.clear() is not allowed', contexts: ['code'] },
    { pattern: /sessionStorage\.clear/g, message: 'sessionStorage.clear() is not allowed', contexts: ['code'] },
    { pattern: /window\.location\s*=/g, message: 'Redirecting via window.location is not allowed', contexts: ['code'] },
    { pattern: /<script/gi, message: 'Script tags are not allowed', contexts: ['jsx'] },
    { pattern: /dangerouslySetInnerHTML/g, message: 'dangerouslySetInnerHTML is not recommended', contexts: ['jsx'] },
  ];

  // Check dangerous patterns only outside strings and comments
  const codeWithoutStrings = removeStringsAndComments(code);
  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(codeWithoutStrings)) {
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

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    code: errors.length === 0 ? code : undefined,
  };
}

/**
 * Parse TypeScript code using the TypeScript compiler
 * This provides accurate syntax validation
 */
function validateSyntaxWithTypeScript(code: string, errors: string[]): void {
  try {
    // Dynamically import typescript to avoid bundling issues
    // eslint-disable-next-line global-require,@typescript-eslint/no-var-requires
    const ts: typeof import('typescript') = require('typescript');

    // Create a source file and check for parsing errors
    const sourceFile = ts.createSourceFile(
      'generated.tsx',
      code,
      ts.ScriptTarget.Latest,
      true // setParentNodes
    );

    // Create a minimal CompilerHost for the program with proper compiler options
    const compilerHost: Partial<import('typescript').CompilerHost> = {
      getSourceFile: (fileName: string) => (fileName === 'generated.tsx' ? sourceFile : undefined),
      writeFile: () => {
        /* no-op */
      },
      getCurrentDirectory: () => '',
      getDirectories: () => [],
      fileExists: () => true,
      readFile: () => '',
      getCanonicalFileName: (fileName: string) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      getDefaultLibFileName: () => '',
    };

    // Compiler options configured for React/JSX
    const compilerOptions: import('typescript').CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      lib: [], // Skip lib checking to avoid missing lib.d.ts errors
      skipLibCheck: true,
      noEmit: true,
    };

    // Check for syntax errors only (skip type-checking errors from missing libs)
    const program = ts.createProgram(
      ['generated.tsx'],
      compilerOptions,
      compilerHost as import('typescript').CompilerHost
    );

    const diagnostics = program.getSyntacticDiagnostics(sourceFile);

    // Extract only real syntax errors, filter out lib-related errors
    for (const diagnostic of diagnostics) {
      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

        // Skip library-related errors (we don't have lib.d.ts in this context)
        if (
          !message.includes('Cannot find global type') &&
          !message.includes('Cannot find name') &&
          !message.includes("Cannot find module 'react'") &&
          !message.includes("File 'lib.d.ts' not found")
        ) {
          errors.push(`TypeScript: ${message}`);
        }
      }
    }
  } catch (err) {
    // If TypeScript parsing fails, fall back to manual validation
    // This could happen in certain environments
    console.warn('TypeScript parser unavailable, using fallback validation:', err);
    validateSyntaxManual(code, errors);
  }
}

/**
 * Fallback manual syntax validation when TypeScript parser is unavailable
 * Uses proper bracket/parenthesis matching algorithm instead of simple counting
 */
function validateSyntaxManual(code: string, errors: string[]): void {
  const codeWithoutStrings = removeStringsAndComments(code);

  // Check for unmatched braces using a stack
  const braceStack: Array<{ char: string; line: number }> = [];
  let lineNum = 1;

  for (let i = 0; i < codeWithoutStrings.length; i++) {
    const char = codeWithoutStrings[i];

    if (char === '\n') {
      lineNum++;
    }

    if (char === '{') {
      braceStack.push({ char: '{', line: lineNum });
    } else if (char === '}') {
      if (braceStack.length === 0 || braceStack[braceStack.length - 1].char !== '{') {
        errors.push(`Unmatched closing brace at line ${lineNum}`);
        return;
      }
      braceStack.pop();
    }
  }

  if (braceStack.length > 0) {
    errors.push(`Unmatched opening brace at line ${braceStack[braceStack.length - 1].line}`);
  }

  // Check for unmatched parentheses
  const parenStack: Array<{ char: string; line: number }> = [];
  lineNum = 1;

  for (let i = 0; i < codeWithoutStrings.length; i++) {
    const char = codeWithoutStrings[i];

    if (char === '\n') {
      lineNum++;
    }

    if (char === '(') {
      parenStack.push({ char: '(', line: lineNum });
    } else if (char === ')') {
      if (parenStack.length === 0 || parenStack[parenStack.length - 1].char !== '(') {
        errors.push(`Unmatched closing parenthesis at line ${lineNum}`);
        return;
      }
      parenStack.pop();
    }
  }

  if (parenStack.length > 0) {
    errors.push(`Unmatched opening parenthesis at line ${parenStack[parenStack.length - 1].line}`);
  }
}

/**
 * Remove strings and comments from code to avoid false positives
 * Handles single quotes, double quotes, template literals, and both comment types
 */
function removeStringsAndComments(code: string): string {
  let result = '';
  let i = 0;

  while (i < code.length) {
    // Handle single-line comments
    if (code[i] === '/' && code[i + 1] === '/') {
      // Skip until end of line
      while (i < code.length && code[i] !== '\n') {
        i++;
      }
      result += '\n'; // Keep line breaks
      continue;
    }

    // Handle multi-line comments
    if (code[i] === '/' && code[i + 1] === '*') {
      // Skip until */
      i += 2;
      while (i < code.length - 1) {
        if (code[i] === '*' && code[i + 1] === '/') {
          i += 2;
          break;
        }
        if (code[i] === '\n') {
          result += '\n'; // Keep line breaks
        }
        i++;
      }
      continue;
    }

    // Handle double-quoted strings
    if (code[i] === '"') {
      result += ' '; // Replace string content with space
      i++;
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\') {
          i += 2;
        } else {
          i++;
        }
      }
      i++; // Skip closing quote
      continue;
    }

    // Handle single-quoted strings
    if (code[i] === "'") {
      result += ' '; // Replace string content with space
      i++;
      while (i < code.length && code[i] !== "'") {
        if (code[i] === '\\') {
          i += 2;
        } else {
          i++;
        }
      }
      i++; // Skip closing quote
      continue;
    }

    // Handle template literals
    if (code[i] === '`') {
      result += ' '; // Replace template content with space
      i++;
      while (i < code.length && code[i] !== '`') {
        if (code[i] === '\\') {
          i += 2;
        } else if (code[i] === '\n') {
          result += '\n'; // Keep line breaks
          i++;
        } else {
          i++;
        }
      }
      i++; // Skip closing backtick
      continue;
    }

    // Regular character
    result += code[i];
    i++;
  }

  return result;
}

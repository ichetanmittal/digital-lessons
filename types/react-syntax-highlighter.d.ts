declare module 'react-syntax-highlighter' {
  import { ReactNode } from 'react';

  interface SyntaxHighlighterProps {
    children: string;
    language?: string;
    style?: Record<string, CSSProperties>;
    customStyle?: React.CSSProperties;
    codeTagProps?: React.HTMLAttributes<HTMLElement>;
    lineProps?: Record<string, unknown>;
    wrapLines?: boolean;
    showLineNumbers?: boolean;
    lineNumberStyle?: React.CSSProperties;
    startingLineNumber?: number;
    useInlineStyles?: boolean;
    PreTag?: React.ComponentType<any>;
    CodeTag?: React.ComponentType<any>;
    [key: string]: any;
  }

  export interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  export default function SyntaxHighlighter(
    props: SyntaxHighlighterProps
  ): JSX.Element;
}

declare module 'react-syntax-highlighter/dist/esm/styles/hljs' {
  export const atomOneDark: Record<string, Record<string, string>>;
}

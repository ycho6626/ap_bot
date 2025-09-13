'use client';

import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Math, InlineMath, DisplayMath } from './katex/Math';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Helper to safely join children and get a string
const joinChildren = (children: React.ReactNode): string => {
  const result = React.Children.toArray(children).join('');
  return result || '';
};

// Custom components for react-markdown
const components: Components = {
  // Handle inline math with $...$ syntax
  p: ({ children, ...props }) => {
    // Check if the paragraph contains only math
    const text = joinChildren(children);
    if (text?.match(/^\$.*\$$/)) {
      // @ts-expect-error - text is guaranteed to be a string after the checks above
      return <Math content={text} displayMode={false} {...props} />;
    }
    return <p {...props}>{children}</p>;
  },

  // Handle code blocks that might contain math
  code: ({ children, ...props }) => {
    const code = joinChildren(children);
    const inline = (props as { inline?: boolean }).inline;

    if (inline) {
      // Check if it's inline math
      if (code?.match(/^\$.*\$$/)) {
        // @ts-expect-error - code is guaranteed to be a string after the checks above
        return <InlineMath content={code} {...props} />;
      }
      return <code {...props}>{children}</code>;
    }

    // Check if it's a math block (starts with $$ or contains LaTeX)
    if (code && (code.match(/^\$\$/) ?? code.match(/\\begin\{/))) {
      // @ts-expect-error - code is guaranteed to be a string after the checks above
      return <DisplayMath content={code} {...props} />;
    }

    return <code {...props}>{children}</code>;
  },

  // Handle pre blocks that might contain math
  pre: ({ children, ...props }) => {
    const text = joinChildren(children);

    // Check if it's a math block
    if (text && (text.match(/^\$\$/) ?? text.match(/\\begin\{/))) {
      // @ts-expect-error - text is guaranteed to be a string after the checks above
      return <DisplayMath content={text} {...props} />;
    }

    return <pre {...props}>{children}</pre>;
  },
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Enhanced markdown renderer that specifically handles math content
 * This version processes the content to extract and render math expressions
 */
export function MathMarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Process content to handle math expressions
  const processedContent = content
    // Handle inline math $...$
    .replace(/\$([^$]+)\$/g, (match, _math) => {
      return `\`${match}\``;
    })
    // Handle display math $$...$$
    .replace(/\$\$([^$]+)\$\$/g, (match, _math) => {
      return `\`\`\`\n${match}\n\`\`\``;
    });

  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

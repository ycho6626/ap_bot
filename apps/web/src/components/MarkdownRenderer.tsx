'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Math, InlineMath, DisplayMath } from './katex/Math';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Custom components for react-markdown
const components = {
  // Handle inline math with $...$ syntax
  p: ({ children, ...props }: any) => {
    // Check if the paragraph contains only math
    const text = React.Children.toArray(children).join('');
    if (text.match(/^\$.*\$$/)) {
      return <Math content={text} displayMode={false} {...props} />;
    }
    return <p {...props}>{children}</p>;
  },
  
  // Handle code blocks that might contain math
  code: ({ inline, children, ...props }: any) => {
    const code = React.Children.toArray(children).join('');
    
    if (inline) {
      // Check if it's inline math
      if (code.match(/^\$.*\$$/)) {
        return <InlineMath content={code} {...props} />;
      }
      return <code {...props}>{children}</code>;
    }
    
    // Check if it's a math block (starts with $$ or contains LaTeX)
    if (code.match(/^\$\$/) || code.match(/\\begin\{/)) {
      return <DisplayMath content={code} {...props} />;
    }
    
    return <code {...props}>{children}</code>;
  },
  
  // Handle pre blocks that might contain math
  pre: ({ children, ...props }: any) => {
    const text = React.Children.toArray(children).join('');
    
    // Check if it's a math block
    if (text.match(/^\$\$/) || text.match(/\\begin\{/)) {
      return <DisplayMath content={text} {...props} />;
    }
    
    return <pre {...props}>{children}</pre>;
  },
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
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
    .replace(/\$([^$]+)\$/g, (match, math) => {
      return `\`${match}\``;
    })
    // Handle display math $$...$$
    .replace(/\$\$([^$]+)\$\$/g, (match, math) => {
      return `\`\`\`\n${match}\n\`\`\``;
    });

  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

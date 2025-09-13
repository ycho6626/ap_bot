'use client';

import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface KaTeXRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders content with KaTeX math support
 * Detects LaTeX math expressions and renders them appropriately
 */
export function KaTeXRenderer({ content, className = '' }: KaTeXRendererProps) {
  // Simple regex to detect LaTeX math expressions
  const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
  const inlineMathRegex = /\$([^$]+?)\$/g;

  // Split content by block math expressions
  const parts = content.split(blockMathRegex);

  const renderPart = (part: string, index: number) => {
    // Check if this part is a math expression (odd indices in split result)
    if (index % 2 === 1) {
      try {
        return <BlockMath key={index} math={part} />;
      } catch (error) {
        console.warn('Failed to render block math:', part, error);
        return (
          <code key={index} className='bg-red-100 text-red-800 px-1 rounded'>
            ${part}$
          </code>
        );
      }
    }

    // Render inline math expressions in regular text
    const inlineParts = part.split(inlineMathRegex);
    return inlineParts.map((inlinePart, inlineIndex) => {
      if (inlineIndex % 2 === 1) {
        try {
          return <InlineMath key={`${index}-${inlineIndex}`} math={inlinePart} />;
        } catch (error) {
          console.warn('Failed to render inline math:', inlinePart, error);
          return (
            <code key={`${index}-${inlineIndex}`} className='bg-red-100 text-red-800 px-1 rounded'>
              ${inlinePart}$
            </code>
          );
        }
      }
      return <span key={`${index}-${inlineIndex}`}>{inlinePart}</span>;
    });
  };

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {parts.map((part, index) => renderPart(part, index))}
    </div>
  );
}

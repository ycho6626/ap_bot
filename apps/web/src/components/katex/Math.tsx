'use client';

import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { cn } from '@/lib/utils';
import { reportError, reportWarning } from '@/lib/logging';

interface MathProps {
  content: string;
  className?: string;
  displayMode?: boolean;
  errorFallback?: boolean;
}

export function Math({
  content,
  className = '',
  displayMode = false,
  errorFallback = true,
}: MathProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side to avoid hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isClient) return;

    const container = containerRef.current;
    container.innerHTML = '';
    setError(null);

    try {
      // Split content by LaTeX expressions
      const latexRegex = /\$([^$]+)\$|\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g;
      const parts = content.split(latexRegex);
      const matches = content.match(latexRegex) ?? [];

      let partIndex = 0;
      let matchIndex = 0;

      while (partIndex < parts.length) {
        // Add text content
        if (parts[partIndex]) {
          const textSpan = document.createElement('span');
          textSpan.textContent = parts[partIndex] ?? '';
          textSpan.className = 'katex-text';
          container.appendChild(textSpan);
        }

        // Add LaTeX content
        if (matchIndex < matches.length) {
          const latexContent = matches[matchIndex];
          if (latexContent) {
            const isInline = latexContent.startsWith('$') && latexContent.endsWith('$');
            const latexText = isInline ? latexContent.slice(1, -1) : latexContent;

            try {
              const rendered = katex.renderToString(latexText, {
                displayMode: displayMode ?? !isInline,
                throwOnError: false,
                strict: false,
                trust: true,
                fleqn: false,
                leqno: false,
              });

              const latexSpan = document.createElement('span');
              latexSpan.innerHTML = rendered;
              latexSpan.className = cn(
                isInline ? 'katex-inline' : 'katex-display',
                'katex-rendered'
              );
              container.appendChild(latexSpan);
            } catch (katexError) {
              reportWarning('KaTeX rendering error:', katexError);
              if (errorFallback) {
                const fallbackSpan = document.createElement('span');
                fallbackSpan.textContent = latexContent;
                fallbackSpan.className =
                  'katex-error text-red-600 bg-red-50 px-1 py-0.5 rounded text-sm';
                container.appendChild(fallbackSpan);
              } else {
                setError(`LaTeX rendering error: ${katexError}`);
              }
            }
          }

          matchIndex++;
        }

        partIndex++;
      }
    } catch (error) {
      reportError('Math component error:', error);
      if (errorFallback) {
        setError('Failed to render mathematical content');
      }
    }
  }, [content, displayMode, errorFallback, isClient]);

  if (error) {
    return (
      <div className={cn('katex-error-container', className)}>
        <div className='text-red-600 bg-red-50 border border-red-200 rounded p-2 text-sm'>
          {error}
        </div>
      </div>
    );
  }

  // Show loading state during SSR to prevent hydration mismatches
  if (!isClient) {
    return (
      <div className={cn('katex-container', className)}>
        <span className='text-gray-500'>Loading math...</span>
      </div>
    );
  }

  return <div ref={containerRef} className={cn('katex-container', className)} />;
}

/**
 * Inline math component for use within text
 */
export function InlineMath({ content, className }: { content: string; className?: string }) {
  return <Math content={content} className={className ?? ''} displayMode={false} />;
}

/**
 * Display math component for standalone equations
 */
export function DisplayMath({ content, className }: { content: string; className?: string }) {
  return <Math content={content} className={className ?? ''} displayMode={true} />;
}

/**
 * Math block component that handles both inline and display math
 */
export function MathBlock({ content, className }: { content: string; className?: string }) {
  return <Math content={content} className={className ?? ''} displayMode={true} />;
}

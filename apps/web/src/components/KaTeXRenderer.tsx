'use client';

import { useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

interface KaTeXRendererProps {
  content: string;
  className?: string;
  displayMode?: boolean;
}

export function KaTeXRenderer({ 
  content, 
  className = '', 
  displayMode = false 
}: KaTeXRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';

    // Split content by LaTeX expressions
    const latexRegex = /\$([^$]+)\$|\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g;
    const parts = content.split(latexRegex);
    const matches = content.match(latexRegex) || [];

    let partIndex = 0;
    let matchIndex = 0;

    while (partIndex < parts.length) {
      // Add text content
      if (parts[partIndex]) {
        const textSpan = document.createElement('span');
        textSpan.textContent = parts[partIndex] || '';
        textSpan.className = 'katex-text';
        container.appendChild(textSpan);
      }

      // Add LaTeX content
      if (matchIndex < matches.length) {
        const latexContent = matches[matchIndex];
        if (latexContent) {
          const isInline = latexContent.startsWith('$') && latexContent.endsWith('$');
          const latexText = isInline 
            ? latexContent.slice(1, -1) 
            : latexContent;

          try {
            const rendered = katex.renderToString(latexText, {
              displayMode: displayMode || !isInline,
              throwOnError: false,
              strict: false,
              trust: true,
            });

            const latexSpan = document.createElement('span');
            latexSpan.innerHTML = rendered;
            latexSpan.className = isInline ? 'katex-inline' : 'katex-display';
            container.appendChild(latexSpan);
          } catch (error) {
            console.warn('KaTeX rendering error:', error);
            // Fallback to plain text
            const fallbackSpan = document.createElement('span');
            fallbackSpan.textContent = latexContent;
            fallbackSpan.className = 'katex-error text-red-600';
            container.appendChild(fallbackSpan);
          }
        }

        matchIndex++;
      }

      partIndex++;
    }
  }, [content, displayMode]);

  return (
    <div 
      ref={containerRef} 
      className={`katex-container ${className}`}
    />
  );
}

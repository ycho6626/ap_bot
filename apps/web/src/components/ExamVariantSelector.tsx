'use client';

import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn, formatExamVariant, getExamVariantAbbr } from '@/lib/utils';
import type { ExamVariant } from '@ap/shared/types';

interface ExamVariantSelectorProps {
  value: ExamVariant;
  onChange: (value: ExamVariant) => void;
  className?: string;
}

export function ExamVariantSelector({ value, onChange, className }: ExamVariantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const variants: ExamVariant[] = ['calc_ab', 'calc_bc'];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent, variant: ExamVariant) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(variant);
      setIsOpen(false);
    }
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          'btn btn-outline flex items-center space-x-2 min-w-[140px]',
          isOpen && 'ring-2 ring-primary-500'
        )}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        aria-label='Select exam variant'
      >
        <span className='flex-1 text-left'>{getExamVariantAbbr(value)}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          className='absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50'
          role='listbox'
        >
          {variants.map(variant => (
            <button
              key={variant}
              type='button'
              onClick={() => {
                onChange(variant);
                setIsOpen(false);
              }}
              onKeyDown={e => handleOptionKeyDown(e, variant)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
                value === variant && 'bg-primary-50 text-primary-700',
                'first:rounded-t-md last:rounded-b-md'
              )}
              role='option'
              aria-selected={value === variant}
            >
              <div className='font-medium'>{getExamVariantAbbr(variant)}</div>
              <div className='text-xs text-gray-500'>{formatExamVariant(variant)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

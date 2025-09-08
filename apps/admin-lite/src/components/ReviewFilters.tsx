'use client';

import { ExamVariant, ReviewCaseStatus } from '@ap/shared/types';
import { ChevronDownIcon } from 'lucide-react';

interface ReviewFiltersProps {
  filters: {
    status: ReviewCaseStatus;
    examVariant?: ExamVariant;
    limit: number;
    offset: number;
  };
  onFiltersChange: (filters: Partial<ReviewFiltersProps['filters']>) => void;
}

export function ReviewFilters({ filters, onFiltersChange }: ReviewFiltersProps) {
  return (
    <div className="card p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) => onFiltersChange({ status: e.target.value as ReviewCaseStatus })}
            className="input w-full"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_revision">Needs Revision</option>
          </select>
        </div>

        <div>
          <label htmlFor="exam-variant-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Exam Variant
          </label>
          <select
            id="exam-variant-filter"
            value={filters.examVariant || ''}
            onChange={(e) => onFiltersChange({ 
              examVariant: e.target.value ? e.target.value as ExamVariant : undefined 
            })}
            className="input w-full"
          >
            <option value="">All Variants</option>
            <option value="calc_ab">Calculus AB</option>
            <option value="calc_bc">Calculus BC</option>
          </select>
        </div>

        <div>
          <label htmlFor="limit-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Per Page
          </label>
          <select
            id="limit-filter"
            value={filters.limit}
            onChange={(e) => onFiltersChange({ limit: parseInt(e.target.value) })}
            className="input w-full"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ReviewApi, type ReviewCase } from '@/lib/api';
import { ReviewCaseList } from '@/components/ReviewCaseList';
import { ReviewCaseDetail } from '@/components/ReviewCaseDetail';
import { ReviewFilters } from '@/components/ReviewFilters';
import { RoleGuard } from '@/components/RoleGuard';
import { ExamVariant, ReviewCaseStatus } from '@ap/shared/types';
import toast from 'react-hot-toast';

export default function ReviewPage() {
  const [cases, setCases] = useState<ReviewCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ReviewCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    status: ReviewCaseStatus;
    examVariant?: ExamVariant;
    limit: number;
    offset: number;
  }>({
    status: 'new',
    limit: 20,
    offset: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });

  const loadCases = async () => {
    try {
      setLoading(true);
      const apiFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      );
      const response = await ReviewApi.getCases(apiFilters);
      setCases(response.cases);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load review cases:', error);
      toast.error('Failed to load review cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCases();
  }, [filters]);

  const handleCaseSelect = (case_: ReviewCase) => {
    setSelectedCase(case_);
  };

  const handleCaseResolve = async (
    caseId: string,
    action: 'approve' | 'reject' | 'request_revision',
    data?: {
      feedback?: string;
      correctedAnswer?: string;
      tags?: string[];
    }
  ) => {
    try {
      await ReviewApi.resolveCase({
        caseId,
        action,
        ...data,
      });

      toast.success(`Case ${action}d successfully`);

      // Reload cases to reflect the change
      await loadCases();

      // Close the detail drawer if the resolved case was selected
      if (selectedCase?.id === caseId) {
        setSelectedCase(null);
      }
    } catch (error) {
      console.error('Failed to resolve case:', error);
      toast.error('Failed to resolve case');
    }
  };

  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const handleLoadMore = () => {
    if (pagination.hasMore) {
      setFilters(prev => ({
        ...prev,
        offset: prev.offset + prev.limit,
      }));
    }
  };

  return (
    <RoleGuard requiredRole='teacher'>
      <div className='space-y-6'>
        <div className='flex justify-between items-center'>
          <h1 className='text-2xl font-bold text-gray-900'>Review Cases</h1>
          <div className='text-sm text-gray-500'>{pagination.total} total cases</div>
        </div>

        <ReviewFilters filters={filters} onFiltersChange={handleFiltersChange} />

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2'>
            <ReviewCaseList
              cases={cases}
              loading={loading}
              {...(selectedCase?.id && { selectedCaseId: selectedCase.id })}
              onCaseSelect={handleCaseSelect}
              onLoadMore={handleLoadMore}
              hasMore={pagination.hasMore}
            />
          </div>

          <div className='lg:col-span-1'>
            {selectedCase ? (
              <ReviewCaseDetail
                case_={selectedCase}
                onResolve={handleCaseResolve}
                onClose={() => setSelectedCase(null)}
              />
            ) : (
              <div className='card p-6 text-center text-gray-500'>
                <p>Select a case to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

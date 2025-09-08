'use client';

import { type ReviewCase } from '@/lib/api';
import { ClockIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon } from 'lucide-react';

interface ReviewCaseListProps {
  cases: ReviewCase[];
  loading: boolean;
  selectedCaseId?: string;
  onCaseSelect: (case_: ReviewCase) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}

export function ReviewCaseList({
  cases,
  loading,
  selectedCaseId,
  onCaseSelect,
  onLoadMore,
  hasMore,
}: ReviewCaseListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'needs_revision':
        return <AlertCircleIcon className="h-4 w-4 text-orange-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'needs_revision':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && cases.length === 0) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b border-gray-200 pb-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-500">No review cases found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="divide-y divide-gray-200">
          {cases.map((case_) => (
            <div
              key={case_.id}
              className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedCaseId === case_.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
              }`}
              onClick={() => onCaseSelect(case_)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(case_.status)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(case_.status)}`}>
                      {case_.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500 uppercase">
                      {case_.examVariant}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-900 line-clamp-2 mb-2">
                    {case_.question}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Trust: {(case_.trustScore * 100).toFixed(1)}%</span>
                    <span>Confidence: {(case_.confidence * 100).toFixed(1)}%</span>
                    <span>{formatDate(case_.created_at)}</span>
                  </div>
                </div>
                
                <div className="ml-4 flex-shrink-0">
                  <div className="text-xs text-gray-500">
                    {case_.sources.length} sources
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="btn btn-secondary btn-md"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

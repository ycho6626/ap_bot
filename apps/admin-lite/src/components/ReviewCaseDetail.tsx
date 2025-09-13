'use client';

import { useState } from 'react';
import { type ReviewCase } from '@/lib/api';
import { XIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon } from 'lucide-react';
import { KaTeXRenderer } from '@/components/KaTeXRenderer';
import { ResolveForm } from '@/components/ResolveForm';

interface ReviewCaseDetailProps {
  case_: ReviewCase;
  onResolve: (
    caseId: string,
    action: 'approve' | 'reject' | 'request_revision',
    data?: {
      feedback?: string;
      correctedAnswer?: string;
      tags?: string[];
    }
  ) => void;
  onClose: () => void;
}

export function ReviewCaseDetail({ case_, onResolve, onClose }: ReviewCaseDetailProps) {
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveAction, setResolveAction] = useState<
    'approve' | 'reject' | 'request_revision' | null
  >(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircleIcon className='h-5 w-5 text-yellow-500' />;
      case 'approved':
        return <CheckCircleIcon className='h-5 w-5 text-green-500' />;
      case 'rejected':
        return <XCircleIcon className='h-5 w-5 text-red-500' />;
      case 'needs_revision':
        return <AlertCircleIcon className='h-5 w-5 text-orange-500' />;
      default:
        return <AlertCircleIcon className='h-5 w-5 text-gray-500' />;
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
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleResolveClick = (action: 'approve' | 'reject' | 'request_revision') => {
    setResolveAction(action);
    setShowResolveForm(true);
  };

  const handleResolveSubmit = (data: {
    feedback?: string;
    correctedAnswer?: string;
    tags?: string[];
  }) => {
    if (resolveAction) {
      onResolve(case_.id, resolveAction, data);
      setShowResolveForm(false);
      setResolveAction(null);
    }
  };

  const handleResolveCancel = () => {
    setShowResolveForm(false);
    setResolveAction(null);
  };

  return (
    <div className='card h-fit'>
      <div className='p-6'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center space-x-2'>
            {getStatusIcon(case_.status)}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(case_.status)}`}
            >
              {case_.status.replace('_', ' ')}
            </span>
            <span className='text-xs text-gray-500 uppercase'>{case_.examVariant}</span>
          </div>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600'>
            <XIcon className='h-5 w-5' />
          </button>
        </div>

        <div className='space-y-6'>
          {/* Question */}
          <div>
            <h3 className='text-sm font-medium text-gray-900 mb-2'>Question</h3>
            <div className='bg-gray-50 p-3 rounded-md'>
              <KaTeXRenderer content={case_.question} />
            </div>
          </div>

          {/* Answer */}
          <div>
            <h3 className='text-sm font-medium text-gray-900 mb-2'>Generated Answer</h3>
            <div className='bg-gray-50 p-3 rounded-md'>
              <KaTeXRenderer content={case_.answer} />
            </div>
          </div>

          {/* Metadata */}
          <div>
            <h3 className='text-sm font-medium text-gray-900 mb-2'>Metadata</h3>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='text-gray-500'>Trust Score:</span>
                <span className='ml-2 font-medium'>{(case_.trustScore * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className='text-gray-500'>Confidence:</span>
                <span className='ml-2 font-medium'>{(case_.confidence * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className='text-gray-500'>Processing Time:</span>
                <span className='ml-2 font-medium'>{case_.metadata.processingTime}ms</span>
              </div>
              <div>
                <span className='text-gray-500'>Retry Count:</span>
                <span className='ml-2 font-medium'>{case_.metadata.retryCount}</span>
              </div>
              {case_.metadata.topic && (
                <div className='col-span-2'>
                  <span className='text-gray-500'>Topic:</span>
                  <span className='ml-2 font-medium'>{case_.metadata.topic}</span>
                  {case_.metadata.subtopic && (
                    <span className='ml-2 text-gray-500'>→ {case_.metadata.subtopic}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sources */}
          {case_.sources.length > 0 && (
            <div>
              <h3 className='text-sm font-medium text-gray-900 mb-2'>Sources</h3>
              <div className='space-y-2'>
                {case_.sources.map((source, index) => (
                  <div key={index} className='bg-gray-50 p-3 rounded-md'>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-xs font-medium text-gray-700 uppercase'>
                        {source.type}
                      </span>
                      {source.score && (
                        <span className='text-xs text-gray-500'>
                          Score: {(source.score * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    {source.title && (
                      <div className='text-sm font-medium text-gray-900 mb-1'>{source.title}</div>
                    )}
                    {source.snippet && (
                      <div className='text-sm text-gray-600'>{source.snippet}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className='text-xs text-gray-500 space-y-1'>
            <div>Created: {formatDate(case_.created_at)}</div>
            <div>Updated: {formatDate(case_.updated_at)}</div>
          </div>

          {/* Action Buttons */}
          {case_.status === 'pending' && !showResolveForm && (
            <div className='pt-4 border-t border-gray-200'>
              <div className='flex space-x-2'>
                <button
                  onClick={() => handleResolveClick('approve')}
                  className='btn btn-primary btn-sm flex-1'
                >
                  <CheckCircleIcon className='h-4 w-4 mr-1' />
                  Approve
                </button>
                <button
                  onClick={() => handleResolveClick('reject')}
                  className='btn btn-danger btn-sm flex-1'
                >
                  <XCircleIcon className='h-4 w-4 mr-1' />
                  Reject
                </button>
                <button
                  onClick={() => handleResolveClick('request_revision')}
                  className='btn btn-secondary btn-sm flex-1'
                >
                  <AlertCircleIcon className='h-4 w-4 mr-1' />
                  Revise
                </button>
              </div>
            </div>
          )}

          {/* Resolve Form */}
          {showResolveForm && resolveAction && (
            <div className='pt-4 border-t border-gray-200'>
              <ResolveForm
                action={resolveAction}
                onSubmit={handleResolveSubmit}
                onCancel={handleResolveCancel}
                initialData={{
                  correctedAnswer: case_.answer,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

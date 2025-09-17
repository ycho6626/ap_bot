'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Eye, Search } from 'lucide-react';
import { listReviewCases, resolveCase } from '@/lib/api.bridge';
import { formatExamVariant } from '@/lib/utils';
import { examVariantStorage } from '@/lib/storage';
import type { ExamVariant } from '@ap/shared/types';
import { Math as MathRenderer } from '@/components/katex/Math';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
import { reportError } from '@/lib/logging';

interface ReviewCase {
  id: string;
  question: string;
  answer: string;
  verified: boolean;
  trustScore: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export default function ReviewPage() {
  const [cases, setCases] = useState<ReviewCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<ReviewCase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [examVariant, setExamVariant] = useState<ExamVariant>('calc_ab');
  const [isResolving, setIsResolving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const savedVariant = examVariantStorage.get();
    setExamVariant(savedVariant);
  }, []);

  useEffect(() => {
    void loadReviewCases();
  }, []);

  const loadReviewCases = async () => {
    setIsLoading(true);
    try {
      const reviewCases = await listReviewCases();
      setCases(reviewCases);
    } catch (error) {
      reportError('Error loading review cases:', error);
      toast.error('Failed to load review cases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (caseId: string, action: 'approve' | 'reject') => {
    setIsResolving(caseId);
    try {
      await resolveCase(caseId, action, feedback);
      setCases(prev =>
        prev.map(c =>
          c.id === caseId ? { ...c, status: action === 'approve' ? 'approved' : 'rejected' } : c
        )
      );
      setSelectedCase(null);
      setFeedback('');
      toast.success(`Case ${action}d successfully`);
    } catch (error) {
      reportError('Error resolving case:', error);
      toast.error('Failed to resolve case. Please try again.');
    } finally {
      setIsResolving(null);
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className='h-4 w-4' />;
      case 'approved':
        return <CheckCircle className='h-4 w-4' />;
      case 'rejected':
        return <XCircle className='h-4 w-4' />;
      default:
        return <Clock className='h-4 w-4' />;
    }
  };

  const filteredCases = cases.filter(case_ => {
    const matchesSearch =
      case_.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      case_.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || case_.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <Card className='text-center py-12'>
          <CardContent>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4'></div>
            <p className='text-gray-600'>Loading review cases...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div className='flex items-center space-x-4'>
              <Eye className='h-8 w-8 text-primary-600' />
              <div>
                <h1 className='text-xl font-bold text-gray-900'>Review Cases</h1>
                <p className='text-sm text-gray-600'>Teacher-lite review interface</p>
              </div>
            </div>
            <div className='flex items-center space-x-4'>
              <Badge variant='secondary' className='text-xs'>
                {formatExamVariant(examVariant)}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='flex gap-6'>
          {/* Cases List */}
          <div className='w-80 flex-shrink-0'>
            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>Review Queue</CardTitle>
                <CardDescription>
                  {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''} to review
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className='space-y-4 mb-6'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                    <Input
                      placeholder='Search cases...'
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className='pl-10'
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder='Filter by status' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Cases</SelectItem>
                      <SelectItem value='pending'>Pending</SelectItem>
                      <SelectItem value='approved'>Approved</SelectItem>
                      <SelectItem value='rejected'>Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cases List */}
                <div className='space-y-3 max-h-96 overflow-y-auto'>
                  {filteredCases.map(case_ => (
                    <Card
                      key={case_.id}
                      className={`cursor-pointer transition-colors ${
                        selectedCase?.id === case_.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedCase(case_)}
                    >
                      <CardContent className='p-4'>
                        <div className='flex items-start justify-between mb-2'>
                          <Badge
                            variant='secondary'
                            className={`text-xs ${getStatusColor(case_.status)}`}
                          >
                            {getStatusIcon(case_.status)}
                            <span className='ml-1 capitalize'>{case_.status}</span>
                          </Badge>
                          <span className='text-xs text-gray-500'>
                            {Math.round(case_.trustScore * 100)}%
                          </span>
                        </div>

                        <p className='text-sm text-gray-700 line-clamp-2 mb-2'>{case_.question}</p>

                        <div className='flex items-center text-xs text-gray-500'>
                          <Clock className='h-3 w-3 mr-1' />
                          {new Date(case_.createdAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredCases.length === 0 && (
                  <div className='text-center py-8'>
                    <Eye className='h-8 w-8 text-gray-400 mx-auto mb-3' />
                    <p className='text-sm text-gray-500'>No cases found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Case Detail */}
          <div className='flex-1'>
            {selectedCase ? (
              <Card>
                <CardHeader className='border-b'>
                  <div className='flex items-start justify-between mb-4'>
                    <div className='flex-1'>
                      <CardTitle className='text-lg mb-2'>Case Review</CardTitle>
                      <CardDescription>Review and approve or reject this case</CardDescription>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <Badge
                        variant='secondary'
                        className={`text-xs ${getStatusColor(selectedCase.status)}`}
                      >
                        {getStatusIcon(selectedCase.status)}
                        <span className='ml-1 capitalize'>{selectedCase.status}</span>
                      </Badge>
                    </div>
                  </div>

                  <div className='flex items-center text-sm text-gray-500 space-x-4'>
                    <div className='flex items-center'>
                      <Clock className='h-4 w-4 mr-1' />
                      Created {new Date(selectedCase.createdAt).toLocaleDateString()}
                    </div>
                    <div className='flex items-center'>
                      <span className='font-medium'>
                        Trust Score: {Math.round(selectedCase.trustScore * 100)}%
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className='p-6'>
                  {/* Question */}
                  <div className='mb-6'>
                    <h3 className='text-sm font-medium text-gray-700 mb-2'>Question</h3>
                    <div className='prose prose-sm max-w-none'>
                      <MathRenderer content={selectedCase.question} />
                    </div>
                  </div>

                  {/* Answer */}
                  <div className='mb-6'>
                    <h3 className='text-sm font-medium text-gray-700 mb-2'>Answer</h3>
                    <div className='prose prose-sm max-w-none'>
                      <MathRenderer content={selectedCase.answer} />
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className='mb-6'>
                    <label className='text-sm font-medium text-gray-700 mb-2 block'>
                      Feedback (Optional)
                    </label>
                    <Textarea
                      placeholder='Add feedback for this case...'
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Actions */}
                  <div className='flex items-center space-x-4'>
                    <Button
                      onClick={() => handleResolve(selectedCase.id, 'approve')}
                      disabled={isResolving === selectedCase.id}
                      className='bg-green-600 hover:bg-green-700'
                    >
                      {isResolving === selectedCase.id ? (
                        <>
                          <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className='h-4 w-4 mr-2' />
                          Approve
                        </>
                      )}
                    </Button>

                    <Button
                      variant='outline'
                      onClick={() => handleResolve(selectedCase.id, 'reject')}
                      disabled={isResolving === selectedCase.id}
                      className='border-red-300 text-red-700 hover:bg-red-50'
                    >
                      <XCircle className='h-4 w-4 mr-2' />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className='text-center py-12'>
                <CardContent>
                  <Eye className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                  <CardTitle className='text-lg mb-2'>Select a Case to Review</CardTitle>
                  <CardDescription>
                    Choose a case from the list to review and approve or reject.
                  </CardDescription>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

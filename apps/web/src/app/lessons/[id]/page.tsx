'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock, Tag, Share2, Download } from 'lucide-react';
import { searchKB } from '@/lib/api.bridge';
import { formatExamVariant } from '@/lib/utils';
import { examVariantStorage } from '@/lib/storage';
import type { ExamVariant } from '@ap/shared/types';
import { Math } from '@/components/katex/Math';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

interface LessonDocument {
  id: string;
  content: string;
  subject: string;
  exam_variant: string | null;
  partition: string;
  topic: string | null;
  subtopic: string | null;
  created_at: string;
  updated_at: string;
}

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<LessonDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [examVariant, setExamVariant] = useState<ExamVariant>('calc_ab');

  useEffect(() => {
    const savedVariant = examVariantStorage.get();
    setExamVariant(savedVariant);
  }, []);

  useEffect(() => {
    if (params['id']) {
      void loadDocument(params['id'] as string);
    }
  }, [params['id']]);

  const loadDocument = async (documentId: string) => {
    setIsLoading(true);
    try {
      // For now, we'll search for the document by ID
      // In a real implementation, this would call a getDocument API
      const response = await searchKB(documentId, examVariant);
      const foundDocument = response.results.find(r => r.document.id === documentId);

      if (foundDocument) {
        setDocument(foundDocument.document);
      } else {
        toast.error('Document not found');
        router.push('/lessons');
      }
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Failed to load document. Please try again.');
      router.push('/lessons');
    } finally {
      setIsLoading(false);
    }
  };

  const getPartitionColor = (partition: string) => {
    switch (partition) {
      case 'public_kb':
        return 'bg-blue-100 text-blue-800';
      case 'paraphrased_kb':
        return 'bg-green-100 text-green-800';
      case 'private_kb':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPartitionLabel = (partition: string) => {
    switch (partition) {
      case 'public_kb':
        return 'Public';
      case 'paraphrased_kb':
        return 'Premium';
      case 'private_kb':
        return 'Private';
      default:
        return 'Unknown';
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document?.topic ?? 'AP Calculus Lesson',
          text: document?.subtopic ?? 'Learn AP Calculus with verified explanations',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      void navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleDownload = () => {
    if (!document) return;

    const content = `# ${document.topic ?? 'AP Calculus Lesson'}

${document.subtopic ? `## ${document.subtopic}\n` : ''}

${document.content}

---
*Source: AP Calculus Tutor - ${formatExamVariant(examVariant)}*
*Updated: ${new Date(document.updated_at).toLocaleDateString()}*
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.topic?.replace(/[^a-zA-Z0-9]/g, '_') ?? 'lesson'}.md`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Lesson downloaded');
  };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <Card className='text-center py-12'>
          <CardContent>
            <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <CardTitle className='text-lg mb-2'>Lesson Not Found</CardTitle>
            <CardDescription className='mb-6'>
              The requested lesson could not be found or may have been removed.
            </CardDescription>
            <Button onClick={() => router.push('/lessons')}>
              <ArrowLeft className='h-4 w-4 mr-2' />
              Back to Lessons
            </Button>
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
              <Button variant='ghost' size='sm' onClick={() => router.push('/lessons')}>
                <ArrowLeft className='h-4 w-4 mr-2' />
                Back to Lessons
              </Button>
              <div className='h-6 w-px bg-gray-300'></div>
              <BookOpen className='h-6 w-6 text-primary-600' />
              <div>
                <h1 className='text-lg font-semibold text-gray-900'>Lesson Detail</h1>
                <p className='text-sm text-gray-600'>{formatExamVariant(examVariant)}</p>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <Button variant='outline' size='sm' onClick={handleShare}>
                <Share2 className='h-4 w-4 mr-2' />
                Share
              </Button>
              <Button variant='outline' size='sm' onClick={handleDownload}>
                <Download className='h-4 w-4 mr-2' />
                Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <Card>
          {/* Document Header */}
          <CardHeader className='border-b'>
            <div className='flex items-start justify-between mb-4'>
              <div className='flex-1'>
                <CardTitle className='text-2xl mb-2'>
                  {document.topic ?? 'Lesson Document'}
                </CardTitle>
                {document.subtopic && (
                  <CardDescription className='text-base'>{document.subtopic}</CardDescription>
                )}
              </div>
              <div className='flex items-center space-x-2'>
                <Badge
                  variant='secondary'
                  className={`text-xs ${getPartitionColor(document.partition)}`}
                >
                  {getPartitionLabel(document.partition)}
                </Badge>
              </div>
            </div>

            <div className='flex items-center text-sm text-gray-500 space-x-6'>
              <div className='flex items-center'>
                <Clock className='h-4 w-4 mr-1' />
                Updated {new Date(document.updated_at).toLocaleDateString()}
              </div>
              {document.exam_variant && (
                <div className='flex items-center'>
                  <Tag className='h-4 w-4 mr-1' />
                  {formatExamVariant(document.exam_variant as ExamVariant)}
                </div>
              )}
              <div className='flex items-center'>
                <BookOpen className='h-4 w-4 mr-1' />
                {document.subject.toUpperCase()}
              </div>
            </div>
          </CardHeader>

          {/* Document Content */}
          <CardContent className='p-8'>
            <div className='prose prose-lg max-w-none'>
              <Math content={document.content} displayMode={true} />
            </div>
          </CardContent>
        </Card>

        {/* Related Actions */}
        <div className='mt-8 flex justify-center space-x-4'>
          <Button variant='outline' onClick={() => router.push('/lessons')}>
            <ArrowLeft className='h-4 w-4 mr-2' />
            Browse More Lessons
          </Button>
          <Button onClick={() => router.push('/coach')}>Ask a Question</Button>
        </div>
      </main>
    </div>
  );
}

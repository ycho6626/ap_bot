'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircleIcon, XCircleIcon, AlertCircleIcon } from 'lucide-react';

const resolveFormSchema = z.object({
  feedback: z.string().max(1000, 'Feedback must be less than 1000 characters').optional(),
  correctedAnswer: z
    .string()
    .max(10000, 'Corrected answer must be less than 10000 characters')
    .optional(),
  tags: z.string().optional(),
});

type ResolveFormData = z.infer<typeof resolveFormSchema>;

interface ResolveFormProps {
  action: 'approve' | 'reject' | 'request_revision';
  onSubmit: (data: { feedback?: string; correctedAnswer?: string; tags?: string[] }) => void;
  onCancel: () => void;
  initialData?: {
    correctedAnswer?: string;
  };
}

export function ResolveForm({ action, onSubmit, onCancel, initialData }: ResolveFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResolveFormData>({
    resolver: zodResolver(resolveFormSchema),
    defaultValues: {
      correctedAnswer: initialData?.correctedAnswer ?? '',
    },
  });

  const getActionConfig = () => {
    switch (action) {
      case 'approve':
        return {
          icon: <CheckCircleIcon className='h-5 w-5 text-green-500' />,
          title: 'Approve Case',
          description: 'Mark this case as approved and ready for use.',
          buttonText: 'Approve',
          buttonClass: 'btn-primary',
          requireFeedback: false,
          requireCorrectedAnswer: false,
        };
      case 'reject':
        return {
          icon: <XCircleIcon className='h-5 w-5 text-red-500' />,
          title: 'Reject Case',
          description: 'Mark this case as rejected and not suitable for use.',
          buttonText: 'Reject',
          buttonClass: 'btn-danger',
          requireFeedback: true,
          requireCorrectedAnswer: false,
        };
      case 'request_revision':
        return {
          icon: <AlertCircleIcon className='h-5 w-5 text-orange-500' />,
          title: 'Request Revision',
          description: 'Request changes to improve this case.',
          buttonText: 'Request Revision',
          buttonClass: 'btn-secondary',
          requireFeedback: true,
          requireCorrectedAnswer: true,
        };
    }
  };

  const config = getActionConfig();

  const onFormSubmit = (data: ResolveFormData) => {
    setIsSubmitting(true);
    try {
      const submitData: {
        feedback?: string;
        correctedAnswer?: string;
        tags?: string[];
      } = {};

      if (data.feedback?.trim()) {
        submitData.feedback = data.feedback.trim();
      }

      if (data.correctedAnswer?.trim()) {
        submitData.correctedAnswer = data.correctedAnswer.trim();
      }

      if (data.tags?.trim()) {
        submitData.tags = data.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }

      onSubmit(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={e => void handleSubmit(onFormSubmit)(e)} className='space-y-4'>
      <div className='flex items-center space-x-2 mb-4'>
        {config.icon}
        <div>
          <h3 className='text-sm font-medium text-gray-900'>{config.title}</h3>
          <p className='text-xs text-gray-500'>{config.description}</p>
        </div>
      </div>

      {/* Feedback */}
      <div>
        <label htmlFor='feedback' className='block text-sm font-medium text-gray-700 mb-1'>
          Feedback {config.requireFeedback && <span className='text-red-500'>*</span>}
        </label>
        <textarea
          id='feedback'
          {...register('feedback')}
          rows={3}
          className='textarea w-full'
          placeholder='Provide feedback about this case...'
        />
        {errors.feedback && <p className='mt-1 text-sm text-red-600'>{errors.feedback.message}</p>}
      </div>

      {/* Corrected Answer */}
      {action === 'request_revision' && (
        <div>
          <label htmlFor='correctedAnswer' className='block text-sm font-medium text-gray-700 mb-1'>
            Corrected Answer <span className='text-red-500'>*</span>
          </label>
          <textarea
            id='correctedAnswer'
            {...register('correctedAnswer')}
            rows={6}
            className='textarea w-full'
            placeholder='Provide the corrected answer...'
          />
          {errors.correctedAnswer && (
            <p className='mt-1 text-sm text-red-600'>{errors.correctedAnswer.message}</p>
          )}
        </div>
      )}

      {/* Tags */}
      <div>
        <label htmlFor='tags' className='block text-sm font-medium text-gray-700 mb-1'>
          Tags
        </label>
        <input
          id='tags'
          {...register('tags')}
          type='text'
          className='input w-full'
          placeholder='Enter tags separated by commas (e.g., derivatives, limits, integration)'
        />
        <p className='mt-1 text-xs text-gray-500'>Optional tags to categorize this case</p>
      </div>

      {/* Action Buttons */}
      <div className='flex space-x-2 pt-4'>
        <button
          type='button'
          onClick={onCancel}
          className='btn btn-secondary btn-sm flex-1'
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type='submit'
          className={`btn ${config.buttonClass} btn-sm flex-1`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Processing...' : config.buttonText}
        </button>
      </div>
    </form>
  );
}

import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, waitFor } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import { http, HttpResponse } from 'msw';
import type { KbSearchResponse } from '@/lib/api';
import LessonsPage from '../lessons/page';

const mockSearchResponse: KbSearchResponse = {
  results: [
    {
      document: {
        id: 'doc_1',
        content:
          'The derivative of a function f(x) at a point x = a represents the instantaneous rate of change.',
        subject: 'calc',
        exam_variant: 'calc_ab',
        partition: 'public_kb',
        topic: 'Derivatives',
        subtopic: 'Power Rule',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      score: 0.95,
      snippet:
        'The derivative of a function f(x) is defined as the limit of the difference quotient...',
      provenance: {
        source: 'AP Calculus Textbook',
        partition: 'public_kb',
        topic: 'Derivatives',
        subtopic: 'Power Rule',
      },
    },
    {
      document: {
        id: 'doc_2',
        content:
          'Use the chain rule when differentiating composite functions to multiply by the inner derivative.',
        subject: 'calc',
        exam_variant: 'calc_ab',
        partition: 'public_kb',
        topic: 'Derivatives',
        subtopic: 'Chain Rule',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
      score: 0.88,
      snippet:
        'The chain rule helps differentiate composite functions. Multiply by the derivative of the inner function.',
      provenance: {
        source: 'AP Calculus Study Guide',
        partition: 'public_kb',
        topic: 'Derivatives',
        subtopic: 'Chain Rule',
      },
    },
  ],
  metadata: {
    query: 'derivative',
    examVariant: 'calc_ab',
    totalResults: 2,
    maxScore: 0.95,
    searchTime: 120,
  },
};

const meta: Meta<typeof LessonsPage> = {
  title: 'Pages/LessonsPage',
  component: LessonsPage,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('*/kb/search', ({ request }) => {
          const url = new URL(request.url);
          const query = (url.searchParams.get('query') ?? '').toLowerCase();

          if (!query) {
            return HttpResponse.json({
              ...mockSearchResponse,
              results: [],
              metadata: {
                ...mockSearchResponse.metadata,
                query,
                totalResults: 0,
                maxScore: 0,
              },
            });
          }

          if (query.includes('derivative')) {
            return HttpResponse.json(mockSearchResponse);
          }

          return HttpResponse.json({
            ...mockSearchResponse,
            results: [],
            metadata: {
              ...mockSearchResponse.metadata,
              query,
              totalResults: 0,
              maxScore: 0,
            },
          });
        }),
      ],
    },
  },
};

export default meta;

type Story = StoryObj<typeof LessonsPage>;

export const SearchFlow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByPlaceholderText('Search AP Calculus AB lessons...');

    await userEvent.clear(input);
    await userEvent.type(input, 'derivative');

    await waitFor(() => expect(canvas.getByText('2 results found')).toBeInTheDocument());
  },
};

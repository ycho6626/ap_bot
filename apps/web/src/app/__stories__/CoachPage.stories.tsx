import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, waitFor } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import { http, HttpResponse } from 'msw';
import type { CoachRequest } from '@/lib/api';
import CoachPage from '../coach/page';

const meta: Meta<typeof CoachPage> = {
  title: 'Pages/CoachPage',
  component: CoachPage,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.post('*/coach', async ({ request }) => {
          const body = (await request.json()) as CoachRequest;

          return HttpResponse.json({
            answer:
              'The derivative of x^2 is 2x. Apply the power rule: bring down the exponent and subtract one from it.',
            verified: true,
            trustScore: 0.96,
            confidence: 0.94,
            sources: [
              {
                type: 'canonical',
                id: 'derivative-power-rule',
                title: 'Derivative of x^n',
                snippet: 'Using the power rule, the derivative of x^n is n·x^(n-1).',
                score: 0.97,
              },
            ],
            suggestions: [
              'Try asking about the chain rule applied to trigonometric functions.',
              'Review the relationship between derivatives and tangent line slope.',
            ],
            metadata: {
              examVariant: body.examVariant,
              processingTime: 320,
              retryCount: 0,
            },
          });
        }),
      ],
    },
  },
};

export default meta;

type Story = StoryObj<typeof CoachPage>;

export const InteractiveCoach: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = await canvas.findByPlaceholderText('Ask a AP Calculus AB question...');

    await userEvent.type(textarea, 'What is the derivative of x^2?');
    await userEvent.keyboard('{Enter}');

    await waitFor(() =>
      expect(
        canvas.getByText(
          'The derivative of x^2 is 2x. Apply the power rule: bring down the exponent and subtract one from it.'
        )
      ).toBeInTheDocument()
    );
    await expect(canvas.getByText('Verified')).toBeInTheDocument();
    await expect(canvas.getByText('96%')).toBeInTheDocument();
  },
};

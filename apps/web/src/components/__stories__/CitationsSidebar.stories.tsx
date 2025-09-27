import type { Meta, StoryObj } from '@storybook/react';
import { CitationsSidebar } from '../CitationsSidebar';

const mockSources = [
  {
    type: 'canonical' as const,
    id: 'derivative-power-rule',
    title: 'Derivative of x^n',
    snippet:
      'Using the power rule, the derivative of x^n is n·x^(n-1). This applies to all real exponents.',
    score: 0.98,
  },
  {
    type: 'retrieval' as const,
    id: 'chain-rule-overview',
    title: 'Chain Rule Overview',
    snippet:
      'The chain rule is used when differentiating composite functions and requires multiplying by the inner derivative.',
    score: 0.89,
  },
];

const mockSuggestions = [
  'Review implicit differentiation for related rates.',
  'Practice chain rule problems with trigonometric functions.',
  'Explore canonical solutions for BC free-response questions.',
];

const meta: Meta<typeof CitationsSidebar> = {
  title: 'Components/CitationsSidebar',
  component: CitationsSidebar,
  args: {
    sources: mockSources,
    suggestions: mockSuggestions,
    onClose: () => {},
  },
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
    },
  },
};

export default meta;

type Story = StoryObj<typeof CitationsSidebar>;

export const WithSourcesAndSuggestions: Story = {};

export const SourcesOnly: Story = {
  args: {
    suggestions: [],
  },
};

export const SuggestionsOnly: Story = {
  args: {
    sources: [],
  },
};

export const EmptyState: Story = {
  args: {
    sources: [],
    suggestions: [],
  },
};

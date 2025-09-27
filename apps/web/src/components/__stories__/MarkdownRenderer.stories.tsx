import type { Meta, StoryObj } from '@storybook/react';
import { MarkdownRenderer, MathMarkdownRenderer } from '../MarkdownRenderer';

const markdownSample = `# AP Calculus Summary

- Limits and continuity
- Derivatives and their applications
- Integrals and the Fundamental Theorem of Calculus

> Remember: Always justify theorems you apply.

| Topic | Focus |
|-------|-------|
| Limits | Evaluate one-sided limits |
| Derivative | Use the power rule |
| Integral | Apply substitution |
`;

const mathMarkdownSample = `The derivative of $x^2$ is $2x$.

$$
\\int_0^1 x^2 dx = \\frac{1}{3}
$$

Use the chain rule when differentiating $\\sin(3x)$.`;

const meta: Meta<typeof MarkdownRenderer> = {
  title: 'Components/MarkdownRenderer',
  component: MarkdownRenderer,
  args: {
    content: markdownSample,
  },
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof MarkdownRenderer>;

export const DefaultMarkdown: Story = {};

export const WithCustomClass: Story = {
  args: {
    className: 'bg-white p-6 rounded-lg shadow',
  },
};

export const MathMarkdown: StoryObj<typeof MathMarkdownRenderer> = {
  render: args => <MathMarkdownRenderer {...args} />,
  args: {
    content: mathMarkdownSample,
  },
};

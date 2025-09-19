import type { Meta, StoryObj } from '@storybook/react';
import { KaTeXRenderer } from './KaTeXRenderer';

const meta: Meta<typeof KaTeXRenderer> = {
  title: 'Components/KaTeXRenderer',
  component: KaTeXRenderer,
  args: {
    content: 'Evaluate the integral $\\int_0^1 x^2 dx$ and note that $e^{i\\pi} + 1 = 0$.',
    displayMode: false,
  },
  argTypes: {
    displayMode: {
      control: 'boolean',
    },
  },
};

export default meta;

type Story = StoryObj<typeof KaTeXRenderer>;

export const Playground: Story = {};

export const MixedContent: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <KaTeXRenderer
      className='space-y-4'
      content={`Taylor series around x=0:\n$$f(x) = f(0) + f'(0)x + \\frac{f''(0)}{2!}x^2 + \\dots$$\n\\nInline example: The derivative of $\\sin(x)$ is $\\cos(x)$.`}
    />
  ),
};

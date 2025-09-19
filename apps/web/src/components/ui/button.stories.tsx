import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const variantOptions = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
const sizeOptions = ['default', 'sm', 'lg', 'icon'] as const;

type ButtonStory = StoryObj<typeof Button>;

const meta: Meta<typeof Button> = {
  title: 'Components/UI/Button',
  component: Button,
  args: {
    children: 'Click me',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: variantOptions,
    },
    size: {
      control: 'select',
      options: sizeOptions,
    },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const Playground: ButtonStory = {};

export const Variants: ButtonStory = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div className='flex flex-wrap gap-3'>
      {variantOptions.map(variant => (
        <Button key={variant} variant={variant}>
          {variant.charAt(0).toUpperCase() + variant.slice(1)}
        </Button>
      ))}
    </div>
  ),
};

export const Sizes: ButtonStory = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div className='flex items-center gap-3'>
      {sizeOptions.map(size => (
        <Button key={size} size={size}>
          {size.toUpperCase()}
        </Button>
      ))}
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';
import { VerifiedBadge } from './VerifiedBadge';

const meta: Meta<typeof VerifiedBadge> = {
  title: 'Components/VerifiedBadge',
  component: VerifiedBadge,
  args: {
    verified: true,
  },
  argTypes: {
    verified: {
      control: 'boolean',
    },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof VerifiedBadge>;

export const Playground: Story = {};

export const States: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div className='flex flex-col gap-3'>
      <VerifiedBadge verified />
      <VerifiedBadge verified={false} />
    </div>
  ),
};

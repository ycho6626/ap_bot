import type { Meta, StoryObj } from '@storybook/react';
import { VerifiedBadge } from '../VerifiedBadge';

const meta: Meta<typeof VerifiedBadge> = {
  title: 'Components/VerifiedBadge',
  component: VerifiedBadge,
  args: {
    verified: true,
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof VerifiedBadge>;

export const Verified: Story = {
  args: {
    verified: true,
  },
};

export const NotVerified: Story = {
  args: {
    verified: false,
  },
};

export const WithCustomClass: Story = {
  args: {
    verified: true,
    className: 'shadow-md',
  },
};

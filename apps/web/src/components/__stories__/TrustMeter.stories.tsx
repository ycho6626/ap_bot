import type { Meta, StoryObj } from '@storybook/react';
import { TrustMeter } from '../TrustMeter';

const meta: Meta<typeof TrustMeter> = {
  title: 'Components/TrustMeter',
  component: TrustMeter,
  args: {
    score: 0.92,
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof TrustMeter>;

export const HighTrust: Story = {
  args: {
    score: 0.96,
  },
};

export const MediumTrust: Story = {
  args: {
    score: 0.75,
  },
};

export const LowTrust: Story = {
  args: {
    score: 0.42,
  },
};

export const WithCustomClass: Story = {
  args: {
    score: 0.88,
    className: 'w-80',
  },
};

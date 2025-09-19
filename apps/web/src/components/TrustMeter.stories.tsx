import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TrustMeter } from './TrustMeter';

const meta: Meta<typeof TrustMeter> = {
  title: 'Components/TrustMeter',
  component: TrustMeter,
  args: {
    score: 0.82,
  },
  argTypes: {
    score: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
    },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof TrustMeter>;
type TrustMeterProps = ComponentProps<typeof TrustMeter>;

const renderPlayground = ({ score }: TrustMeterProps) => (
  <div className='w-64 space-y-4'>
    <TrustMeter score={score} />
    <p className='text-sm text-gray-600'>Confidence score: {(score * 100).toFixed(0)}%</p>
  </div>
);

export const Playground: Story = {
  render: renderPlayground,
};

export const Thresholds: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div className='w-64 space-y-4'>
      <div>
        <p className='text-xs font-medium text-gray-500 mb-1'>High confidence</p>
        <TrustMeter score={0.95} />
      </div>
      <div>
        <p className='text-xs font-medium text-gray-500 mb-1'>Medium confidence</p>
        <TrustMeter score={0.78} />
      </div>
      <div>
        <p className='text-xs font-medium text-gray-500 mb-1'>Needs review</p>
        <TrustMeter score={0.48} />
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ExamVariantSelector } from '../ExamVariantSelector';

const DemoSelector = () => {
  const [variant, setVariant] = useState<'calc_ab' | 'calc_bc'>('calc_ab');

  return (
    <div className='flex flex-col items-center space-y-4'>
      <ExamVariantSelector value={variant} onChange={setVariant} />
      <p className='text-sm text-gray-600'>Selected variant: {variant}</p>
    </div>
  );
};

const meta: Meta<typeof DemoSelector> = {
  title: 'Components/ExamVariantSelector',
  component: DemoSelector,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof DemoSelector>;

export const InteractiveSelector: Story = {};

import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';

const meta: Meta<typeof Card> = {
  title: 'Components/UI/Card',
  component: Card,
  args: {
    className: 'max-w-sm',
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Card>;
type CardProps = ComponentProps<typeof Card>;

const renderDefault = (args: CardProps) => (
  <Card {...args}>
    <CardHeader>
      <CardTitle>Homework Progress</CardTitle>
      <CardDescription>Quick summary of today&apos;s study session.</CardDescription>
    </CardHeader>
    <CardContent>
      <ul className='space-y-2 text-sm text-gray-700'>
        <li>• Completed 5 practice problems</li>
        <li>• Reviewed 2 tricky integrals</li>
        <li>• Flagged 1 concept for tutoring</li>
      </ul>
    </CardContent>
    <CardFooter className='justify-end gap-2'>
      <Button variant='ghost'>Dismiss</Button>
      <Button>View details</Button>
    </CardFooter>
  </Card>
);

export const Default: Story = {
  render: renderDefault,
};

const renderWithEmphasis = (args: CardProps) => (
  <Card {...args}>
    <CardHeader>
      <CardTitle>Upcoming Quiz</CardTitle>
      <CardDescription>Monday, 9:00 AM – Topics: series convergence.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className='text-sm text-gray-700'>
        Spend at least 20 minutes reviewing power series tests and practice alternating series
        estimations. The tutor can walk you through any questions on Friday.
      </p>
    </CardContent>
    <CardFooter>
      <Button variant='secondary'>Add reminder</Button>
    </CardFooter>
  </Card>
);

export const WithEmphasis: Story = {
  args: {
    className: 'border-primary-200 shadow-lg',
  },
  render: renderWithEmphasis,
};

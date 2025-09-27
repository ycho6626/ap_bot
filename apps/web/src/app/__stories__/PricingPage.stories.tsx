import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse } from 'msw';
import PricingPage from '../pricing/page';

const pricingPlans = [
  {
    id: 'plan_free',
    name: 'Free',
    description: 'Get started with verified calculus support.',
    price: 0,
    currency: 'usd',
    interval: 'month' as const,
    features: ['5 questions per day', 'Basic explanations', 'Access to public knowledge base'],
    role: 'public' as const,
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    description: 'Unlimited verified answers with citations.',
    price: 19,
    currency: 'usd',
    interval: 'month' as const,
    features: [
      'Unlimited coach questions',
      'Verified answers with trust scores',
      'Premium paraphrased knowledge base',
      'Citations and source documents',
      'Priority support',
    ],
    role: 'calc_paid' as const,
  },
  {
    id: 'plan_teacher',
    name: 'Teacher',
    description: 'Collaborative tools for classroom success.',
    price: 49,
    currency: 'usd',
    interval: 'month' as const,
    features: [
      'Everything in Pro',
      'Private knowledge base uploads',
      'Student progress tracking',
      'Bulk seat management',
      'Advanced analytics dashboards',
    ],
    role: 'teacher' as const,
  },
];

const meta: Meta<typeof PricingPage> = {
  title: 'Pages/PricingPage',
  component: PricingPage,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [http.get('*/payments/plans', () => HttpResponse.json(pricingPlans))],
    },
  },
};

export default meta;

type Story = StoryObj<typeof PricingPage>;

export const DefaultPlans: Story = {};

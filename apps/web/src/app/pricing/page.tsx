'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, CreditCard, Star, ArrowRight, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPricingPlans, startCheckout } from '@/lib/api.bridge';
import toast from 'react-hot-toast';
import { reportError } from '@/lib/logging';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  role: string;
  popular?: boolean;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState<string | null>(null);

  useEffect(() => {
    void loadPricingPlans();
  }, []);

  const loadPricingPlans = async () => {
    try {
      const pricingPlans = await getPricingPlans();
      setPlans(pricingPlans);
    } catch (error) {
      reportError('Error loading pricing plans:', error);
      // Mock pricing plans for demo
      setPlans([
        {
          id: 'price_free',
          name: 'Free',
          description: 'Perfect for trying out our platform',
          price: 0,
          currency: 'usd',
          interval: 'month',
          features: [
            '5 questions per day',
            'Basic explanations',
            'Public knowledge base',
            'AB & BC support',
          ],
          role: 'public',
        },
        {
          id: 'price_pro_monthly',
          name: 'Pro',
          description: 'For serious AP Calculus students',
          price: 19,
          currency: 'usd',
          interval: 'month',
          features: [
            'Unlimited questions',
            'Verified answers with trust scores',
            'Step-by-step solutions',
            'Premium knowledge base',
            'AB & BC support',
            'Priority support',
            'Citations and sources',
          ],
          role: 'calc_paid',
          popular: true,
        },
        {
          id: 'price_teacher_monthly',
          name: 'Teacher',
          description: 'For educators and institutions',
          price: 49,
          currency: 'usd',
          interval: 'month',
          features: [
            'Everything in Pro',
            'Private knowledge base',
            'Student progress tracking',
            'Custom content creation',
            'API access',
            'Bulk student management',
            'Advanced analytics',
          ],
          role: 'teacher',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    if (priceId === 'price_free') {
      // Redirect to coach for free plan
      window.location.href = '/coach';
      return;
    }

    setIsCreatingCheckout(priceId);
    try {
      const session = await startCheckout(priceId);
      // Redirect to Stripe Checkout
      window.location.assign(session.url);
      toast.success('Redirecting to checkout...');
    } catch (error) {
      reportError('Error creating checkout session:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsCreatingCheckout(null);
    }
  };

  // const getRoleDisplayName = (role: string) => {
  //   switch (role) {
  //     case 'public':
  //       return 'Free';
  //     case 'calc_paid':
  //       return 'Pro';
  //     case 'teacher':
  //       return 'Teacher';
  //     case 'all_paid':
  //       return 'All Access';
  //     default:
  //       return 'Unknown';
  //   }
  // };

  // const getRoleColor = (role: string) => {
  //   switch (role) {
  //     case 'public':
  //       return 'bg-gray-100 text-gray-800';
  //     case 'calc_paid':
  //       return 'bg-blue-100 text-blue-800';
  //     case 'teacher':
  //       return 'bg-purple-100 text-purple-800';
  //     case 'all_paid':
  //       return 'bg-green-100 text-green-800';
  //     default:
  //       return 'bg-gray-100 text-gray-800';
  //   }
  // };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div className='flex items-center'>
              <div className='p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl'>
                <Calculator className='h-6 w-6 text-white' />
              </div>
              <span className='ml-3 text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent'>
                AP Calculus Tutor
              </span>
            </div>
            <nav className='hidden md:flex space-x-8'>
              <Link
                href='/coach'
                className='text-gray-600 hover:text-primary-600 transition-colors'
              >
                Coach
              </Link>
              <Link
                href='/lessons'
                className='text-gray-600 hover:text-primary-600 transition-colors'
              >
                Lessons
              </Link>
              <Link href='/pricing' className='text-primary-600 font-medium'>
                Pricing
              </Link>
              <Link
                href='/account'
                className='text-gray-600 hover:text-primary-600 transition-colors'
              >
                Account
              </Link>
            </nav>
            <div className='flex items-center space-x-3'>
              <Button variant='ghost' asChild>
                <Link href='/coach'>Try Free</Link>
              </Button>
              <Button asChild>
                <Link href='/account'>Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        {/* Hero Section */}
        <div className='text-center mb-16'>
          <h1 className='text-4xl md:text-6xl font-bold text-gray-900 mb-6'>
            Simple, Transparent Pricing
          </h1>
          <p className='text-xl text-gray-600 mb-8 max-w-3xl mx-auto'>
            Choose the plan that works best for your learning needs. All plans include access to our
            verified AP Calculus AB/BC tutoring system.
          </p>
          <div className='flex items-center justify-center space-x-4 text-sm text-gray-500'>
            <div className='flex items-center'>
              <CheckCircle className='h-4 w-4 text-success-600 mr-2' />
              No setup fees
            </div>
            <div className='flex items-center'>
              <CheckCircle className='h-4 w-4 text-success-600 mr-2' />
              Cancel anytime
            </div>
            <div className='flex items-center'>
              <CheckCircle className='h-4 w-4 text-success-600 mr-2' />
              30-day money back guarantee
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto'>
          {plans.map(plan => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular ? 'border-2 border-primary-500 shadow-xl scale-105' : 'border-gray-200'
              }`}
              data-testid='plan-card'
              data-plan-id={plan.id}
            >
              {plan.popular && (
                <div className='absolute -top-4 left-1/2 transform -translate-x-1/2'>
                  <Badge
                    className='bg-primary-500 text-white px-4 py-1'
                    data-testid='plan-popular-badge'
                  >
                    <Star className='w-3 h-3 mr-1' />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className='text-center pb-4'>
                <CardTitle className='text-2xl'>{plan.name}</CardTitle>
                <CardDescription className='text-base'>{plan.description}</CardDescription>
                <div className='mt-4'>
                  <span className='text-4xl font-bold text-gray-900'>${plan.price}</span>
                  <span className='text-gray-600'>/{plan.interval}</span>
                </div>
              </CardHeader>

              <CardContent className='pt-0'>
                <ul className='space-y-3 mb-8'>
                  {plan.features.map((feature, index) => (
                    <li key={index} className='flex items-center'>
                      <CheckCircle className='h-5 w-5 text-success-600 mr-3 flex-shrink-0' />
                      <span className='text-gray-700'>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCreatingCheckout === plan.id}
                  className={`w-full ${plan.popular ? 'bg-primary-600 hover:bg-primary-700' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  data-testid='plan-cta'
                >
                  {isCreatingCheckout === plan.id ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                      Processing...
                    </>
                  ) : plan.price === 0 ? (
                    <>
                      Get Started
                      <ArrowRight className='ml-2 h-4 w-4' />
                    </>
                  ) : (
                    <>
                      <CreditCard className='mr-2 h-4 w-4' />
                      Upgrade Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className='mt-20'>
          <h2 className='text-3xl font-bold text-center text-gray-900 mb-12'>
            Frequently Asked Questions
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto'>
            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>What&apos;s included in the free plan?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-gray-600'>
                  The free plan includes 5 questions per day, basic explanations, and access to our
                  public knowledge base. Perfect for trying out our platform.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>Can I change plans anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-gray-600'>
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect
                  immediately, and we&apos;ll prorate any charges.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-gray-600'>
                  We accept all major credit cards (Visa, Mastercard, American Express) and PayPal.
                  All payments are processed securely through Stripe.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>Is there a money-back guarantee?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-gray-600'>
                  Yes! We offer a 30-day money-back guarantee. If you&apos;re not satisfied with our
                  service, we&apos;ll refund your payment, no questions asked.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className='mt-20 text-center'>
          <Card className='bg-primary-600 border-primary-600 text-white'>
            <CardContent className='p-12'>
              <h2 className='text-3xl font-bold mb-4'>Ready to Get Started?</h2>
              <p className='text-xl mb-8 opacity-90'>
                Join thousands of students who have improved their AP Calculus understanding with
                our platform.
              </p>
              <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                <Button size='lg' variant='secondary' asChild className='text-lg px-8 py-3'>
                  <Link href='/coach'>Try Free Now</Link>
                </Button>
                <Button
                  size='lg'
                  variant='outline'
                  asChild
                  className='text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-primary-600'
                >
                  <Link href='/account'>View Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className='bg-gray-900 text-white py-12 mt-20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
            <div>
              <div className='flex items-center mb-4'>
                <Calculator className='h-6 w-6 text-primary-400' />
                <span className='ml-2 text-xl font-bold'>AP Calculus Tutor</span>
              </div>
              <p className='text-gray-400'>Your trusted companion for AP Calculus AB/BC success.</p>
            </div>
            <div>
              <h3 className='text-lg font-semibold mb-4'>Product</h3>
              <ul className='space-y-2'>
                <li>
                  <Link href='/coach' className='text-gray-400 hover:text-white transition-colors'>
                    Coach
                  </Link>
                </li>
                <li>
                  <Link
                    href='/lessons'
                    className='text-gray-400 hover:text-white transition-colors'
                  >
                    Lessons
                  </Link>
                </li>
                <li>
                  <Link
                    href='/pricing'
                    className='text-gray-400 hover:text-white transition-colors'
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href='/account'
                    className='text-gray-400 hover:text-white transition-colors'
                  >
                    Account
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className='text-lg font-semibold mb-4'>Support</h3>
              <ul className='space-y-2'>
                <li>
                  <a href='#' className='text-gray-400 hover:text-white transition-colors'>
                    Help Center
                  </a>
                </li>
                <li>
                  <a href='#' className='text-gray-400 hover:text-white transition-colors'>
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href='#' className='text-gray-400 hover:text-white transition-colors'>
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className='text-lg font-semibold mb-4'>Company</h3>
              <ul className='space-y-2'>
                <li>
                  <a href='#' className='text-gray-400 hover:text-white transition-colors'>
                    About
                  </a>
                </li>
                <li>
                  <a href='#' className='text-gray-400 hover:text-white transition-colors'>
                    Blog
                  </a>
                </li>
                <li>
                  <a href='#' className='text-gray-400 hover:text-white transition-colors'>
                    Careers
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className='border-t border-gray-800 mt-8 pt-8 text-center text-gray-400'>
            <p>&copy; 2024 AP Calculus Tutor. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

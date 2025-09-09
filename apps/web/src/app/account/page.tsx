'use client';

import { useState, useEffect } from 'react';
import { User, CreditCard, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getUserProfile, getPricingPlans, startCheckout, openBillingPortal } from '@/lib/api.bridge';
import { formatExamVariant } from '@/lib/utils';
import type { UserRole } from '@ap/shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  role: UserRole;
}

export default function AccountPage() {
  const [user, setUser] = useState<any | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
    loadPricingPlans();
  }, []);

  const loadUserData = async () => {
    try {
      const userProfile = await getUserProfile();
      setUser(userProfile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      // For demo purposes, create a mock user
      setUser({
        id: 'demo-user',
        email: 'demo@example.com',
        role: 'public',
        examVariant: 'calc_ab',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const loadPricingPlans = async () => {
    try {
      const pricingPlans = await getPricingPlans();
      setPlans(pricingPlans);
    } catch (error) {
      console.error('Error loading pricing plans:', error);
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
          ],
          role: 'public' as UserRole,
        },
        {
          id: 'price_pro_monthly',
          name: 'Pro Monthly',
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
          ],
          role: 'calc_paid' as UserRole,
        },
        {
          id: 'price_teacher_monthly',
          name: 'Teacher Monthly',
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
          ],
          role: 'teacher' as UserRole,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    setIsCreatingCheckout(priceId);
    try {
      const session = await startCheckout(priceId);
      // In a real app, redirect to Stripe Checkout
      window.open(session.url, '_blank');
      toast.success('Redirecting to checkout...');
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsCreatingCheckout(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const portal = await openBillingPortal();
      window.open(portal.url, '_blank');
      toast.success('Opening billing portal...');
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error('Failed to open billing portal. Please try again.');
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'public':
        return 'Free';
      case 'calc_paid':
        return 'Pro';
      case 'teacher':
        return 'Teacher';
      case 'all_paid':
        return 'All Access';
      default:
        return 'Unknown';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'public':
        return 'bg-gray-100 text-gray-800';
      case 'calc_paid':
        return 'bg-blue-100 text-blue-800';
      case 'teacher':
        return 'bg-purple-100 text-purple-800';
      case 'all_paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isCurrentPlan = (plan: PricingPlan) => {
    return user?.role === plan.role;
  };

  const canUpgrade = (plan: PricingPlan) => {
    if (!user) return false;
    if (plan.role === 'public') return false;
    if (user.role === 'all_paid') return false;
    if (user.role === 'teacher' && plan.role === 'calc_paid') return false;
    return user.role !== plan.role;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="text-center py-12">
          <CardContent>
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading account information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <User className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Account</h1>
                <p className="text-sm text-gray-600">Manage your subscription and preferences</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Profile */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile</CardTitle>
              </CardHeader>
              <CardContent>
                {user ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900">{user.email}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Current Plan</label>
                      <div className="mt-1">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getRoleColor(user.role)}`}
                        >
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </div>
                    </div>
                    
                    {user.examVariant && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Exam Variant</label>
                        <p className="text-sm text-gray-900">
                          {formatExamVariant(user.examVariant)}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Member Since</label>
                      <p className="text-sm text-gray-900">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Unable to load profile information</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pricing Plans */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {plans.map((plan) => (
                    <Card
                      key={plan.id}
                      className={`${
                        isCurrentPlan(plan)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                          </div>
                          {isCurrentPlan(plan) && (
                            <div className="flex items-center text-success-600">
                              <CheckCircle className="h-5 w-5 mr-1" />
                              <span className="text-sm font-medium">Current Plan</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mb-4">
                          <span className="text-3xl font-bold text-gray-900">
                            ${plan.price}
                          </span>
                          <span className="text-gray-600">/{plan.interval}</span>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <ul className="space-y-2 mb-6">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center text-sm text-gray-700">
                              <CheckCircle className="h-4 w-4 text-success-500 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        
                        {canUpgrade(plan) ? (
                          <Button
                            onClick={() => handleUpgrade(plan.id)}
                            disabled={isCreatingCheckout === plan.id}
                            className="w-full"
                          >
                            {isCreatingCheckout === plan.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Upgrade Now
                              </>
                            )}
                          </Button>
                        ) : isCurrentPlan(plan) ? (
                          <div className="text-center py-2">
                            <span className="text-sm text-gray-500">Current Plan</span>
                          </div>
                        ) : (
                          <div className="text-center py-2">
                            <span className="text-sm text-gray-500">Not Available</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Billing Information</CardTitle>
              </CardHeader>
              <CardContent>
                {user?.role === 'public' ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      No billing information available. Upgrade to a paid plan to see billing details.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-700">Plan</span>
                      <span className="text-sm font-medium text-gray-900">
                        {getRoleDisplayName(user?.role || 'public')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-700">Status</span>
                      <span className="text-sm font-medium text-success-600">Active</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-700">Next Billing Date</span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 my-4"></div>
                    <div className="pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManageBilling}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Manage Billing
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

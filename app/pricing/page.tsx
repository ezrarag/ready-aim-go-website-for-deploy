"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Star, Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started with basic operations',
    icon: Zap,
    features: [
      'Basic Pulse feed',
      'Single brand support',
      'Email & calendar sync',
      'GitHub integration',
      'Community support',
      '5GB storage',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_FREE_PRICE_ID || '',
    cta: 'Get Started Free',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 600,
    description: 'Ideal for growing businesses with multiple brands',
    icon: Star,
    features: [
      'Full Pulse feed with AI insights',
      '1-3 brands support',
      'Stripe financial insights',
      'Lead inbox management',
      'QR assets & automations',
      'Slack integration',
      'Priority support',
      '50GB storage',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    id: 'c-suite',
    name: 'C-Suite',
    price: 5000,
    priceRange: '5,000-9,000',
    description: 'Enterprise-grade solution for multi-brand operations',
    icon: Building2,
    features: [
      'Everything in Pro',
      'Unlimited brands',
      'Device/server management',
      'Custom dashboards',
      '24/7 on-call support',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'Unlimited storage',
      'Advanced security & compliance',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CSUITE_PRICE_ID || '',
    cta: 'Contact Sales',
    popular: false,
    custom: true,
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleSubscribe = async (planId: string, stripePriceId: string) => {
    if (planId === 'free') {
      // Redirect to signup for free plan
      window.location.href = 'https://clients.readyaimgo.biz/signup';
      return;
    }

    if (planId === 'c-suite') {
      // Redirect to contact form for C-Suite
      window.location.href = '/contact?plan=c-suite';
      return;
    }

    if (!stripePriceId) {
      console.error('Stripe price ID not configured for plan:', planId);
      return;
    }

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: stripePriceId,
          planId: planId,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4">
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">C-Suite-as-a-Service Pricing</h1>
          <p className="text-lg text-gray-600 mt-2">
            Choose the plan that fits your business needs
          </p>
        </div>
      </div>

      {/* Pricing Toggle */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-lg bg-white p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const planPrice = billingCycle === 'yearly' ? Math.round(plan.price * 0.8 * 12) : plan.price;
            const monthlyPrice = billingCycle === 'yearly' ? Math.round(plan.price * 0.8) : plan.price;

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular
                    ? 'border-2 border-indigo-600 shadow-xl scale-105'
                    : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-indigo-600 text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                  <div className="mt-6">
                    {plan.priceRange ? (
                      <div>
                        <div className="text-4xl font-bold text-gray-900">
                          ${plan.priceRange}
                          <span className="text-lg font-normal text-gray-500">/mo</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Custom pricing</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl font-bold text-gray-900">
                          ${monthlyPrice}
                          <span className="text-lg font-normal text-gray-500">/mo</span>
                        </div>
                        {billingCycle === 'yearly' && (
                          <p className="text-sm text-gray-500 mt-1">
                            ${planPrice} billed annually
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : plan.id === 'c-suite'
                        ? 'bg-gray-900 hover:bg-gray-800 text-white'
                        : 'bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                    }`}
                    onClick={() => handleSubscribe(plan.id, plan.stripePriceId)}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Add-ons Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardHeader>
              <CardTitle className="text-2xl">Hardware Add-ons</CardTitle>
              <CardDescription>
                Optional device leasing and management services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Mac Mini</h4>
                  <p className="text-2xl font-bold text-gray-900">$120/mo</p>
                  <p className="text-sm text-gray-600 mt-1">Managed Mac mini with backups</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Phone Device</h4>
                  <p className="text-2xl font-bold text-gray-900">$50/mo</p>
                  <p className="text-sm text-gray-600 mt-1">iPhone or Pixel for testing</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">NAS Storage</h4>
                  <p className="text-2xl font-bold text-gray-900">$80/mo</p>
                  <p className="text-sm text-gray-600 mt-1">Synology NAS with RAID1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            Questions about pricing?{' '}
            <Link href="/contact" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Contact our sales team
            </Link>
          </p>
          <p className="text-sm text-gray-500">
            All plans include access to the ReadyAimGo Pulse platform and client portal at{' '}
            <a
              href="https://clients.readyaimgo.biz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700"
            >
              clients.readyaimgo.biz
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}


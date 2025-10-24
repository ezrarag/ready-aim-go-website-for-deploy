"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Banknote,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard-layout';

interface Transaction {
  id: string;
  type: 'charge' | 'payout' | 'refund' | 'adjustment';
  amount: number;
  currency: string;
  status: string;
  description: string;
  created: string;
  fee?: number;
  net?: number;
  client?: string;
}

interface FinancialSummary {
  totalRevenue: number;
  totalFees: number;
  netRevenue: number;
  pendingPayouts: number;
  avgTransactionValue: number;
  monthlyGrowth: number;
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalFees: 0,
    netRevenue: 0,
    pendingPayouts: 0,
    avgTransactionValue: 0,
    monthlyGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      
      // Fetch Stripe data
      const stripeResponse = await fetch('/api/pulse/stripe');
      if (stripeResponse.ok) {
        const stripeData = await stripeResponse.json();
        
        // Transform Stripe events into transactions
        const stripeTransactions: Transaction[] = stripeData.events
          ?.filter((event: any) => event.data.type === 'transaction' || event.data.type === 'payout')
          .map((event: any) => ({
            id: event.data.id,
            type: event.data.type === 'payout' ? 'payout' : 'charge',
            amount: event.data.amount,
            currency: event.data.currency,
            status: event.data.status,
            description: event.data.description || `${event.data.type} transaction`,
            created: new Date(event.data.created * 1000).toISOString(),
            fee: event.data.fee,
            net: event.data.net,
            client: event.project || 'General'
          })) || [];

        setTransactions(stripeTransactions);
      }

      // Calculate summary from transactions
      const totalRevenue = transactions
        .filter(t => t.type === 'charge' && t.status === 'succeeded')
        .reduce((sum, t) => sum + t.amount, 0) / 100; // Convert from cents

      const totalFees = transactions
        .reduce((sum, t) => sum + (t.fee || 0), 0) / 100;

      const pendingPayouts = transactions
        .filter(t => t.type === 'payout' && t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0) / 100;

      setSummary({
        totalRevenue,
        totalFees,
        netRevenue: totalRevenue - totalFees,
        pendingPayouts,
        avgTransactionValue: totalRevenue / Math.max(transactions.filter(t => t.type === 'charge').length, 1),
        monthlyGrowth: 23.5 // Mock data
      });

    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'charge': return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'payout': return <Banknote className="h-4 w-4 text-blue-600" />;
      case 'refund': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'adjustment': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'canceled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-8 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance Overview</h1>
            <p className="text-gray-600">Monitor revenue, payouts, and financial performance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${summary.totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Net Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${summary.netRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Fees</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${summary.totalFees.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${summary.pendingPayouts.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Transaction</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${summary.avgTransactionValue.toFixed(2)}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Growth</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{summary.monthlyGrowth}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 rounded-full">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 capitalize">
                          {transaction.type}
                        </p>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{transaction.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.created).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${(transaction.amount / 100).toFixed(2)}
                    </p>
                    {transaction.fee && (
                      <p className="text-sm text-gray-500">
                        Fee: ${(transaction.fee / 100).toFixed(2)}
                      </p>
                    )}
                    {transaction.client && (
                      <Badge variant="outline" className="text-xs">
                        {transaction.client}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fee Optimization */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Optimization Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Stripe Connect Optimization</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Consider upgrading to Stripe Connect Express to reduce platform fees by 0.2%
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Potential savings: ~${(summary.totalRevenue * 0.002).toFixed(2)}/month
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">Payment Method Optimization</h4>
                    <p className="text-sm text-green-800 mt-1">
                      Encourage ACH payments for larger transactions to reduce card processing fees
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

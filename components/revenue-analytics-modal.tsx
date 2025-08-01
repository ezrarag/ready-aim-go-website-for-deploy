import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard,
  Calendar,
  BarChart3,
  Settings,
  RefreshCw,
  Download,
  Share
} from 'lucide-react';
import { useStripe } from '@/lib/services/stripe-service';

interface RevenueAnalyticsModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string | undefined;
}

export function RevenueAnalyticsModal({ open, onClose, clientId }: RevenueAnalyticsModalProps) {
  const { revenueData, analytics, loading, error, fetchRevenueData, fetchAnalytics } = useStripe(clientId);
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    if (open && clientId) {
      fetchRevenueData();
      fetchAnalytics();
    }
  }, [open, clientId, fetchRevenueData, fetchAnalytics]);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            <span className="ml-3 text-neutral-400">Loading revenue analytics...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-4xl">
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-white mb-2">Error Loading Analytics</h3>
            <p className="text-neutral-400 mb-4">{error}</p>
            <Button onClick={() => { fetchRevenueData(); fetchAnalytics(); }} className="bg-orange-600 hover:bg-orange-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-500" />
            Revenue Analytics Dashboard
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Comprehensive revenue tracking and analytics for your business
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Revenue Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-neutral-800 border-neutral-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-400 tracking-wider">TOTAL REVENUE</p>
                    <p className="text-2xl font-bold text-white font-mono">
                      ${revenueData?.totalRevenue.toLocaleString() || '0'}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-800 border-neutral-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-400 tracking-wider">MONTHLY REVENUE</p>
                    <p className="text-2xl font-bold text-white font-mono">
                      ${revenueData?.monthlyRevenue.toLocaleString() || '0'}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-800 border-neutral-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-400 tracking-wider">GROWTH RATE</p>
                    <p className={`text-2xl font-bold font-mono ${analytics?.revenueGrowth && analytics.revenueGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {analytics?.revenueGrowth ? `${analytics.revenueGrowth > 0 ? '+' : ''}${analytics.revenueGrowth}%` : '0%'}
                    </p>
                  </div>
                  {analytics?.revenueGrowth && analytics.revenueGrowth > 0 ? (
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-800 border-neutral-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-400 tracking-wider">AVG ORDER VALUE</p>
                    <p className="text-2xl font-bold text-white font-mono">
                      ${analytics?.averageOrderValue.toLocaleString() || '0'}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-white">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">Subscription Revenue</span>
                  <span className="text-sm font-bold text-white">
                    ${revenueData?.subscriptionRevenue.toLocaleString() || '0'}
                  </span>
                </div>
                <Progress value={revenueData ? (revenueData.subscriptionRevenue / revenueData.totalRevenue) * 100 : 0} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">One-Time Revenue</span>
                  <span className="text-sm font-bold text-white">
                    ${revenueData?.oneTimeRevenue.toLocaleString() || '0'}
                  </span>
                </div>
                <Progress value={revenueData ? (revenueData.oneTimeRevenue / revenueData.totalRevenue) * 100 : 0} className="h-2" />
              </CardContent>
            </Card>

            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-white">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">Customer Lifetime Value</span>
                  <span className="text-sm font-bold text-white">
                    ${analytics?.customerLifetimeValue.toLocaleString() || '0'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">Churn Rate</span>
                  <span className="text-sm font-bold text-white">
                    {analytics?.churnRate || '0'}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">Currency</span>
                  <Badge className="bg-green-600 text-white">
                    {revenueData?.currency?.toUpperCase() || 'USD'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="bg-neutral-800 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {revenueData?.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-neutral-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        transaction.type === 'subscription' ? 'bg-blue-500' : 
                        transaction.type === 'one-time' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-white">{transaction.description}</p>
                        <p className="text-xs text-neutral-400">{new Date(transaction.created).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">${transaction.amount.toLocaleString()}</p>
                      <Badge className={`text-xs ${
                        transaction.status === 'succeeded' ? 'bg-green-600' : 'bg-yellow-600'
                      }`}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="bg-neutral-800 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white">Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics?.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-neutral-700 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <p className="text-xs text-neutral-400">Quantity: {product.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">${product.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-neutral-700">
          <div className="flex gap-3">
            <Button variant="outline" className="border-neutral-600 text-neutral-300">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" className="border-neutral-600 text-neutral-300">
              <Share className="w-4 h-4 mr-2" />
              Share Report
            </Button>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-neutral-600 text-neutral-300">
              Close
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              <Settings className="w-4 h-4 mr-2" />
              Configure Stripe
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
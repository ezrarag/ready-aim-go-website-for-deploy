import { NextRequest, NextResponse } from 'next/server';

interface StripeTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  created: number;
  description?: string;
  fee?: number;
  net?: number;
}

interface StripePayout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  arrival_date: number;
  description?: string;
  fee?: number;
}

interface PulseEvent {
  source: 'stripe';
  timestamp: string;
  data: any;
  project?: string;
}

export async function GET(req: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      return NextResponse.json({
        events: [],
        disabled: true,
        error: 'Stripe secret key not configured'
      });
    }

    const events: PulseEvent[] = [];

    // Fetch recent balance transactions
    try {
      const transactionsResponse = await fetch(
        'https://api.stripe.com/v1/balance_transactions?limit=50',
        {
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Accept': 'application/json'
          }
        }
      );

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        const transactions: StripeTransaction[] = transactionsData.data || [];
        
        transactions.forEach(transaction => {
          const project = extractProjectFromTransaction(transaction);
          
          events.push({
            source: 'stripe',
            timestamp: new Date(transaction.created * 1000).toISOString(),
            project: project || 'general',
            data: {
              type: 'transaction',
              id: transaction.id,
              amount: transaction.amount,
              currency: transaction.currency,
              status: transaction.status,
              transactionType: transaction.type,
              description: transaction.description,
              fee: transaction.fee,
              net: transaction.net,
              created: transaction.created
            }
          });
        });
      }
    } catch (error) {
      console.error('Error fetching Stripe transactions:', error);
    }

    // Fetch recent payouts
    try {
      const payoutsResponse = await fetch(
        'https://api.stripe.com/v1/payouts?limit=20',
        {
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Accept': 'application/json'
          }
        }
      );

      if (payoutsResponse.ok) {
        const payoutsData = await payoutsResponse.json();
        const payouts: StripePayout[] = payoutsData.data || [];
        
        payouts.forEach(payout => {
          const project = extractProjectFromPayout(payout);
          
          events.push({
            source: 'stripe',
            timestamp: new Date(payout.created * 1000).toISOString(),
            project: project || 'general',
            data: {
              type: 'payout',
              id: payout.id,
              amount: payout.amount,
              currency: payout.currency,
              status: payout.status,
              description: payout.description,
              fee: payout.fee,
              created: payout.created,
              arrivalDate: payout.arrival_date
            }
          });
        });
      }
    } catch (error) {
      console.error('Error fetching Stripe payouts:', error);
    }

    // Fetch account balance
    try {
      const balanceResponse = await fetch(
        'https://api.stripe.com/v1/balance',
        {
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Accept': 'application/json'
          }
        }
      );

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        
        // Add current balance as a special event
        events.push({
          source: 'stripe',
          timestamp: new Date().toISOString(),
          project: 'account',
          data: {
            type: 'balance_snapshot',
            available: balanceData.available || [],
            pending: balanceData.pending || [],
            instant_available: balanceData.instant_available || []
          }
        });
      }
    } catch (error) {
      console.error('Error fetching Stripe balance:', error);
    }

    // Sort events by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      events: events.slice(0, 30), // Return top 30 events
      source: 'stripe',
      totalEvents: events.length,
      disabled: false
    });

  } catch (error) {
    console.error('Stripe Pulse API error:', error);
    return NextResponse.json({
      events: [],
      disabled: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to extract project name from transaction
function extractProjectFromTransaction(transaction: StripeTransaction): string | null {
  const description = transaction.description?.toLowerCase() || '';
  
  // Check for client names in transaction description
  const clientPatterns = [
    /femi/i,
    /baya/i,
    /jennalyn/i,
    /serenity/i,
    /sweet.freak/i,
    /beam/i,
    /readyaimgo/i
  ];

  for (const pattern of clientPatterns) {
    if (pattern.test(description)) {
      return pattern.source.replace(/[^a-zA-Z0-9-_]/g, '');
    }
  }

  // Check for transaction types
  if (transaction.type === 'charge') return 'payments';
  if (transaction.type === 'refund') return 'refunds';
  if (transaction.type === 'adjustment') return 'adjustments';
  if (transaction.type === 'payout') return 'payouts';

  return null;
}

// Helper function to extract project name from payout
function extractProjectFromPayout(payout: StripePayout): string | null {
  const description = payout.description?.toLowerCase() || '';
  
  // Check for client names in payout description
  const clientPatterns = [
    /femi/i,
    /baya/i,
    /jennalyn/i,
    /serenity/i,
    /sweet.freak/i,
    /beam/i,
    /readyaimgo/i
  ];

  for (const pattern of clientPatterns) {
    if (pattern.test(description)) {
      return pattern.source.replace(/[^a-zA-Z0-9-_]/g, '');
    }
  }

  return 'payouts';
}

import { PATCH } from './app/api/clients/[id]/invoices/[invoiceId]/route.ts';
import { NextRequest } from 'next/server';

// Set up minimal environment variables
process.env.INTERNAL_MUTATION_KEY = 'mock-key';

async function main() {
  const req = new NextRequest('http://localhost:3000/api/clients/SUwqw3jWvGC1aImcJZsh/invoices/evLnNhNlSGXhMejBzH7Q', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'origin': 'http://localhost:3000',
    },
    body: JSON.stringify({
      title: 'Testing save invoice',
      status: 'client_review',
      billTo: { name: 'MKE Black', company: 'MKE', address: 'Milwaukee', email: 'test@mke.com' },
      lineItems: [{ description: 'Test Item', period: 'Jul 2026', quantity: 1, rateCents: 5000, amountCents: 5000 }],
    }),
  });

  const context = {
    params: Promise.resolve({
      id: 'SUwqw3jWvGC1aImcJZsh',
      invoiceId: 'evLnNhNlSGXhMejBzH7Q',
    }),
  };

  console.log("Invoking PATCH handler...");
  try {
    const res = await PATCH(req, context);
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response JSON:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Handler error:", err);
  }
}

main().catch(console.error);

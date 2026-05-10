import type { Timestamp } from "firebase-admin/firestore"

// ---------------------------------------------------------------------------
// Deliverable — a scoped piece of work offered to a client for purchase
// ---------------------------------------------------------------------------

export interface ClientDeliverable {
  id: string
  clientId: string
  title: string
  summary: string
  liveUrl: string
  screenshotUrls: string[]
  amount: number            // USD cents
  status: "pending" | "paid" | "cancelled"
  paidAt?: Timestamp
}

// ---------------------------------------------------------------------------
// Billing record — written when a checkout session completes
// ---------------------------------------------------------------------------

export interface ClientBillingRecord {
  clientId: string
  deliverableId: string
  stripeSessionId: string
  paidAt: Timestamp
  amount: number            // USD cents
}

export type InvoiceStatus =
  | "draft"
  | "client_review"
  | "accepted"
  | "paid"
  | "cancelled"

export type InvoiceLineItem = {
  description: string
  period: string
  quantity: number
  rateCents: number
  amountCents: number
  notes?: string | null
}

export type InvoiceParty = {
  name: string
  company: string
  address: string
  email: string
}

export type ClientInvoice = {
  id: string
  clientId: string
  workspaceId?: string | null
  contractId?: string | null
  deliverableId?: string | null
  templateId: string
  invoiceNumber: string
  title: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  billingPeriod: string
  from: InvoiceParty
  billTo: InvoiceParty
  lineItems: InvoiceLineItem[]
  subtotalCents: number
  taxLabel?: string | null
  taxCents?: number
  totalCents: number
  paymentLink?: string | null
  renderedHtml?: string | null
  editableByClientFields?: string[]
  acceptedAt?: string | null
  paidAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

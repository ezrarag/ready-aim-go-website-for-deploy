# Codex Prompts — Finance Ledger, Contract Invoicing, Branded PDFs
# Run in order. Each prompt assumes the previous one is committed and merged.
# Repo: ready-aim-go-website-for-deploy-clean

---

## PROMPT 1 — Finance ledger (run first, everything else writes into this)

Read `lib/admin/products.ts`, `lib/value-profile.ts`, and `app/dashboard/page.tsx`
(the Billing view section) first. Do not touch existing subscription fields.

Implement only the ledger layer:

1. Firestore collections:
   - `walletPools/{poolId}` — fields: `name`, `createdAt`
   - `walletPools/{poolId}/contributions/{entryId}` — fields: `amount`, `source`
     ("stripe" | "contract"), `clientId`, `invoiceId` (optional), `date`
   - `walletPools/{poolId}/allocations/{entryId}` — fields: `amount`, `recipient`,
     `purpose`, `date` (leave writes to this manual/admin-only for now)

2. Add optional field to `clients/{id}`:
   `retainer: { poolId, active }` — do not touch existing subscription fields.

3. Build `app/dashboard/finance/page.tsx`:
   - Top tiles: total committed (sum of client retainers), total received (sum
     of all contributions across pools), unallocated balance (received minus
     allocations), allocated this month.
   - One table: contributions by client, columns = date, client, source, amount.
   - Default pool: if a client has no `retainer.poolId`, contributions write to
     a pool named `"general"`.

4. Add this view to the admin nav.

No budget-request UI, no allocation policies, no client-portal changes in this
pass. Do not seed fake data — leave empty until the TFH contract payment lands.

Run `npm run build`, fix errors, commit.

---

## PROMPT 2 — Contract extraction + review

Read `lib/types/client-billing.ts`,
`app/api/clients/[id]/deliverables/[deliverableId]/checkout/route.ts`, and the
admin client detail view first.

**Task 1** — Create `POST /api/contracts/extract`. Accepts an uploaded file
(PDF or image) already in Firebase Storage plus a `storagePath`. Call Claude
(claude-sonnet-4-20250514) with the file and a system prompt instructing it to
extract: payer entity, payer contact, contractor name, total fee, currency, an
array of milestones (label, amount, trigger type: "signing" | "delivery" |
"manual"), payment terms in days, deadline date. Return strict JSON. Write the
result to Firestore `contracts/{autoId}` with `status: "extracted"`,
`clientId: null`, and the raw extracted JSON.

**Task 2** — Add a "Contracts" section to the admin client detail view: list
extracted contracts needing review, each with an editable form pre-filled from
the extraction (all fields editable — never trust OCR blindly on dollar
amounts), a client-picker dropdown to link `clientId`, and a "Confirm" button
that flips `status` to `"confirmed"` and creates one
`clients/{clientId}/invoices/{invoiceId}` doc per milestone with
`status: "draft"`.

No auto-billing on confirm — invoices stay in draft until manually generated.
Run `npm run build`, fix errors, commit.

---

## PROMPT 3 — Branded PDF generation + paid → ledger tie-in

Read whatever files define existing product branding tokens in this repo
first (search for Nexus/Motion/Space/Cohort brand color or logo definitions
under `lib/` or `public/brand/`). **If none exist yet, stop and ask before
proceeding — do not invent brand colors.**

**Task 1** — Create `lib/invoice-templates/` with one brand-token file per
product (`rag.ts`, `nexus.ts`, `motion.ts`, `space.ts`, `cohort.ts`) exporting
`{ primaryColor, accentColor, logoUrl, fontFamily }`, sourced from the existing
brand files found above. Create a shared HTML invoice template component
(`lib/invoice-templates/InvoiceDocument.tsx` or similar) that takes an invoice
record + brand tokens and renders: letterhead with logo, client/payer info,
milestone line item, amount, due date, payment instructions, footer.

**Task 2** — Add `POST /api/invoices/[id]/generate`. Loads the invoice +
linked contract + brand tokens (default to `rag` unless the client has an
active product subscription matching Nexus/Motion/Space/Cohort, in which case
use that brand). Renders the HTML template, converts to PDF using Puppeteer
(add as a dependency if not present), uploads to Firebase Storage at
`invoices/{clientId}/{invoiceId}.pdf`, updates the invoice doc with `pdfUrl`
and `status: "generated"`. Add a "Generate PDF" button next to each draft
invoice in the admin Contracts section that calls this route and opens the
resulting PDF.

**Task 3** — Add a "Mark as Paid" button on each generated invoice. On click:
  (a) update `clients/{clientId}/invoices/{invoiceId}.status` to `"paid"` with
      a `paidAt` timestamp;
  (b) write an immutable entry to `walletPools/{poolId}/contributions/{autoId}`
      with `{ amount, source: "contract", clientId, invoiceId, contractId,
      date }` — use the client's `retainer.poolId` if set, else the
      `"general"` pool from Prompt 1;
  (c) append the same amount to `clients/{clientId}/valueProfile/payments` in
      the same shape used by existing Stripe-payment entries, so it displays
      identically in the client portal regardless of payment rail.

No auto-triggering — this is a manual confirmation step, since contract
payments (check/ACH) aren't webhook-verifiable the way Stripe is.

Do not wire SMS or email sending in this pass — PDF generation, storage, and
the paid/ledger tie-in only. Run `npm run build`, fix errors, commit.

---

## PROMPT 4 — Send invoice via SMS/email (run after 1–3 are confirmed working)

Read `lib/telnyx.ts` and the Resend integration (if present) first.

Add a "Send Invoice" button next to generated invoices. On click, send the
`pdfUrl` link via SMS (using `sendSMS` from `lib/telnyx.ts`) if the client has
a phone number on file, and/or via email (Resend) if an email is on file.
Update `clients/{clientId}/invoices/{invoiceId}.status` to `"sent"` and log
`sentAt`. Do not auto-send — this stays a manual per-invoice action.

Run `npm run build`, fix errors, commit.

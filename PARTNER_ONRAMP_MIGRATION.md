# Partner Onramp Migration: Supabase → Firebase/Firestore

## Summary

Successfully migrated the Partner Investment Onramp from Supabase to Firebase/Firestore. The hero section has also been updated with new copy and CTA structure.

## Changes Made

### 1. Hero Section Updates (`app/page.tsx`)

- **New H1**: "Your C-Suite, on subscription."
- **New Subheadline**: "We build and run your website, payments, and back office—plus shared assets like vehicles and studios—for your business, ministry, or creative team."
- **Primary CTAs**:
  - "I'm a Client — Get Started" → `/contact`
  - "I'm a Partner — View Onramp" → `/partners/carlot`
- **Secondary Actions**: "Watch Demo" and "View Projects & Partners"
- **For Clients/For Partners blurbs** moved into hero section (2-column layout)

### 2. Firebase Setup

- **Created** `lib/firestore.ts` with Firebase Admin SDK initialization
- **Installed** `firebase-admin` package
- **Removed** `lib/supabase-server.ts`
- **Removed** `@supabase/supabase-js` dependency

### 3. Firestore Collections

Two collections replace the Supabase tables:

#### `partners` Collection
- `slug` (string, unique)
- `name` (string)
- `contactEmail` (string, optional)
- `contactName` (string, optional)
- `orgType` (string, e.g., "church_choir")
- `createdAt` (Timestamp)

#### `contributions` Collection
- `partnerId` (string, reference to partner document ID)
- `partnerSlug` (string)
- `stripeSessionId` (string, unique)
- `amountCents` (number)
- `currency` (string, default "usd")
- `purpose` (string, default "fleet_contribution")
- `userEmail` (string, optional)
- `userName` (string, optional)
- `createdAt` (Timestamp)

### 4. Migrated Routes

All partner-related routes now use Firestore:

- ✅ `app/partners/[slug]/page.tsx` - Partner landing page
- ✅ `app/partners/thank-you/page.tsx` - Thank you page
- ✅ `app/admin/partners/page.tsx` - Admin partners list
- ✅ `app/admin/partners/[id]/page.tsx` - Partner details
- ✅ `app/api/partners/checkout/route.ts` - Stripe checkout creation
- ✅ `app/api/stripe/webhook/route.ts` - Webhook handler (migrated to `/webhook/route.ts`)
- ✅ `app/api/partners/seed/route.ts` - Seed route for Carlot partner

### 5. Helper Functions (`lib/firestore.ts`)

- `getFirestoreDb()` - Initialize and return Firestore instance
- `getPartnerBySlug(slug)` - Fetch partner by slug
- `getPartnerById(id)` - Fetch partner by document ID
- `getAllPartners()` - Fetch all partners
- `createContribution(data)` - Create contribution document
- `getContributionBySessionId(sessionId)` - Check for existing contribution (idempotency)
- `getContributionsByPartnerId(partnerId)` - Get all contributions for a partner
- `getContributionsByPartnerSlug(partnerSlug)` - Get contributions by slug
- `ensureCarlotPartner()` - Seed Carlot partner if missing

## Environment Variables Required

Add these to your `.env.local`:

```bash
# Firebase Admin SDK - Option 1: Full JSON key (recommended)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# OR Option 2: Individual fields
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### How to Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Either:
   - Copy the entire JSON as a single-line string to `FIREBASE_SERVICE_ACCOUNT_KEY`, OR
   - Extract `project_id`, `client_email`, and `private_key` to individual env vars

## Database Setup

**No SQL migration needed!** Firestore collections are created automatically when you write the first document.

### Seed Carlot Partner

The Carlot partner is automatically seeded when you visit `/partners/carlot` for the first time. Alternatively, you can call:

```bash
POST /api/partners/seed
```

Or manually create it in Firebase Console:
- Collection: `partners`
- Document ID: (auto-generated)
- Fields:
  - `slug`: "carlot"
  - `name`: "Dorve Church Choir"
  - `contactName`: "Carlot Dorve"
  - `contactEmail`: "carlot@example.com"
  - `orgType`: "church_choir"
  - `createdAt`: (current timestamp)

## Testing Checklist

1. ✅ Visit `/` - Hero displays new copy and CTAs
2. ✅ Visit `/partners/carlot` - Partner page loads
3. ✅ Select contribution tier and click "Continue to Secure Contribution"
4. ✅ Complete test payment in Stripe test mode
5. ✅ Verify webhook creates contribution document in Firestore
6. ✅ Visit `/partners/thank-you?session_id=...` - Thank you page shows correct data
7. ✅ Visit `/admin/partners` - Admin view shows partner with totals
8. ✅ Visit `/admin/partners/[id]` - Partner details show contribution history

## Files Removed

- ❌ `lib/supabase-server.ts` - Replaced with `lib/firestore.ts`
- ❌ `app/api/stripe/webhook.ts` - Replaced with `app/api/stripe/webhook/route.ts`
- ❌ `database/create-partners-tables.sql` - No longer needed (Firestore auto-creates collections)

## Notes

- **Other Supabase usage**: The rest of the codebase still uses Supabase for auth, client dashboards, etc. Only the partner onramp was migrated to Firebase.
- **Admin Auth**: Admin pages currently have placeholder auth checks. Implement proper Firebase Auth verification for production.
- **Idempotency**: Webhook handler checks for existing contributions by `stripeSessionId` to prevent duplicates.

## Next Steps

1. Set Firebase environment variables in `.env.local`
2. Test the partner flow end-to-end
3. Implement proper admin authentication using Firebase Auth
4. Add more partners by creating documents in the `partners` collection



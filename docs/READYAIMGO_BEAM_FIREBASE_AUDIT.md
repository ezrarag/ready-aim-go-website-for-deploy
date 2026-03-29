# ReadyAimGo Firebase Audit For BEAM Home

Audit date: 2026-03-19

## Current state summary

- Firestore currently uses `clients` as the only practical organization-like source.
- Live dataset inspected: 10 `clients` documents.
- 7 of 10 client records use a Firestore doc ID that differs from `storyId`.
- 1 client (`paynepros`) has an `updates` subcollection, but the only document is malformed placeholder data.
- `clients` mixes organization-candidate fields, story/site metadata, deploy telemetry, and ad hoc support/contact fields in the same document.
- Write APIs for `clients` and `clients/{clientId}/updates` are not authenticated today.

## Structural blockers

### 1. Identity is split across doc ID and `storyId`

- Public story pages use `storyId` in the URL.
- Firestore subcollections and admin pages use the document ID.
- This is a blocker for BEAM provenance unless both values are exported together and treated as separate identifiers.

### 2. `clients` mixes canonical org data with site-only metadata

- Candidate organization data: `name`, `websiteUrl`, `primaryDomain`, `ownerEmail`, `supportEmail`, `supportPhone`, `timeZone`.
- Site/story-only data: `storyVideoUrl`, `showOnFrontend`, `isNewStory`, story module URLs, `deployUrl`, `deployHosts`, `githubRepo`, `githubRepos`, Vercel linkage.
- BEAM Home should not import story presentation fields as organization truth.

### 3. Field normalization is inconsistent

- `modules` missing on 3 docs.
- `updatedAt` missing on 6 docs.
- `showOnFrontend` missing on 1 doc.
- `githubRepo` present without normalized `githubRepos` on 1 doc.
- `deployUrl` present without normalized `deployHosts` on 3 docs.
- Legacy/duplicate fields exist: `repo`, `githubRepo`, `githubRepos`.
- Typo exists in live data: `whatsAppNumner` on `paynepros`; `whatsAppNumber` exists elsewhere.
- `primaryDomain` includes invalid placeholder content on at least one record.

### 4. `clients/{clientId}/updates` is not stable enough for BEAM enrichment

- PaynePros has 1 update document with empty `type`, `title`, `summary`, `details`, `status`, `tags`, and `links`.
- No client currently has a valid published update that is safe to treat as enrichment-grade operational evidence.
- BEAM should treat updates as optional supporting metadata only after validation, not as canonical org data.

### 5. Current write surfaces are unsafe for tighter integration

- `POST /api/clients`
- `PATCH /api/clients/[id]`
- `POST /api/clients/[id]/updates`
- `PATCH /api/clients/[id]/updates/[updateId]`
- `POST /api/clients/[id]/updates/[updateId]/video`

These routes currently have no auth guard. That is a hard blocker before any write-capable BEAM integration or BEAM-directed sign-in/sign-up flow.

## Cleanup priorities

### Priority 0

- Treat ReadyAimGo as read-only for BEAM organization enrichment.
- Do not write participant identity into ReadyAimGo.
- Do not rely on `updates` for BEAM org enrichment yet.

### Priority 1

- Preserve both `clientDocumentId` and `storyId` everywhere.
- Export source provenance as:
  - `sourceSystem = "readyaimgo"`
  - `sourceCollection = "clients"`
  - `sourceDocumentId`
  - `sourceStoryId`
  - `externalKey = readyaimgo:clients:{documentId}`

### Priority 2

- Normalize org-candidate fields on each client:
  - `name`
  - `storyId`
  - `websiteUrl`
  - `primaryDomain`
  - `ownerEmail`
  - `supportEmail`
  - `supportPhone`
  - `whatsAppNumber`
  - `timeZone`
  - `status`

### Priority 3

- Normalize support/deploy metadata:
  - backfill `modules`
  - backfill `updatedAt`
  - backfill `showOnFrontend`
  - normalize `githubRepo` into `githubRepos`
  - normalize `deployUrl` into `deployHosts`
  - remove or stop using legacy `repo`
  - fix `whatsAppNumner` typo

### Priority 4

- Require auth on all ReadyAimGo write APIs before tighter BEAM integration.
- Keep BEAM-facing org export read-only and API-key protected.

## Recommended normalization steps

1. Freeze canonical organization export to a narrow shape.
2. Keep story/site/deploy metadata in a separate object when exporting to BEAM.
3. Backfill missing `modules`, `updatedAt`, and `showOnFrontend`.
4. Standardize repository fields on `githubRepos` and host fields on `deployHosts`.
5. Standardize contact fields and fix field-name typos.
6. Add validation so `updates` cannot be created with empty `type`, `title`, or status.
7. Add auth before any BEAM-triggered writes or account-linking flows.

## Safe export shape for BEAM Home `organizations`

Recommended export envelope:

```ts
{
  source: {
    system: "readyaimgo",
    collection: "clients",
    documentId: string,
    storyId: string,
    externalKey: string,
    documentPath: string,
  },
  organization: {
    displayName: string,
    aliases: string[],
    websiteUrl?: string,
    primaryDomain?: string,
    status?: string,
    timeZone?: string,
    contacts: {
      ownerEmail?: string,
      supportEmail?: string,
      supportPhone?: string,
      whatsAppNumber?: string,
    },
  },
  siteMetadata: {
    storyPath: string,
    storyVideoUrl?: string,
    showOnFrontend: boolean,
    isNewStory: boolean,
    storyModules: ModuleKey[],
    deployUrl?: string,
    deployHosts: string[],
    githubRepos: string[],
    vercelProjectId?: string,
    vercelProjectName?: string,
    vercelProjectDomains: string[],
  },
  enrichmentReadiness: {
    organizationCandidate: {
      eligible: boolean,
      blockers: string[],
    },
    updates: {
      eligible: boolean,
      blockers: string[],
      totalDocuments: number,
      publishedDocuments: number,
      exportablePublishedDocuments: number,
      malformedDocuments: number,
    },
    rawFieldIssues: string[],
  },
}
```

## PaynePros readiness

- `paynepros` is acceptable for safe, read-only organization enrichment if BEAM uses:
  - source provenance
  - `name`
  - `storyId`
  - `websiteUrl`
  - repo/deploy metadata as advisory only
- `paynepros` is not ready for updates-based enrichment.
- PaynePros cleanup needed now:
  - fix `whatsAppNumner`
  - add `primaryDomain`
  - confirm display name casing
  - delete or repair the malformed update document

## What should remain site/story metadata only

- `storyVideoUrl`
- `showOnFrontend`
- `isNewStory`
- story module URLs
- `deployUrl`
- `deployHosts`
- `githubRepo`
- `githubRepos`
- Vercel project linkage fields

## What should become canonical BEAM organization candidate data

- `name`
- `storyId` as source slug only, not BEAM primary key
- `websiteUrl`
- `primaryDomain`
- contact/support fields
- organization-level operational status
- source provenance fields

## What to fix first in Firebase/Firestore

1. Protect write APIs.
2. Preserve and export both `documentId` and `storyId`.
3. Normalize contact, repo, host, and timestamp fields.
4. Exclude `updates` from BEAM enrichment until validation is enforced.

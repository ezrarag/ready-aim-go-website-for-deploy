# Story Card Key Fields – Inventory & Acceptance

## 1. Inventory: client types and fields

### Client type (canonical)
- **`ClientDirectoryEntry`** (`lib/client-directory.ts`) – used by roster, story overlay, story detail page, and admin clients list/detail.
- **`Client`** on dashboard = `ClientDirectoryEntry` (type alias).
- **`FirestoreClientDoc`** (`lib/firestore.ts`) – raw Firestore document shape used in `mapClientDoc`.

### Existing URL/link fields (used for Story cards)

| Field             | Type    | Used for card | Admin edit |
|------------------|---------|---------------|------------|
| `websiteUrl`     | string? | **Website**   | ✅ Website URL |
| `appUrl`         | string? | **App**       | ✅ App URL |
| `appStoreUrl`    | string? | **App**       | ✅ App Store URL |
| `rdUrl`          | string? | **R/D**       | ✅ R/D URL |
| `housingUrl`     | string? | **Housing**   | ✅ Housing URL |
| `transportationUrl` | string? | **Transportation** | ✅ Transportation URL |
| `insuranceUrl`   | string? | **Insurance** | ✅ Insurance URL |

Other link-like fields (not used for Story cards):
- `deployUrl` – deploy/preview URL (admin only).
- `storyVideoUrl` – hero video (roster visibility).

---

## 2. Key fields (one per card)

| Card            | Key field(s)                          | Rule |
|-----------------|----------------------------------------|------|
| **Website**     | `websiteUrl`                          | Non-empty after trim → show card. |
| **App**         | `appUrl` or `appStoreUrl`             | At least one non-empty after trim → show card. |
| **R/D**         | `rdUrl`                               | Non-empty after trim → show card. |
| **Housing**     | `housingUrl`                          | Non-empty after trim → show card. |
| **Transportation** | `transportationUrl`                | Non-empty after trim → show card. |
| **Insurance**   | `insuranceUrl`                        | Non-empty after trim → show card. |

---

## 3. Visibility logic (no extra fetch)

- **Where:** `components/landing/hero.tsx` (effect when `showStoryOverlay` / `currentStory` / `clients` change).
- **Input:** `client = clients.find(c => c.storyId === currentStory)` from existing `clients` state (from initial `GET /api/clients`).
- **Rule:** Push a module key only if the corresponding key field is a non-empty string after `.trim()`.
- **Output:** `storyModuleKeysWithData` → passed to `StoryOverlay` as `moduleKeysWithData`. Overlay shows only those cards.

No loading state or extra network request for visibility; it’s derived from the client object already in memory.

---

## 4. Data flow (if fields were added)

- **Types:** `ClientDirectoryEntry` and `FirestoreClientDoc` include all seven URL fields.
- **Firestore:** `mapClientDoc` reads them; missing → `undefined`. PATCH updates write allowed fields.
- **API:** `PATCH /api/clients/[id]` allow-list includes `websiteUrl`, `appUrl`, `appStoreUrl`, `rdUrl`, `housingUrl`, `transportationUrl`, `insuranceUrl`.
- **Admin edit:**
  - **List:** `app/dashboard/clients/page.tsx` – Edit Client dialog: all seven URL inputs; save in `handleSaveEdit` PATCH body.
  - **Detail:** `app/dashboard/clients/[id]/page.tsx` – Edit Client dialog: same seven URL inputs; save in `handleSaveEdit` PATCH body.

---

## 5. Acceptance criteria

- [x] Populate URL fields in **Admin → Edit Client** (list or client detail), save → only the matching Story cards appear for that client (after refresh or refetch of the clients list).
- [x] If a key field is empty, that Story card does not render.
- [x] No loading state or extra fetch is used only to decide card visibility.

**How to test**

1. Open **Dashboard → Clients** (or **Dashboard → Clients → [a client]**).
2. Click **Edit** on a client that has a `storyVideoUrl` (so it appears in the roster).
3. Set e.g. **Website URL** only → Save.
4. On the **public site**, refresh, pick that client from the roster, open **STORY** → only the **Website** card should appear.
5. Clear **Website URL** and set **App URL** → Save. Refresh public site, same client, **STORY** → only the **App** card should appear.
6. Leave all URL fields empty → **STORY** for that client should show no cards (or “No story categories with updates yet”).

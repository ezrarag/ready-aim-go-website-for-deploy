# Ready Aim Go DevTools Extension

Chrome side-panel extension at `extension/readyaimgo-devtools`, modeled after the BEAM Home devtools extension in `home.beamthinktank.space`.

## What it does

- Groups checklist items by the active route (`devChecklists/{slug}` in Firestore — e.g. `readyaimgo`, `clients`)
- Captures page context for Claude handoff (“Copy for Claude”)
- Captures `console.warn` / `console.error` from the active tab
- **Drive tab:** saves shortcuts to specific **Google Drive folders** (open folder, “Save current folder”, then “Switch current” / “Open new”). It is a **personal bookmark/switcher** for folders you already use in the browser — it does **not** sync extension source code, read `.env.local`, or pull repo files from Drive.

### Centralizing extension code across repos

If the goal is one canonical copy of the extension that every repo uses: use **git** (submodule, shared package, or copy script) — not the Drive panel. The Drive feature is only for jumping between Drive folder URLs while you work; each unpacked extension instance still stores its own Firebase keys in Chrome (and/or gets them from that repo’s dev tab / `npm run build:extension`).

## Auto-detect Firebase (no manual typing in Chrome)

**Browsers do not allow extensions to read arbitrary files** such as `.env.local` on disk.

What works instead:

1. **Recommended (dev):** Run `npm run dev` in this repo. In development, the app mounts `RagDevtoolsBridge`, which sets `window.__RAG_DEVTOOLS_CONFIG__` from the same `NEXT_PUBLIC_FIREBASE_*` values Next already embeds from `.env.local`. Focus that tab, open the extension, and click **“Pull Firebase config from current tab”** (or open the panel after the tab loads — bootstrap also tries the active tab before the built-in stub).
2. **Offline / CI:** Run `npm run build:extension` to regenerate `extension/readyaimgo-devtools/generated/default-config.js` from `.env.local` / `env.example`.
3. **Fallback:** Paste keys in the setup form.

Ensure `.env.local` includes a full **web** app config: at minimum `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID`.

## Setup

1. From the repo root:

   ```bash
   npm run dev
   ```

   Optionally also `npm run build:extension` if you want the generated file populated without opening the site.

2. Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → choose `extension/readyaimgo-devtools`.
3. With a Ready Aim Go dev tab focused, open the side panel and connect (pull from tab if prompted).

## Page globals (for the bridge)

The dev bridge sets:

- `window.__RAG_DEVTOOLS_CONFIG__` — public Firebase fields (devtools key names)
- `window.__RAG_PAGE_DEBUG__` — route / origin / metadata for “Copy for Claude”

`page-bridge.js` still accepts fallbacks named `__BEAM_*` if you paste logic from the Home repo.

## Notes

- Storage keys and message namespaces are **RAG-specific** so this extension can sit alongside the Home devtools extension.
- Localhost defaults to checklist slug `readyaimgo`. Map another port to `clients` in the settings gear if the client portal runs on a different port.
- Firestore rules must allow access to `devChecklists/{doc}` for your dev/test principals if you use a shared checklist.

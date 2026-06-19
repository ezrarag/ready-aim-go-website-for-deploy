---
title: Starting & ending a session with Codex or Claude
category: Coding
summary: The two-part ritual — push your code, then log it — and why "log this" never saves your code by itself.
order: 1
video: /guides/sessions-codex-claude.html
---

There's an important distinction buried in here that's worth pulling apart, because conflating two different things will cause grief later.

## Two separate things are happening — and they're not the same

1. **The state log** — a human- and AI-readable summary of where the project stands (a markdown journal).
2. **The codebase itself** — your actual repo, pushed to GitHub via `git`. This is the real source of truth.

The state log is a *pointer to* and *summary of* the work. It is **not** a backup of the codebase, and saying "log this" does not push your code anywhere. Those are different actions with different tools.

## Starting a session

```
/init state
```

This makes the assistant read the project's state log and tell you where you left off.

## Ending a session — two parts

Ending a session has **two** parts, and they're easy to confuse:

```
1. (in terminal)  git add -A && git commit -m "..." && git push
2. (to the assistant)  log this
```

**Step 1 pushes your actual code to GitHub.** Step 2 records that you did it in the journal.

## The honest catch

Neither `log this` nor any phrase *guarantees* your codebase is pushed. The state log and the code are independent. If you only do step 2, the journal will *say* the code is saved while the code sits unpushed on your Mac.

A more honest end-of-session phrase, if you want the assistant to actually confirm rather than assume:

```
check git status, then log this
```

That makes it look at the repo first, report what's committed vs uncommitted, and only then write the log entry reflecting reality.

## Best practice: keep the log in the repo

Put the state log *inside* the repo at `scripts/STATE_LOG.md`. Then **both** Codex and Claude can touch it natively — Codex edits it on disk, Claude edits it via the filesystem, and it gets versioned in `git` automatically. Mirror it up to Google Drive only when you want NotebookLM or your phone to read it.

The repo is the source of truth; Drive is the readable mirror.

---

**The one-line version:** Two parts, every session — **push your code, then log it.**

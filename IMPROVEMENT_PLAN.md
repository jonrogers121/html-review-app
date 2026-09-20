# ProtoReview — Improvement Plan

**Status:** Draft · 2026-09-20
**Source:** Codebase audit of commit `61cdede` (~7,250 LOC source, 24 files)

---

## 1. Where we are

A working single-page React 19 + Firestore app. Upload a self-contained HTML file, render it in an iframe, drop numbered comment pins that anchor to DOM elements inside the prototype, annotate with SVG, thread discussion, export Markdown.

The pin-anchoring bridge (`src/utils/reviewBridge.ts`, 646 lines) is the real asset. It injects a script into the prototype document and re-resolves pins by CSS selector **and** text content (`src/types/index.ts:30-41`), so pins survive reflow. Commits `09c7b08` and `61cdede` show this was a deliberate rewrite after a glass-overlay approach drifted. That is the hard part of this product category and it is done well.

Everything else is prototype-grade.

## 2. Where we want to be

> **The review layer for AI-generated prototypes.** A designer, PM, or client reviews the HTML that v0 / Lovable / Bolt / Claude produced, and the output is a structured fix list the coding agent consumes directly.

Sold as a commercial SaaS: per-editor seats, unlimited free guest reviewers.

Two things make this defensible rather than a worse Pastel:

1. **Version carry-forward** — re-upload v2, pins re-resolve, you see what got fixed and what didn't.
2. **Agent round-trip** — structured JSON + an MCP server, so Claude Code or Cursor pulls open review items without a human copy-pasting.

`src/components/ExportModal.tsx:42-46` already emits each pin's CSS selector into Markdown. That's the seed of (2), unrecognised as such.

## 3. The gap

| Area | Now | Needed |
|---|---|---|
| Isolation | Uploaded HTML runs in the app's own origin | Separate user-content origin |
| Storage | HTML in a Firestore doc field (1 MiB cap) | Cloud Storage, metadata-only docs |
| Read cost | Every user streams every public project's full HTML | Bounded, projected queries |
| Authz | Members can rewrite ownership; personal backdoors in client code | Field-guarded rules + emulator tests |
| Tenancy | Email arrays per project | Org / workspace entity |
| Differentiation | Static `version: 1.0`, Markdown export | Version diffing, JSON + MCP export |
| Activation | Invites send no email | Transactional email, guest links |
| Revenue | Nothing | Stripe, plans, server-side quotas |
| Quality | 0 tests, no CI | Unit + rules + e2e in CI |

---

## Phase 0 — Security & correctness floor

**Gates any public exposure. Nothing here is a feature; it is the cost of being sellable.**
*Est. 3–4 weeks solo.*

### 0.1 Stop running untrusted HTML in our origin — **blocker**
`src/components/PrototypeViewer.tsx:429` sets `sandbox="allow-scripts allow-same-origin"` on a `srcDoc` iframe. Together those flags give uploaded HTML the parent origin: it can read the Firebase auth token from IndexedDB and act as the viewing user across all their projects.

- [ ] **Stopgap (days):** drop `allow-same-origin`. The bridge already talks over `postMessage`, so most of it keeps working. Two same-origin dependencies must move into the bridge first:
  - height sync reads `iframe.contentDocument` (`PrototypeViewer.tsx:153-174`) → have the bridge post its own `scrollHeight`
  - the `readyState === 'complete'` check (`:177`) → replace with a `bridge-ready` message
- [ ] **Real fix (Phase 1):** serve prototypes from a dedicated user-content origin off Cloud Storage. Lets prototypes keep working `localStorage`/cookies, which opaque-origin sandboxing breaks.
- [ ] Add a frame CSP; keep the sandbox allowlist minimal.

> Do **not** "fix" this by sanitizing uploaded HTML. Prototypes are the product; stripping their scripts destroys them. Isolate, don't sanitize.

**Done when:** a prototype containing `parent.document.cookie` / IndexedDB reads can observe nothing from the host app, verified by a test fixture.

### 0.2 Rewrite the Firestore rules
`firestore.rules:49-50` lets any member update the project doc — including `memberEmails`, `ownerId`, and `isPublic`. An invited client can promote themselves, evict the owner, or publish a confidential prototype. `firestore.rules:33` lets any signed-in user read every user profile.

- [ ] Field-level guards via `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])` — non-owners may not touch `ownerId`, `ownerEmail`, `members`, `memberEmails`, `isPublic`.
- [ ] Lock `/users/{uid}` reads to self. Author display data is already denormalised onto comments (`CommentPin.authorName`, `authorRole`), so nothing needs the collection-wide read.
- [ ] Split comment permissions: authors edit/delete their own, owners moderate, members reply and change status. Currently `allow read, write` to anyone who can read the project.
- [ ] Rules tests with `@firebase/rules-unit-testing` against the emulator (see 5.2).

### 0.3 Delete the identity heuristics
`src/utils/permissions.ts:38-48` grants access on substring matches for `opencorporates` and `jonrogers121`, and line 38 matches when either name *contains* the other — a user named "Jo" matches most member records. Firestore rules are the real gate so this isn't an active breach, but it must not ship.

- [ ] Replace `isUserMatch` with strict matching: `ownerId === user.id`, or exact normalized-email membership.
- [ ] Client check must mirror the rules exactly — divergence is how authz bugs hide.

### 0.4 Guard uploads
`src/components/NewProjectModal.tsx:45-51` reads the file with no size check, so anything over the 1 MiB Firestore doc limit fails silently on submit.

- [ ] Cap at ~700 KB until Phase 1.1 lands; surface a clear error.

### 0.5 Fix the pin-number race
`src/services/firebase.ts:472` reads the entire comments collection to compute the next pin number — O(n) reads per comment, and two concurrent reviewers get the same number.

- [ ] Use `runTransaction` against a counter field on the project doc.

### 0.6 Detach from the AI Studio scaffold
- [ ] `src/lib/firebase.ts` hardcodes project `databeat-501010` and an AI-Studio-generated named database. Move to env-injected config with separate dev/prod projects.
- [ ] Remove the unused `@google/genai` dependency (`package.json:15`) and the `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` claim in `metadata.json` — or make it real under 2.5.
- [ ] Replace the AI Studio boilerplate `README.md`.

---

## Phase 1 — Scale foundations

*Est. 4–6 weeks. 1.3 cannot be retrofitted cheaply; do it before real users exist.*

### 1.1 Move HTML out of Firestore
`htmlContent` is a document field (`src/types/index.ts:88`, written at `src/services/firebase.ts:387`).

- [ ] Prototype bodies → Cloud Storage. Project doc keeps `storagePath`, `sizeBytes`, `contentHash`.
- [ ] Serve through the isolated origin from 0.1.
- [ ] Migration script for existing documents.

### 1.2 Fix the subscription fan-out
`src/services/firebase.ts:291-381` runs three live listeners, one of them an unbounded `where('isPublic','==',true)`. Every user continuously streams the full HTML of every public project in the system. That cost curve goes vertical with adoption.

- [ ] Delete the global public listener; fetch public projects by ID on demand.
- [ ] With 1.1 done, list queries carry metadata only.

### 1.3 Organization / workspace model
Membership is currently an email array per project — there is no object to attach seat pricing to.

- [ ] `orgs/{orgId}` with `members[]`, `plan`, `seatCount`. Projects belong to an org.
- [ ] Rules and client access checks route through org membership.

---

## Phase 2 — The wedge

**The only phase that creates willingness to pay. Protect its budget.**
*Est. 6–10 weeks.*

### 2.0 Spike first: does carry-forward actually work? — **top technical unknown**
Pastel-style anchoring assumes v2 is an edit of v1. An LLM asked to "make the header bigger" may regenerate the entire document with different classes and restructured markup. If anchor resolution hits 30%, feature 2.1 is worthless and the positioning needs rethinking.

- [ ] Take 20 real prototypes, ask an agent for a typical revision, measure selector+text resolution rate against the v2 DOM.
- [ ] If the rate is poor, investigate visual/positional fallback or LLM-assisted anchor rematching before committing to 2.1.

**Do this spike before anything else in Phase 2.**

### 2.1 Version history with pin carry-forward
`version` is hardcoded to `1.0` (`src/components/NewProjectModal.tsx:85`) and never incremented, yet iteration is the whole point of prototype review. This is the retention feature.

- [ ] `projects/{id}/versions/{n}`, each with its own storage path.
- [ ] On upload, re-resolve every pin against the new DOM; classify **carried / moved / orphaned**.
- [ ] v1→v2 review diff: what got fixed, what didn't, what's new.

### 2.2 Structured agent export
`ExportModal.tsx:26-63` generates Markdown for humans. The same data is a machine-readable fix list.

- [ ] JSON export: `{ pin, selector, textAnchor, category, priority, body, thread, suggestedChange, viewport }`.
- [ ] An "agent brief" prompt format — paste straight into Claude Code or Cursor.
- [ ] **MCP server** exposing open review items, so an agent pulls them with no human in the loop. Cheap to build, and the stickiest thing on this list. Ship it early.

### 2.3 Ingest from where the prototypes actually are
- [ ] Paste a v0 / Lovable / Bolt share URL or Claude artifact → fetch and snapshot.
- [ ] CLI + GitHub Action: upload a built HTML file per PR, comment back with the review link.

### 2.4 Close the loop
- [ ] Auto-suggest resolution when a new version no longer matches a pin's anchored text.
- [ ] Apply an accepted `suggestedChange` directly to the next version.

### 2.5 AI first-pass triage *(optional, deprioritised)*
Auto-generate review pins for a11y, copy, and layout issues. Strong demo, weak retention — schedule after 2.1 and 2.2, and only if the `@google/genai` dependency is kept.

---

## Phase 3 — Activation loop

*Est. 3–4 weeks.*

### 3.1 Transactional email
`src/components/InviteModal.tsx:138` states it outright: "No email notification is sent automatically." A collaboration tool whose invites require a side-channel Slack message has no activation loop.

- [ ] Cloud Functions + Resend/Postmark: invites, new-comment digests, status changes.

### 3.2 Guest reviewers without accounts
Rules currently require `isSignedIn()` for everything. Clients are the reviewers — forcing signup at the review step kills the funnel, and free guests are what makes seat pricing work.

- [ ] Signed share links with token-scoped anonymous auth.

### 3.3 Onboarding
- [ ] Seed a sample prototype (`src/data/samplePrototypes.ts` already has good ones) into every new workspace.
- [ ] Empty state that drives the first upload; surface the keyboard shortcuts already implemented in `PrototypeViewer.tsx:78-105`.

### 3.4 Notification centre
The `activities` subcollection is already populated and only rendered in the sidebar — wire it to notifications.

---

## Phase 4 — Monetization

*Est. 3–4 weeks. Depends on 1.3.*

- [ ] **Plans:** Free (1 workspace, 3 active prototypes, 2 editors, no version history) / Pro / Team.
- [ ] **Stripe Billing** + customer portal; seat count syncs from org membership.
- [ ] **Server-side entitlement enforcement** in rules and Functions. Client-side quota checks are decoration.
- [ ] **Metering:** storage GB, project count, versions retained.
- [ ] Pricing page; upgrade prompts at limit boundaries.

**Pricing shape:** per-editor seat, roughly $12–20/mo, with unlimited free guest reviewers. Standard for the category (BugHerd, Pastel) and it depends on 3.2 shipping.

---

## Phase 5 — Ops & quality

*Est. 2–3 weeks concentrated, then ongoing. Start 5.1/5.4 during Phase 0.*

- [ ] **5.1** Vitest units, prioritising the `reviewBridge` resolver, `permissions`, and export serializers.
- [ ] **5.2** Firestore rules tests in the emulator (pairs with 0.2).
- [ ] **5.3** Playwright e2e: upload → pin → comment → export → new version.
- [ ] **5.4** GitHub Actions: typecheck, Biome lint (matches `delivery-web` / `p-lei-website` conventions), tests, rules tests, build.
- [ ] **5.5** Sentry + funnel analytics.
- [ ] **5.6** Bundle is 1.1 MB JS, mostly the Firebase SDK — code-split auth/firestore, lazy-load modals.

---

## Sequencing

```
Phase 0 ──┬─> Phase 1 ──┬─> Phase 2 (spike 2.0 first)
          │             └─> Phase 3
          └─> Phase 5.1 / 5.4 (start in parallel)
                              Phase 1.3 ──> Phase 4
```

- **Phase 0 gates public exposure.** No exceptions.
- **Phase 1.3 gates Phase 4** and gets more expensive every week it waits.
- **Phase 2.0 gates Phase 2.1.** Don't build carry-forward before measuring whether anchors survive AI regeneration.
- **Ship 2.2's MCP server as early as it can be slotted in** — smallest effort, largest differentiation, and the first thing an incumbent would copy.

**Realistic total: 5–8 months solo.** Phases 0, 1, and 5 are roughly half of that and produce no customer-visible value. Plan runway accordingly.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Anchors don't survive AI-regenerated v2 | Kills 2.1, weakens positioning | Spike 2.0 before committing |
| Vercel / Lovable ship native review | Window closes, plausibly within a year | Ship MCP + agent export early; go deeper on round-trip than a platform will bother to |
| Phase 0/1 consumes the runway | Sellable but undifferentiated | Timebox; keep 2.2 in the first shippable release |
| Firebase read/write costs at scale | Margin erosion | 1.1 and 1.2 are the fix; add cost monitoring in 5.5 |

## Non-goals

- Competing with Pastel / MarkUp.io / BugHerd on general web annotation.
- Design-stage review — Figma owns it.
- Hosting prototypes as a deployment target.
- Native mobile.

## Open questions

- Dedicated Firebase project, or migrate off Firebase before scaling? (Decide during 0.6 — the named-database coupling makes later migration harder.)
- Does the GitHub Action (2.3) matter more than URL ingest for the AI-prototype audience?
- Self-serve only, or is there a design-agency motion worth a sales touch?

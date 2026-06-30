# UI/UX Revamp Plan — UAE Insurance Underwriting Platform
**App:** `remix-of-case-opener` (React 18 + TS + Vite + shadcn/ui + Tailwind + TanStack Query)
**Branch:** `feature/ui-ux-revamp`
**Audience for this doc:** product + engineering review **before** implementation.
**Grounded in:** an 8-dimension code audit (nav/IA, ops pages, workbench, Studio, peripheral pages, component/design-system, microcopy/jargon, accessibility/responsive) + the existing `KT_DOCUMENT.md` and `PLATFORM_ENHANCEMENTS_AND_GAPS.md`.

---

## 0. Design thinking (the spine of every decision)

| Question | Answer |
|---|---|
| **Who is the user?** | Insurance **underwriters & ops teams** (internal, non-technical business users, 8 hrs/day) and **brokers** (external, occasional, on the Broker Portal). |
| **Primary action** | "What needs my attention, and what do I do next?" → **triage → review → record an auditable decision.** |
| **Emotion to evoke** | **Trust, calm, control.** Bank-grade, not flashy. Reduce anxiety on a regulated, decision-critical surface. |
| **The one thing they remember** | Every screen tells them *clearly* what's blocking and what to click next — in plain language. |
| **Aesthetic direction (committed)** | **Refined Minimal × enterprise/industrial discipline** — generous structure, one confident accent, hairline borders, tabular numerics, restrained motion, data-dense but legible. |

**Overriding constraint (per your brief): simplicity & intuitiveness for non-technical business users beats visual complexity.** Where a choice trades "impressive" for "obvious," we pick obvious.

---

## 1. Theme & visual language *(Step 2 — decided)*

### "Underwriter Blue" (Trust-Slate)
A deep **institutional trust-blue** accent on a calm **cool-slate paper** canvas (default light) with a true-charcoal dark mode. **Status colors are reserved exclusively for risk/compliance signals.**

**Why (domain + users, not preference):**
- **Insurance/finance ⇒ trust ⇒ blue.** The most validated trust color in financial services; the skill explicitly endorses "electric blue" as an opinionated (non-slop) accent.
- **It's a pass/fail risk tool.** Green/amber/red/sky must stay **semantic-only** (green = pass/approved, amber = needs review, red = risk/fail/reject, sky = info). A green or amber *brand* color would collide with those meanings — genuinely unsafe here. Blue is the only major hue that doesn't fight the status system. (This is *why* we move off the current teal, which sits next to success-green.)
- **8-hour business users ⇒ calm.** Low-glare slate canvas, hairline borders, restrained motion ⇒ less fatigue, lower cognitive load.

**Tokens (drop-in for `src/index.css` HSL system):**
```css
/* LIGHT */
--background:213 30% 98%;  --foreground:222 25% 12%;  --card:0 0% 100%;
--primary:221 72% 38%;     --primary-foreground:0 0% 100%;  --ring:221 72% 38%;
--success:142 64% 30%;     --warning:38 92% 40%;  --destructive:354 70% 48%;  --info:199 89% 42%;
--border:214 20% 86%;
/* DARK */
--background:222 24% 7%;    --foreground:213 20% 95%;  --card:222 20% 10%;  --primary:214 90% 62%;
```
> Status text lightness is intentionally **darkened from today's values** to pass WCAG AA on tinted chips (see §6 — current warning text is ~2:1).

### Typography
- **Body / data:** keep a hyper-legible grotesque (**Inter / Inter Tight**). Justified: this is a data-dense ops tool; the skill permits Inter when legibility demands it. Tabular numerics for IDs, counts, confidence, money.
- **Display / brand:** introduce a **distinctive display face for login + brand + major page titles** to add character and avoid the AI-slop look. Recommendation: **Fraunces** (refined contemporary serif → "established, trustworthy, premium finance"). Alternative: a sharp grotesque (Clash Display / Cabinet Grotesk) if you prefer modern over classic.
- **Mono:** JetBrains Mono for reference IDs, codes, and ticker labels (already present).

### Token hygiene (design-system foundation)
- **Activate the dead tokens:** `--stage-complete/active/pending` and `--confidence-high/medium/low` exist but have **zero usages** — wire them up so stage/confidence states stop being ad-hoc.
- **Fix AA contrast** on status text (warning/success/primary) — see §6.
- Standardize **tonal opacity** (`/10` everywhere, not the current `/10` vs `/12` vs `/15` drift) and **radius** (the 6px `sm/md/lg` scale, retire stray `rounded-xl/2xl/3xl`).
- Atmosphere, used sparingly: faint grid only on `/login`, single-layer shadows, `refined` cubic-bezier entrances, **full `prefers-reduced-motion` support**.

---

## 2. Information architecture & navigation

### Problems found
- **Two separate nav systems with a hard context-switch** — entering `/studio` force-collapses the global rail and swaps in a different 10-item sidebar; the only way back is "Exit Studio." Feels like leaving the app. *(high)*
- **Engineer jargon in business nav:** "AI Studio," "Workflows / Stage pipelines," "Checks," "Integrations / External API providers," "Jobs / Polling history," "Inbound," "Census rulebooks." *(high)*
- **Inert notification bell** (no click, no panel, no route) yet shows an unread dot. *(high)*
- **Placebo theme toggle** (no handler, no provider). *(med)*
- **No breadcrumbs**; deep routes (workbench, evidence pack, Studio) lose wayfinding. *(med)*
- **Duplicate/ambiguous "Settings"** (account `/settings` vs `/studio/settings`). *(med)*
- **No route-level RBAC** — any logged-in user (even a "viewer") can open the entire admin Studio. *(high, trust/audit)*
- **Dead `GlobalHeader.tsx`** — a second, divergent shell with its own inert bell. *(med)*

### New IA — one persistent left nav, three groups, plain labels, role-gated

| Group | New label | Route | Was | Role |
|---|---|---|---|---|
| **Work** | My Dashboard | `/dashboard` | Dashboard | everyone |
| | Requests | `/requests` | Requests | everyone |
| | *(in-request context: Summary · Review · Decision file as tabs/breadcrumb, not top-level)* | `/request/:id/*` | — | everyone |
| **Configuration** *(was "AI Studio")* | Overview | `/studio` | Overview | admin/operator |
| | Review stages | `/studio/workflows` | Workflows | admin/operator |
| | Documents & data capture | `/studio/documents` | Documents | admin/operator |
| | Validation checks | `/studio/checks` | Checks | admin/operator |
| | Employee-list rules | `/studio/census-rulebooks` | Census rulebooks | admin/operator |
| | Incoming email | `/studio/inbound` | Inbound email | admin/operator |
| | Email log | `/studio/jobs` | Jobs | admin/operator |
| | Email templates | `/studio/messages` | Messages | admin/operator |
| | Connected services | `/studio/integrations` | Integrations | admin/operator |
| | Workspace rules | `/studio/settings` | Settings | admin |
| **Account** | My profile | `/profile` | Profile | everyone |
| | Preferences | `/settings` | Settings | everyone |

**Global element fixes (done while restructuring):**
- **Notifications:** real panel (popover/drawer) wired to the existing `api.notifications` + a mark-read flow; remove the inert dot-only bell. *(If backend mark-read is unavailable, ship read-only list + "view all," never an inert control.)*
- **Breadcrumbs:** add to the TopBar for deep routes (`Requests › [Company] › Review`; `Configuration › Documents`).
- **One shell:** delete `GlobalHeader.tsx`; keep `AppLayout` (Sidebar + TopBar).
- **Command palette:** align labels 1:1 with the new sidebar (single vocabulary), add the missing "Employee-list rules," and surface a **visible search/command trigger at all breakpoints** (currently hidden below `md`).
- **Theme toggle:** make it real (mount a ThemeProvider) or remove it.
- **RBAC:** extend `ProtectedRoute` to take a required role; wrap `/studio/*`; hide the Configuration group for viewers.
- **Brand:** retire the placeholder "InsureAuto ops" wordmark for a domain-true name (decision needed).
- **Code-split** the Studio routes (`React.lazy`) so day-to-day users don't download the admin bundle.

---

## 3. Page-by-page UI changes

### Operational core

**My Dashboard (`/dashboard`)**
- **Outage looks like a calm empty day** (`Promise.allSettled` swallows failures → all-zeros). → Add a persistent inline **error + retry** banner; distinguish "no work" from "system down." *(high)*
- **KPI tiles all deep-link to a bare `/requests`.** → Each tile carries its filter into the inbox (e.g. "Past deadline" → inbox pre-filtered to overdue). *(high)*
- **"Who's handling what" is empty** (owner hardcoded "Unassigned"). → Wire to real owners, or hide the panel until owner data exists (no fake panels). *(med)*
- Range toggle (Today/Week/Month) only half-applies. → Apply consistently or scope it visibly. Fix the **three identical "Census" bars** (label each stage distinctly). Add a **refresh / last-updated** indicator.

**Requests Inbox (`/requests`)**
- **Server failure shows "Inbox zero."** → persistent error/retry; never tell an underwriter their queue is clear during an outage. *(high)*
- **Fake Broker/Owner columns** (hardcoded). → real data or hide columns + their filters/sorts. *(high)*
- **Select-all can select rows hidden in collapsed triage groups** → only act on truly visible rows (or clearly state scope). *(high)*
- **Destructive delete uses `window.confirm`, no undo.** → styled confirm + **undo** (soft-delete/toast-undo). *(high)*
- **Bulk approve/reject loops per-id, reports only "X ok / Y failed."** → list failures, allow retry; one transactional summary. *(high)*
- Add **per-row approve/reject** using the *one* shared decision modal (§4). Simplify the bloated status set (Issued/Published/Ready-for-Export → one clear end-state). Auto-refresh / stale indicator.

**Request Summary (`/request/:id`)**
- **Approve/Reject via `window.prompt` with optional comment** → replace with the shared **DecisionModal** (mandatory reason). *(high)*
- **Approve never gated by readiness** — page even computes "X critical risks blocking" yet leaves Approve enabled. → **gate** + a confirmation summarizing what's being approved. *(high)*
- **Silent partial-load → false "all clear"** (readiness fallback shows 0 missing/all passed). → surface load failures; never render a safe-looking case from a failed fetch. *(high)*
- **SLA computed 3 different ways across app** → single source of truth (use backend `sla_deadline`). *(high)*
- Fix placeholder broker/assignee; make "Keep as is" actually flag (today it only toasts); reorder the classifier dialog so destructive "Remove file" isn't in the primary-confirm slot.

**Underwriter Workbench (`/request/:id/workbench`)** — the adjudication surface
- **Three different decision UIs in one screen** (DecisionModal / `window.prompt` for risk resolution / MOL bulk-dialog vocabulary). → **one consistent decision pattern** (§4). *(high)*
- **MOL / member-list reviewer decisions saved only to `localStorage`, keyed by name** — lost across devices, invisible to auditors, never in the evidence pack. → durable, audited decisions (UI ready now; needs a backend endpoint — flagged in §8). *(high)*
- **Owner assignment is a local stub** (state only, reverts on reload). → persist via API or hide until wired. *(high)*
- Plain-language the stage/checklist labels (§5); keep the strong PDF↔extracted-data split-view and click-to-locate.

**Evidence Pack (`/request/:id/evidence-pack`)**
- Keep the (good) printable PDF export and print CSS. Consolidate the **5 hand-rolled status pills** into the shared Badge; unify the **inconsistent confidence thresholds** (95/85 vs >90) into one shared helper. Ensure overrides + audited MOL decisions actually appear here once durable.

### Configuration (was AI Studio)
- Reframe top-to-bottom for a **business admin, not an engineer**: rename modules (§2 table), rewrite descriptions (§5), and replace vendor/ML terms ("NER," "Tavily," "provider/credential/capability," "poll/ingest/jobs") with function-first plain language.
- Keep the genuinely strong data-driven config engine; just make labels, empty states, and helper text legible. Unify the **two STATUS_TONE copies** and the **separate WizardStepper** with the app's components. De-jargon "Connected services" (services / what it can do / saved key) and "Email log" (received / what happened).

### Peripheral
- **Login:** the one place to deploy the display font + restrained atmosphere (faint grid) — make it feel premium and trustworthy. De-jargon hero copy ("extraction," "confidence scoring").
- **Broker Portal (external):** highest clarity bar — a non-technical broker uploading docs. Plain reference label (never "smart_id"), "We couldn't tell what this file is — please choose its type," explicit expired-link recovery. Keep its already-good empty/error baseline.
- **Profile / Settings:** remove cosmetic/non-persistent controls and fake "connected"/metrics; keep only what works (and wire the theme toggle). Disambiguate from "Workspace rules."
- **NotFound / not-found states:** distinguish a true 404 from a transient error; always offer retry, not just a dead-end.

---

## 4. UX flows (built for non-technical business users)

1. **One decision flow, everywhere.** Promote `DecisionModal` (styled dialog + **mandatory reason** + semantic success/destructive) to the single approve/reject/publish pattern across Inbox (row + bulk), Summary, and Workbench. **Readiness-gated** (can't approve a blocked case without an explicit, logged override), **reversible** where possible, **fully audit-logged**. Retire `window.prompt`, `window.confirm`, and the dead 4th pattern.
2. **Triage that pays off.** Dashboard KPI tiles → pre-filtered inbox. One shared status vocabulary across Dashboard/Inbox/Header/Evidence. SLA computed once → consistent deadlines everywhere; show "Time left," not "SLA."
3. **Outages never read as 'all clear.'** Standard pattern: inline error + cause-free reassurance + **Retry**, with partial-load guards so a failed fetch never renders a safe-looking case.
4. **Member-list (MOL) review in plain words, durably saved.** "Government labour records (MOL/MOHRE)" vs "employee list," side-by-side name match + confidence, decisions persisted & audited and shown in the evidence pack.
5. **Broker round-trip.** Clear "Ask broker for documents" (not "Request Missing Info"), status visibility, friendly portal, explicit link-expiry recovery.
6. **Notifications center** — real panel + mark-read; SLA-risk and new-submission alerts land somewhere.
7. **Owner assignment & escalation** — persisted and visible (or hidden until backend-ready; no stubs/dev toasts like "Escalation dialog would open here").
8. **Guidance & empty states** — affirming, plain ("All required documents received"), with the next action attached.

---

## 5. Content & microcopy (plain language)

### Principles
1. Write for a busy business reader (~Grade 8). **Expand every acronym on first use**, keep it on hover (MOL/MOHRE, AML, KYC, PEP, SLA, NER, FTA, DED).
2. **Plain verbs, one per concept:** send, read, check, compare, sort — not publish/book, extract, validate, cross-validate, ingest, poll, adjudicate, classify.
3. **Engineering internals never reach the user** (handler, S3 bucket, credentials, JSON, agent trace, poll job, doc_type, normalize → logs only).
4. **Every error: what happened → what to do → reassurance** (+ retry; tailor to audience — never tell an underwriter to "configure S3 credentials").
5. **Risk/compliance copy: accurate but calm.** Replace "BLOCKED — HARD STOP" with "Can't approve yet — a sanctions match needs review." Always pair a verdict with *how sure* (confidence) and *why/where* (source doc/link).
6. **Consistency across surfaces** — one canonical label per status everywhere.
7. **Never ship dev placeholders** to production UI.

### Glossary → plain language (representative; full set in audit)
| Current (jargon) | Plain-language replacement |
|---|---|
| MOL / MOHRE | Government labour records (the staff a company registered with the UAE labour ministry) |
| census | Employee list / staff list (the people to be insured) |
| handler / handler_name | The check that runs (or hide it) |
| cross-validation | Comparing the same detail across documents |
| entity screening | Background / sanctions check on the company & owners |
| readiness | Whether the request is ready to decide |
| evidence pack | Decision file (audit-ready summary of the decision) |
| smart_id | Reference number |
| SLA | Deadline / time left |
| PEP / AML / KYC | Politically Exposed Person / anti-money-laundering checks / identity check (expand first use) |
| NER / DED / FTA | (hide NER) Trade-licence activity check / Dept. of Economic Development / Federal Tax Authority |
| extraction / re-extract | Reading the document / re-read document |
| classifier / auto-classified | We automatically sorted your file |
| adjudicate | Decide (approve or reject) |
| override / bypass | Approve anyway, with a logged reason / skip with a reason |
| agent / agent trace | What the AI checked / AI activity log |
| queue | Assigned team |
| publish / publish data / book | **Send to insurer** (one label everywhere) |
| ingest / poll / jobs | Received emails / check mailbox now / email log |
| provider / credential / capability | Service / saved key / action |
| workforce mismatch | Staff numbers don't match (labour records vs employee list) |

### Errors/empties — house style (examples)
- "Failed to load requests from server" → **"We couldn't load your requests. Check your connection and try again."**
- S3/credentials errors → **"We couldn't save your file. Please try again — if it keeps happening, contact support."** (log the technical detail)
- "Evaluating readiness…" → **"Checking what's left to do…"**
- "auto-classification couldn't map these" → **"We couldn't tell what these files are. Please choose the document type for each."**
- Remove: *"Escalation dialog would open here"*, *"Document creation will be supported in a future update"* (hide control or honest "coming soon").

---

## 6. Accessibility & responsive

### Accessibility (WCAG 2.1 AA target)
- **Names on icon-only buttons** — only ~16 `aria-label`s vs 49 icon buttons; worst is the notification bell. Add labels everywhere (don't rely on `title`). *(high)*
- **AA contrast on status colors** — warning text ~2:1, success/teal ~3.3–3.9:1 on tinted chips. Darken status text tokens (see §1) / use solid chips; verify each pair ≥4.5:1. **Critical in a pass/fail tool.** *(high)*
- **Status never by color alone** — add icon/shape/text to SLA dots, triage dots, donut/flow legends (the verification tiles already do icon+label+color — replicate). *(med)*
- **Invisible-until-hover delete** → reveal on `focus-within`, add label; reachable by keyboard/touch. *(high)*
- **Table sort** → real `<button>` headers + `aria-sort` + SR direction. *(med)*
- **Form labels** (Settings/Profile) → associate via `htmlFor`/`id` or `aria-label`. *(med)*
- **Skip-to-content** link; consistent heading hierarchy (no `h1→h3` skips). *(med)*
- **Reduced motion** — global `prefers-reduced-motion` override; stop infinite shimmer/pulse loops (only 3 utilities are gated today). *(med)*
- Keep the good foundations: global `:focus-visible` ring, semantic landmarks, Radix focus-trapping, alt text, inbox keyboard model.

### Responsive
- **Primary sidebar has no mobile mode** (fixed 240/56px → ~64% of a phone). → off-canvas drawer + hamburger (mirror the Studio offcanvas that already works). *(high)*
- **Search/command trigger hidden below `md`** → visible icon trigger at all breakpoints. *(med)*
- **Data tables** → card/stacked layout under `md` (inbox already hides columns progressively — extend to dashboard table). 
- **PDF viewer** → fit-to-width default on narrow screens; label zoom/external buttons.
- Breakpoints: Mobile <640 · Tablet 640–1024 · Desktop >1024; fluid type via `clamp()` on display surfaces.

---

## 7. Component / design-system consolidation

- **One status system:** route all status/severity/tone through `Badge` variants + the (now-activated) `stage-*`/`confidence-*` tokens. Kill the **~13 local color maps** and **5 hand-rolled pills** (cross-screen drift today: "Issued" = teal in inbox vs green in dashboard).
- **One decision modal, one stepper, shared confidence/severity helpers** (retire the duplicate `WizardStepper` visual language and duplicated `SEVERITY_STYLES`/thresholds).
- **Delete dead code** (~3k lines): the entire orphaned `components/verification/` island (incl. the dead 4th decision bar `OpsAdjudicationBar`), old `case/*` (`ActiveStagePanel`, `CaseHeader`, `ChecklistPanel`, `DocumentsPanel`, `ExportPanel`, `WorkforceMismatchBanner`, etc.), `layout/GlobalHeader`, and orphaned `request/*` panels. (Verify with a no-importers check before removal.)
- **Token discipline:** replace ~58 hardcoded palette colors with semantic tokens; standardize tonal opacity & radius.
- **Route-level code-splitting** for Studio.

---

## 8. Phased implementation sequence

> The backend (`insure-be`) is a **separate repo**. Items needing API work are flagged; everything else is pure-frontend and safe to do now on this branch.

**Phase A — Foundation & quick wins (frontend-only):**
1. Theme tokens + AA contrast fixes + fonts (display face on login/brand). Activate dead tokens.
2. Design-system consolidation: single Badge/status, single DecisionModal, single stepper, shared helpers.
3. Delete dead code; route-level code-splitting.
4. Accessibility baseline: aria-labels, skip link, reduced-motion, table-sort semantics, form labels, color+icon status, visible delete.
5. Responsive: off-canvas sidebar, mobile search trigger, table→card, PDF fit-to-width.
6. Microcopy pass (glossary, buttons, errors/empties; remove dev placeholders).
7. Nav/IA: rename to plain labels, one shell, breadcrumbs, command-palette alignment, **client-side RBAC gating** of Configuration, working theme toggle.
8. Robust error/empty/outage states + partial-load guards across Dashboard/Inbox/Summary.
9. Notifications panel (read-only with existing API if mark-read isn't ready).

**Phase B — Needs backend coordination (`insure-be`):**
- Durable + audited MOL/member-list decisions (replace localStorage).
- Persisted owner assignment + real escalation.
- Server-enforced approval gating; notifications mark-read; single-source SLA; real broker/owner data feeding the columns/panels.

**Non-goals / guardrails:** this is a **revamp, not a rewrite** — preserve all current functionality, keep the strong bits (Studio config engine, PDF↔data split-view, SLA triage, evidence-pack export, CaseStepper), and change UI/UX + copy, not business logic.

---

## 9. Open decisions (for your review)
1. **Theme + display font** — approve "Underwriter Blue" + Fraunces? (or keep teal / pick a modern grotesque display)
2. **Default mode** — light default (recommended for document-heavy work) vs dark vs equal.
3. **Brand name** — replace the "InsureAuto" placeholder with a real product name?
4. **Scope to implement now** — all of Phase A, or a prioritized subset first?

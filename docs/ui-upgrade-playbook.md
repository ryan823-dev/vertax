# VertaX UI Upgrade Playbook

Status: working playbook for the next customer UI upgrade round.
Scope: customer workspace, shared product shell, Radar, Daily Workspace, and high-frequency workbench pages.

## 0. Reference Input

This playbook intentionally references the external web-design skill reviewed in:

- `C:\Users\Administrator\AppData\Local\Temp\codex-web-design-skill`
- commit `32a23cd Initialize web application with React, TypeScript, and Vite setup`

The skill is useful as a **design review and transformation workflow**, but it should not be copied into VertaX production rules as-is.

What VertaX should absorb:

- read the existing code and design system before designing
- declare design decisions before implementation
- produce a small direction sample before broad rollout
- implement from structure and semantics, not color changes alone
- verify in browser with desktop and mobile screenshots
- reject generic AI-looking design habits such as purple/blue gradients, excessive rounded cards, fake data, emoji-as-icons, and decorative SVG filler

What VertaX should not absorb:

- single-file HTML artifact habits
- CDN-first or inline-Babel implementation patterns
- portfolio, landing-page, or deck-style composition defaults
- Tweaks panel conventions as production UI practice
- "stunning" as a goal for dense customer workbench screens

For VertaX, the skill is a source of discipline, not a source of visual identity.

## 1. North Star

VertaX customer UI should move toward **Calm Intelligence Workbench**:

- calm: restrained color, restrained motion, low visual noise
- precise: clear hierarchy, clear states, clear affordances
- operational: optimized for repeated work, scanning, triage, and action
- intelligent: AI feels embedded in the workflow, not advertised as decoration

The product should read as a workbench, not a luxury cockpit, reporting dashboard, or marketing showpiece.

Executable standard:

> VertaX customer UI = Calm Intelligence Workbench: calm, precise, scannable, and suitable for repeated AI growth operations.

This sentence is the aesthetic north star for customer UI review. It favors structure over decoration, work surfaces over default cards, and operational clarity over premium-showcase styling.

## 1.1 Product Meaning

VertaX is an AI growth-system building service for Chinese companies starting overseas growth from 0 to 1.

The customer is usually not a mature multinational team. They are a capable manufacturing, supply-chain, product, or industry company that has real delivery strength but lacks a systematic overseas market function.

The product promise:

- help the customer move from "I do not know how to start overseas growth" to a repeatable overseas growth system
- turn product, technical, application, supply-chain, and industry knowledge into market-facing expression that overseas buyers can understand
- clarify target countries, industries, customer types, decision makers, and demand signals
- build long-term content, SEO, GEO, search, AI-discovery, and trust assets
- support proactive outreach through data, email, WhatsApp, LinkedIn, and related channels
- connect leads, conversations, market feedback, sales actions, and content updates into an iterative growth loop

VertaX should feel like a virtual overseas team made of AI agents and outside experts, not a single marketing tool and not a traditional agency console.

## 1.2 UI And Copy Implications

Customer UI must answer four questions quickly:

- Where is this company in its overseas 0-1 journey?
- What capability is missing or weak right now?
- What should the team do next, and why?
- What evidence or feedback changed the recommendation?

Use product language that matches capability building:

- market cognition
- customer profile
- brand expression
- content and SEO/GEO assets
- proactive outreach
- opportunity advancement
- feedback loop
- overseas growth system

Avoid language that makes the product feel like a passive reporting dashboard:

- vanity summaries without a next action
- generic "growth dashboard" claims
- "CEO cockpit" or executive-premium framing
- decorative AI slogans that do not explain what the agent knows or can do

The strongest customer-facing promise is:

> From scattered outreach attempts to a continuously operating overseas growth system.

The stronger emotional direction is:

> Let Chinese companies' product strength be seen, understood, trusted, and converted into overseas market outcomes.

These lines should guide page hierarchy and copy, but authenticated product screens should still be concise and operational.

## 1.3 Upgrade Workflow

Every UI upgrade pass should follow this order:

1. Inspect the current files, token sources, shared components, and page structure.
2. Write the design decision for the pass: color ratio, density, radius, shadow, motion, layout hierarchy, and state model.
3. Create a narrow v0 direction in the smallest safe surface.
4. Implement the full scoped unit only after the direction is coherent.
5. Verify with desktop and mobile browser screenshots.
6. Check overflow, overlap, nesting, responsive compression, button states, and real click flow where relevant.

This workflow is meant to prevent local reskinning and force structural convergence.

## 2. Non-Negotiable Rules

- Do not default page sections to cards.
- Do not nest cards inside cards.
- Use cards only for independent repeated objects, such as a company, task, alert, evidence item, or recommendation.
- Use blue/cyan for primary interaction and intelligence cues.
- Use gold only as rare brand accent. Gold must not mean primary action, status, active navigation, premium access, or success.
- Do not introduce new `cockpit`, `gold`, or executive-premium semantic names.
- Reduce large radii and heavy shadows. Prefer 6-12px radii for controls and panels, with larger radii only for rare hero surfaces.
- Every page upgrade must include desktop and mobile browser screenshot verification.
- Every interaction-heavy upgrade must include a real click-flow check, not only a static build.

## 2.1 Negative List

The following patterns are design debt in the customer workspace. New work should not introduce them, and migration work should remove them when touching the relevant surface:

- cards inside cards
- page sections that are card-shaped by default
- large rounded containers as the default layout unit
- heavy shadows or glow as primary separation
- large gradients as product-workbench decoration
- gold primary buttons, gold active states, or gold status pills
- `cockpit`, `executive`, `growth chamber`, or premium-showcase semantics in new customer UI
- decorative badges, capsules, icons, or micro-ornaments that do not carry state or action
- fake data, fake icons, or visual filler used to make a surface feel richer
- marketing-page composition inside authenticated customer workflows

The default improvement move is deletion before addition: remove excess wrappers, shadows, radius, badges, and gradients before adding new visual treatment.

## 3. Surface Language

Use these terms for new work:

| Term | Purpose | Visual Direction |
| --- | --- | --- |
| Work surface | Primary page canvas | Full-width or constrained workspace, no decorative card wrapper |
| Section band | A page region with one job | Border or subtle background separation, not a floating card by default |
| Data panel | Dense metrics, table controls, filters | Compact, low shadow, strong alignment |
| Object card | One repeated object | Company, task, evidence, draft, recommendation |
| Status pill | State only | Success, warning, risk, active, neutral; never brand gold |
| Toolbar | Actions and filters | Compact, predictable, icon-aware |
| Detail drawer | Focused secondary workspace | For inspection/editing without losing list context |

Avoid using "card" as the generic answer to every layout problem.

## 4. Token Hierarchy

The current code already contains the right strategic direction in two places:

- `src/app/globals.css`: customer `ci-*` tokens, Calm Intelligence surfaces, signal blue, reduced gold role
- `src/lib/design-tokens.ts`: neutral/cool background, blue/cyan brand system, status colors

The next pass should make hierarchy explicit:

1. **Platform tokens**: shadcn/Tailwind semantic tokens such as `--background`, `--primary`, `--border`.
2. **Customer workbench tokens**: `ci-*` tokens for customer product surfaces and shell.
3. **Legacy compatibility aliases**: old cream/navy/gold/cockpit names, kept only to prevent breakage.
4. **Deprecated legacy classes**: `cockpit-container`, `cockpit-container-v2`, `btn-gold`, `badge-gold`, `btn-gold-v2`, `btn-gold-sm`, `navy-card`, `report-card`, `highlight-card`.

New pages should use levels 1 and 2 only.

## 5. Component Rules

### Buttons

- Primary: signal blue, direct user action.
- Secondary: neutral surface, supporting action.
- Ghost: toolbar or dense row action.
- Destructive: destructive only.
- Gold/brand accent: rare brand-signature moment only; not a default CTA.

### Badges And Pills

- Use badges for labels and categories.
- Use status pills for system state.
- Do not use gold for status.
- Make loading, disabled, error, partial-data, and success states visible.

### Panels

- Use panels for dense tools, side workspaces, and grouped controls.
- Keep border and background subtle.
- Avoid large drop shadows and ornamental gradients.

### Tables And Lists

- Radar-heavy pages should prefer list/table plus detail/workspace regions over a pile of object cards.
- Provide density controls where lists are long.
- Truncate long text predictably and expose full text with title or tooltip.

## 6. Current Audit

Audit command fallback used PowerShell `Select-String` because `rg.exe` returned Access denied in this Windows session.

### Product Workspace Summary

Scope scanned:

- `src/app/customer`
- `src/components/customer`
- `src/components/ui`
- `src/lib`

Findings:

| Pattern | Count | Files | Meaning |
| --- | ---: | ---: | --- |
| `ci-` | 111 | 4 | Calm Intelligence language exists but is concentrated, not yet normalized |
| `rounded-2xl` | 216 | 29 | Radius density is still too high for an operational workbench |
| `rounded-3xl` | 12 | 3 | Large-radius containers remain in high-frequency pages |
| `shadow-2xl` | 3 | 3 | Heavy shadow remains in shell/mobile drawer usage |
| `bg-gradient` | 15 | 9 | Gradients still appear as structural decoration |
| `Card` | 105 | 16 | Card language is still over-broad in product pages |
| `gold` | 3 | 2 | Product workspace use is limited, but global legacy gold remains extensive |
| `cockpit-container` / `btn-gold` / `badge-gold` | 0 | 0 | Not active in scanned product TSX, but still defined globally |

### Global Legacy CSS

`src/app/globals.css` still defines legacy cockpit/gold classes:

- `cockpit-container`
- `cockpit-container-v2`
- `report-card`
- `report-card-v2`
- `navy-card`
- `btn-gold`
- `btn-gold-v2`
- `btn-gold-sm`
- `badge-gold`
- `highlight-card`
- `highlight-card-v2`
- `secretary-card`
- `secretary-card-v2`
- `btn-navy-gold`
- `animate-pulse-gold`
- `animate-gold-glow`

These should become deprecated aliases first, then be removed after product pages are migrated.

### Shell Audit

Files:

- `src/components/customer/customer-shell.tsx`
- `src/components/customer/customer-header.tsx`
- `src/components/customer/customer-sidebar.tsx`

Issues:

- Shell background still uses decorative radial gradients behind every page.
- Header uses multiple small panel/pill elements in one row, which makes it read like stacked capsules.
- Sidebar brand area uses a large rounded container and gradient avatar treatment.
- Sidebar active state uses gradient and shadow, not only location clarity.
- Mobile menu button and drawer still use `rounded-2xl` / `shadow-2xl`.
- Sidebar footer AI block is another card-like object inside the navigation shell.

Recommended first cut:

1. Keep the dark sidebar as structure, but reduce ornamental gradients, large radii, and heavy shadow.
2. Convert header identity area from pill/card stack into a compact title/status row.
3. Replace shell background decoration with a quieter work surface.
4. Establish shared shell classes before touching individual pages.

### Home Audit

File:

- `src/app/customer/home/page.tsx`

Issues:

- Main hero section uses `ci-panel-strong`, grid decoration, and `rounded-[32px]`, so the first viewport still behaves like a showcase card.
- Several sections use `rounded-[28px]`, `rounded-[24px]`, or `rounded-[22px]`.
- Metric cards and action cards are useful objects, but the page structure around them is still card-heavy.
- The AI Copilot area is directionally right, but should become an integrated workbench band instead of another large panel stack.

Recommended second cut:

1. Keep the AI-first hierarchy.
2. Convert the top area into a work surface with clear left/right regions.
3. Keep object cards for metrics/actions only.
4. Replace large rounded section wrappers with section bands and data panels.

### Radar Prospects Audit

Target:

- `src/app/customer/radar/prospects/page.tsx`

Expected migration direction:

- list region
- detail region
- outreach workspace
- history/evidence region

This page should not be solved with nicer cards. It needs a task-oriented layout model.

### Daily Workspace Audit

Target:

- `src/app/customer/radar/daily/page.tsx`

Expected migration direction:

- priority queue
- today focus
- follow-up states
- action feedback

This should feel like a daily operations board: dense, ordered, and scannable.

## 7. Recommended First Implementation Unit

First checkpoint: **Customer Shell convergence**.

Why this comes before Home:

- It affects every customer page.
- It removes the strongest remaining cockpit feel.
- It gives later pages a stable canvas.
- It keeps the change surface smaller than rewriting Home and Radar at once.

Files:

- `src/app/globals.css`
- `src/components/customer/customer-shell.tsx`
- `src/components/customer/customer-header.tsx`
- `src/components/customer/customer-sidebar.tsx`
- optionally `src/components/ui/button.tsx`
- optionally `src/components/ui/badge.tsx`

Do not include unrelated Radar backend, outreach, or tenant behavior work in this checkpoint.

## 8. Validation Protocol

Every checkpoint must record:

- `npx tsc --noEmit`
- `npm run ui:audit`
- desktop screenshot of the changed page or shell
- mobile screenshot of the changed page or shell
- visual check for text overflow, overlap, card nesting, heavy radii, and excessive shadows
- interaction check for changed controls

For shell work, verify at minimum:

- `customer/home`
- `customer/radar/prospects`
- `customer/radar/daily`
- mobile navigation open/close
- sidebar collapse/expand on desktop

## 8.1 Screenshot Review Scorecard

Every desktop and mobile screenshot should be reviewed against the same questions:

- Is the first viewport cramped?
- Is the scanning path obvious from page state to primary action?
- Are there too many borders, shadows, rounded containers, or decorative wrappers?
- Is the primary action visible without competing badges or capsules?
- Do colors represent real meaning: action, status, warning, error, or selection?
- Are cards used only for repeated objects instead of page structure?
- Does mobile compress without text collision, clipped controls, or horizontal overflow?
- Does the screen look like a repeatable workbench rather than a card exhibition?

Keep the review attached to the checkpoint notes. Aesthetic quality should be trained through repeated inspection of the actual product, not by isolated taste calls.

## 9. Image Generation Policy

Image generation can support visual exploration, but it must not drive the product UI architecture.

Allowed:

- brand moodboards
- empty-state illustrations
- marketing hero assets
- background textures
- concept visuals for presentations

Avoid:

- fake backend screenshots
- UI mockups that cannot be implemented
- decorative AI imagery inside dense workbench flows

The product UI should be designed in code, verified in the browser, and judged by actual interaction states.

## 10. Execution Roadmap

### Checkpoint 1: Customer Shell Convergence

Design decision:

- color ratio: neutral/light work surface 75%, ink sidebar 15%, signal blue 8%, gold below 2%
- density: compact navigation and header, fewer capsules, tighter repeated controls
- radius: default to 8-12px; reserve larger radius for rare object cards or hero surfaces
- shadow: subtle separation only; no heavy drawer or prestige-card shadows by default
- motion: fast color/border feedback; avoid decorative lift or glow in shell chrome
- information hierarchy: tenant identity, current workspace, status, and actions must scan in one row

Implementation scope:

- `src/app/globals.css`
- `src/components/customer/customer-shell.tsx`
- `src/components/customer/customer-header.tsx`
- `src/components/customer/customer-sidebar.tsx`

Validation:

- `npx tsc --noEmit`
- desktop screenshot for customer shell
- mobile screenshot with navigation open
- desktop sidebar collapse/expand click check

### Checkpoint 2: Customer Home Workbench

Design decision:

- color ratio: neutral work surface 80%, signal blue 10%, semantic state colors 8%, gold below 2%
- density: first screen should show current journey stage, decision focus, system pulse, and a clearly visible AI assistant entry without a showcase wrapper
- radius: use 8-14px for home objects; avoid 24-32px section containers
- shadow: object-level separation only; no page-level prestige panel
- layout hierarchy: top area is a work surface with operating context, AI assistant access, and decision/status rail
- state model: keep empty, pending, blocked, and setup-needed states visible without decorative treatment
- copy model: frame the page around overseas 0-1 progress, missing capabilities, next action, and evidence behind the recommendation

Implementation scope:

- `src/app/customer/home/page.tsx`
- reuse shell/workbench classes from `src/app/globals.css`

- Convert the first viewport from a showcase panel to a work surface.
- Keep object cards only for metrics, queued actions, and AI prompts.
- Keep the AI assistant as a first-class decision-center control, not a buried chat widget.
- Make the assistant visibly connected to tenant knowledge, market assets, leads, content, publishing setup, tasks, and recent progress.
- Use prompts that help customers ask: what should we do first, what is blocked, which market/customer segment matters, and what has changed since the last update.

### Checkpoint 3: Radar Prospects

Design decision:

- color ratio: neutral work surface 82%, signal blue 12%, semantic states 6%; gold remains legacy content only until component sweep
- density: keep list scanning, selected-company inspection, and outreach actions visible without stacked showcase panels
- radius: use 8-12px for list rows, toolbars, drawer cards, and action controls
- shadow: rely on `ci-data-panel`, `ci-toolbar`, and `ci-detail-drawer`; avoid dark hero panels and heavy floating containers
- layout: desktop becomes list / detail / action-history workspace; mobile stacks these regions in document order
- state model: selected row, active tab, batch enrichment, generation, and recent outreach all remain visible in their local work regions

Implemented:

- Replaced the dark command stage with a compact workbench command bar.
- Converted prospect list, filters, top tabs, and outreach stats to `ci-*` workbench surfaces.
- Added a right-side action/history drawer for selected-company actions, evidence signals, and recent outreach context.

Verification target:

- Check selected-row interaction and tab switching in the browser.
- Check desktop three-column compression and mobile stacking without horizontal overflow.
- Use the component state sweep to finish legacy gold/dark panels inside deeper outreach and dossier sub-sections.

### Checkpoint 4: Daily Workspace

- Shape the page as a daily operations board.
- Prioritize queues, state visibility, and follow-up actions over decoration.
- Verify priority scanning and mobile compression.

### Checkpoint 5: Component State Sweep

- Normalize hover, focus, active, disabled, loading, empty, error, and partial-data states.
- Make buttons, badges, pills, panels, and drawers consistent across customer pages.
- Remove remaining product usage of deprecated cockpit/gold language after migration.

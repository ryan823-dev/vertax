---
name: vertax-ui-upgrade
description: VertaX customer UI upgrade workflow for Calm Intelligence OS, card-diet refactors, customer shell redesign, Radar/Daily Workspace workbench pages, design-token convergence, and browser-verified UI improvements. Use when modifying or reviewing VertaX tenant/customer interfaces, shared UI primitives, globals.css, design-tokens.ts, customer shell/header/sidebar, Radar, Daily Workspace, or any UI task involving card clutter, cockpit/gold legacy semantics, responsive layout, visual hierarchy, or product workbench UX.
---

# VertaX UI Upgrade

Use this skill to upgrade VertaX customer-facing product UI without drifting into a generic landing-page or portfolio aesthetic. The goal is a calm, precise, operational B2B SaaS workbench.

If `docs/ui-upgrade-playbook.md` exists, skim it for the latest project-specific UI policy before making broad UI decisions.

## North Star

Design toward **Calm Intelligence OS**:

- Calm: restrained color, restrained motion, low visual noise.
- Precise: clear hierarchy, states, affordances, and alignment.
- Operational: optimized for repeated work, scanning, triage, and action.
- Intelligent: AI is embedded in the workflow, not advertised as decoration.

The product should feel like a workbench, not a luxury cockpit, marketing dashboard, or visual showcase.

## Required Workflow

1. Inspect the existing UI context first.
   - Read the touched page, shared shell, relevant components, `src/app/globals.css`, and `src/lib/design-tokens.ts`.
   - Prefer source code over screenshots when source exists.
   - Note existing token usage, density, component patterns, hover/focus states, and responsive constraints.
2. Declare the design decision before broad edits.
   - State color ratio, density, radius, shadow, motion, layout hierarchy, and state model.
   - Keep it short and specific to the current surface.
3. Build a narrow v0 direction in the smallest safe surface.
   - Do not start with a repo-wide reskin.
   - Prove the structure, then expand.
4. Implement the scoped unit.
   - Use existing VertaX and shadcn/Tailwind primitives where possible.
   - Add abstractions only when they remove real repetition or converge a shared pattern.
5. Verify in the browser.
   - Capture desktop and mobile screenshots for visual work.
   - Check overflow, overlap, text truncation, nested cards, responsive compression, button states, and real click flow where relevant.
   - Run targeted type/tests when code paths change.

## Card Diet Rules

- Do not default page sections to cards.
- Do not nest cards inside cards.
- Use cards only for independent repeated objects: company, task, alert, evidence item, recommendation, draft, or activity record.
- Prefer full-width work surfaces, section bands, tables/lists, split panes, toolbars, detail drawers, and subtle dividers.
- If a page feels cramped, remove containers before adding spacing.
- Reduce border and shadow noise before changing colors.

## Token And Semantics

Use the current direction:

- `src/app/globals.css`: `customer-theme`, `ci-*` tokens, signal blue, reduced gold role.
- `src/lib/design-tokens.ts`: neutral/cool background, blue/cyan brand system, status colors.
- `src/components/ui/*`: shadcn-compatible primitives.
- `src/components/customer/*`: customer shell/header/sidebar surfaces.

Avoid introducing new legacy semantics:

- No new `cockpit`, `executive`, `growth chamber`, `gold button`, or premium-looking names.
- Do not use gold for primary actions, success, active navigation, or status.
- Gold is a rare brand accent only.
- New surfaces should use platform tokens and `ci-*` customer workbench tokens.
- Legacy classes such as `cockpit-container`, `cockpit-container-v2`, `btn-gold`, `btn-gold-sm`, and `badge-gold` are compatibility debt, not new design language.

## Surface Language

Use these concepts when shaping layouts:

- Work surface: primary page canvas, not a floating card wrapper.
- Section band: one page region with one job, separated by spacing, divider, or subtle background.
- Data panel: dense metrics, controls, filters, and tables.
- Object card: one repeated object only.
- Status pill: state only, never brand decoration.
- Toolbar: compact action/filter zone.
- Detail drawer or split pane: inspect/edit without losing list context.

## Component Expectations

- Buttons: primary is signal blue and action-oriented; secondary is neutral; ghost is for toolbar or dense row actions; destructive is destructive only.
- Badges: categories and labels; status pills: actual system state.
- Panels: low shadow, strong alignment, clear title/action relationship.
- Tables/lists: prefer scan density, stable columns, row actions, and clear empty/error/loading states.
- Forms: visible labels, field-level errors, disabled/loading states, and predictable focus.
- Icons: use the existing icon library; do not use emoji as icon substitutes.
- Copy: operational and specific; no fake metrics, fake testimonials, or decorative filler.

## Anti-Patterns

Actively avoid:

- Purple/blue/pink gradient hero styling for product workbench pages.
- Large rounded cards as the default unit.
- Card grids where a table, list, or split pane would scan better.
- Decorative SVG filler or invented illustrations for missing assets.
- One-note color palettes.
- Overly theatrical motion.
- Visual changes that leave structure and semantics unchanged.
- Marketing-page composition inside authenticated customer workflows.

## Verification

For UI edits, use the strongest practical proof:

- Desktop screenshot.
- Mobile screenshot.
- Real click-flow check when actions or navigation change.
- `npx tsc --noEmit` when TypeScript changed.
- Targeted tests when business logic or shared helpers changed.

Be explicit about what was verified and what remains unverified. A passing build is not enough for UI quality.

## Worktree Safety

VertaX often has mixed worktrees. Before staging or summarizing, run `git status --short` and separate:

- UI upgrade files you touched.
- Existing user or unrelated changes.
- Temporary screenshots/logs.

Do not clean or revert unrelated work unless the user asks.

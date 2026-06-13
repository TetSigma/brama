# Brama Agent Guide

Brama is a React + Vite website. Treat the repository as a browser-first product where fast local iteration, accessible UI, responsive layouts, and predictable frontend architecture matter.

## Working Rules

- Preserve user work. The tree may contain uncommitted changes; inspect before editing and avoid reverting unrelated files.
- Prefer focused, website-native changes over broad refactors.
- Use TypeScript strictly when TypeScript is present. Keep new code typed and avoid `any` unless it is isolated at a boundary.
- Prefer React and Vite conventions before adding custom tooling or new dependencies.
- Keep UI consistent with the local component, style, and asset conventions once they exist.
- Do not commit secrets. Environment values belong in ignored `.env` files and should use Vite's `VITE_` prefix only when they must be exposed to the browser.

## Code Style And Architecture Rules

Keep the application split into four layers:

- Data: API access, query functions, data validation, cache invalidation, and browser storage boundaries.
- State: client state that is not server cache, managed with Zustand stores or local component state.
- UI: shared primitives, presentational components, layout, loading states, and visual states.
- Business: route/page-level orchestration such as form handling, navigation, animation triggers, and connecting hooks to UI.

### Data And Network

- Keep network access inside domain hooks, service modules, or narrow infrastructure helpers.
- Do not fetch directly inside deeply nested UI components.
- Use TanStack Query for all remote fetching, mutations, caching, and server-state synchronization.
- Route TanStack Query usage through domain hooks instead of calling query and mutation hooks ad hoc throughout the UI.
- Validate external data with Zod or an equivalent schema library when it crosses a trust boundary.
- Treat `localStorage`, `sessionStorage`, cookies, and URL params as untrusted inputs and parse them deliberately.
- Handle request errors close to the data boundary, then expose typed error state for pages to render recoverable UI.

### State

- Use Zustand for shared client state.
- Use local component state for ephemeral UI state that does not need to be shared.
- Do not introduce Redux, MobX, Jotai, Recoil, XState, React Context state containers, or another global state library without explicit approval.
- Do not put server state in Zustand; keep fetched data, request status, cache invalidation, and mutations in TanStack Query.

### Forms

- Use React Hook Form for non-trivial forms.
- Use Zod or an equivalent schema library for validation when inputs affect persisted state, API calls, or complex UI behavior.
- Keep form submission orchestration in the page/business layer.
- Keep field rendering inside reusable UI or form components.

### Pages And Business Logic

- Pages should contain business orchestration only: hook composition, form handling, route/navigation decisions, animation wiring, and mapping state to UI.
- No ad hoc async data loading in presentational components.
- If a page needs remote data, create or extend a domain hook and pass the hook result into the page flow.
- If logic becomes reusable across pages, extract it into a domain hook or utility rather than hiding it in a component.

### UI And Styling

- Build accessible, semantic HTML first. Use buttons for actions, links for navigation, labels for inputs, and headings in document order.
- Keep shared components presentational. They should receive props and callbacks, not own network behavior.
- Put new reusable UI primitives in the shared component area once the project has one.
- Use CSS variables, design tokens, or the established styling system for colors, spacing, typography, and radii.
- Do not scatter raw colors or one-off spacing values when a local token exists.
- Loading states should reserve stable layout space to avoid jarring shifts.
- Error states should give users a clear recovery path when recovery is possible.
- Design and test responsive states for mobile, tablet, and desktop widths.

### Assets

- Store static public assets in `public/` when they must be served by URL without bundling.
- Store imported component assets under `src/` so Vite can fingerprint and optimize them.
- Prefer modern image formats and include meaningful `alt` text unless an image is decorative.
- Avoid large unoptimized media in the repo; compress assets before committing.

### Animation

- Prefer CSS transitions and animations for simple UI motion.
- Use a dedicated React animation library only when interaction complexity justifies it or the project already depends on one.
- Respect `prefers-reduced-motion` for non-essential motion.

## Agent Review Checklist

Before handoff, verify:

- Are pages free of direct, scattered fetch logic?
- Does all remote fetching and mutation behavior go through TanStack Query?
- Is shared client state managed with Zustand?
- Are reusable UI pieces placed in the shared component area?
- Are forms validated and accessible?
- Are buttons, links, inputs, labels, headings, and alt text semantically correct?
- Does the UI work at mobile and desktop widths?
- Are loading and error states represented without layout jumps?
- Are environment variables handled through Vite conventions?
- Are new assets optimized and stored in the right place?
- Do lint, typecheck, build, and relevant tests pass?
- Was the app opened in a browser for meaningful UI changes?

## Commands

- Install: `npm install`
- Start dev server: `npm run dev`
- Build: `npm run build`
- Preview production build: `npm run preview`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm test`

Use the package manager already established by the repo if it differs from npm.

## Browser QA

Use the Codex in-app browser for local website verification after meaningful frontend changes.

- Start the Vite dev server before browser QA.
- Open the local dev URL, usually `http://localhost:5173`.
- Check at least one desktop viewport and one mobile viewport for layout, overflow, and interaction issues.
- Verify interactive controls with clicks, typing, keyboard focus, and navigation where relevant.
- For visual changes, capture screenshots or inspect the page state before handoff.

## Current Baseline

The expected preflight is the strongest available local check, usually:

```sh
npm run lint
npm run typecheck
npm run build
```

If any command is missing or fails, report the exact result and whether the failure appears pre-existing or introduced by the change.

## Feature Map

Use this map once the project is scaffolded:

- `src/`: React application source.
- `src/main.tsx`: Vite entry point.
- `src/App.tsx`: root application shell.
- `src/components/`: shared UI components.
- `src/pages/` or `src/routes/`: route-level screens when routing exists.
- `src/hooks/`: reusable client hooks.
- `src/lib/`: infrastructure helpers and third-party client setup.
- `src/assets/`: imported images, icons, fonts, and media.
- `public/`: static files served directly by Vite.

## Agent Handoff Format

When handing off work, include:

- What changed.
- How it was verified.
- Remaining risks or known failing checks.
- Any environment or deployment step the human must apply outside the repo.

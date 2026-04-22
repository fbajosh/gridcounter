# Counter Grid

Counter Grid is a browser-first tally app for fast touch counting with nested subcounters. It follows the same Vite, localization, PWA, and deployment shape as the adjacent Connect 4 app, but the core interaction is a recursive counter tree instead of a game board.

## What It Does

- Starts with one counter in the top-left of the main workspace.
- Tapping a counter changes its value by the active step size.
- `+Right` adds a subcounter to that counter.
- `+Down` adds a sibling counter below it.
- Each counter can expand again, so the workspace becomes a nested grid/tree of related counts.
- Long-pressing a counter title renames that counter, and long-pressing a row title renames the row.
- Top controls let you switch increment vs decrement, change count step, arm tap-to-reset, reset everything, and choose long-press behavior.
- A separate stats view summarizes tap activity, resets, active counters, and timeline buckets from the local event log.
- State persists locally with `localStorage`.
- Production builds emit a static app shell, a service worker, a manifest, and standalone-friendly metadata for home-screen installation.

## Local Development

```bash
npm install
npm run dev
```

## Deploy Shape

The repository includes the same VM sync workflow shape used by the Connect 4 app:

- GitHub Actions builds the static site on pushes to `main`
- a build version is stamped into the environment
- the generated `dist/` directory is synced to a configured VM over SSH

## Source Map

- [`src/landing.ts`](./src/landing.ts): app bootstrap, DOM wiring, routing, rendering, and touch handling
- [`src/counter-tree.ts`](./src/counter-tree.ts): nested counter tree creation and updates
- [`src/stats.ts`](./src/stats.ts): state persistence and session/stat aggregation
- [`src/i18n.ts`](./src/i18n.ts): in-app localization strings and translation helpers
- [`src/theme.ts`](./src/theme.ts): theme token application
- [`src/pwa.ts`](./src/pwa.ts): service worker registration and cache refresh support
- [`src/landing.css`](./src/landing.css): mobile-first shell and nested counter layout

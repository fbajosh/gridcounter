# Grid Counter

This repo powers `appmogged.com/gridcounter`.

Grid Counter is a touch-first nested counting app for tracking related totals in a simple expandable grid. The live app is meant to feel fast on mobile, work as a home-screen web app, and keep layouts and session state locally in the browser.

## Current Product Shape

- Tap a counter to apply the current tap action at the current step size.
- Use `Edit` to reveal layout controls:
  `+` on the right adds a nested counter, `+` on the bottom adds the next counter down, `×` removes a counter tree, and the pencil renames a counter.
- Save and load named layouts locally.
- Mark any saved layout as the default used by `Reset -> All`.
- `Reset -> Counters` zeroes counts without changing structure.
- `Stats` shows session totals, tap timeline, and most active counters.

## App Notes

- This app follows the same general Vite / i18n / PWA / GitHub Actions VM deploy shape as the adjacent Connect 4 app.
- The intended production route is `appmogged.com/gridcounter`.
- State and saved layouts are local-only browser storage right now.

## Maintenance Map

- [`src/index.html`](./src/index.html): shell, toolbar menus, and modal markup
- [`src/landing.ts`](./src/landing.ts): rendering, controls, responsive sizing, and interaction wiring
- [`src/counter-tree.ts`](./src/counter-tree.ts): nested counter structure and tree operations
- [`src/stats.ts`](./src/stats.ts): persistence, saved layouts, default layout selection, and stats aggregation
- [`src/i18n.ts`](./src/i18n.ts): localized UI copy
- [`src/landing.css`](./src/landing.css): mobile-first layout, toolbar, counters, and modal styling

## Quick Checks

```bash
npm run dev
npm run build
```

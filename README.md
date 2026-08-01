# Drans Trade

A modern trading terminal built with Next.js 15, TypeScript and Tailwind CSS — live watchlists, order placement, positions, holdings and instrument analysis in one responsive application.

Original work. Simulated market data; no real orders are placed.

---

## Highlights

- **Streaming prices** — a tick engine updates quotes on an interval, with price cells that flash green/red on change
- **Multi-step authentication** — client code → OTP → PIN, with auto-advancing segmented inputs, paste support and backspace-to-previous
- **Order ticket** — market and limit orders, live margin checks, resting limit orders that fill when the market trades through them
- **Hand-written SVG charts** — sparkline, area and candlestick, no charting dependency
- **Fully responsive** — verified at 360 / 390 / 820 / 1440 px with zero horizontal overflow
- **Light and dark themes** — driven entirely by CSS custom properties

## Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3, CSS custom properties |
| State | React Context + `useReducer` |
| Icons | lucide-react |
| Testing | Playwright |

Five runtime dependencies total. Charts, state management and the market simulation are all written from scratch.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3100
```

Sign in with any client code, then **OTP `481902`** and **PIN `2468`**.

```bash
npm run build      # production build
node tests/audit.mjs   # responsive + console-error audit across all routes
```

## Architecture

```
app/
  layout.tsx              root layout, font, store provider
  login/                  multi-step authentication
  (app)/                  authenticated routes, wrapped in AppShell
    dashboard/            portfolio summary, indices, movers, allocation
    watchlist/            live watchlist with search and add/remove
    orders/               order book with status filters and cancel
    positions/            intraday positions, marked to market
    holdings/             long-term portfolio
    funds/                margin summary, transfers, ledger
    stock/[symbol]/       instrument detail, charts, market depth
components/
  shell/                  sidebar, top bar, mobile tab bar
  ui/                     design-system primitives and SVG charts
  market/                 live price cells
  order/                  order ticket drawer / bottom sheet
  portfolio/              shared positions + holdings table
lib/
  market.ts               instrument universe and tick simulation
  store.tsx               state, reducer, derived selectors
  format.ts               locale-pinned number formatting
```

## Notes on some decisions

**Simulated data over a live API.** Public market APIs need keys, rate-limit aggressively and return nothing outside market hours. The engine produces plausible price action from a seeded random walk (geometric Brownian motion with mild mean reversion), so the app behaves identically everywhere and never depends on the network.

**Tabular numerals everywhere.** `font-variant-numeric: tabular-nums` on every numeric cell. Without it, digits change width as prices tick and entire columns jitter — the single most noticeable flaw in a financial UI.

**Two navigation models, not one.** A persistent sidebar above `lg`, a fixed bottom tab bar below it. Stretching one pattern across both breakpoints compromises each; the bottom bar also keeps primary actions in thumb reach.

**Tables become cards on mobile.** Below `sm`, dense tables are replaced with stacked cards rather than pushed behind horizontal scroll.

**Grid children carry `min-w-0`.** Grid and flex items default to `min-width: auto`, so a wide table inside `overflow-x-auto` expands its column instead of scrolling. This caused real overflow on two pages during development; the audit script catches it.

**Session survives reload.** State persists to `sessionStorage` and rehydrates on mount, behind a `hydrated` flag so the route guard never redirects before the session has been read.

## Testing

`tests/audit.mjs` signs in, visits every route at four viewport widths, and asserts:

- the URL actually landed on the target route (catching silent redirects)
- zero horizontal overflow on `documentElement`
- zero console errors and page errors

It also reports the widest element on each page, which is how the `min-w-0` issue above was located.

```
28/28 route × viewport combinations passing
```

---

Built by [Arjun Ramachandran](https://github.com/AjuRram).

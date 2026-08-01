/**
 * Drans Trade — instrument universe and live tick simulation.
 *
 * WHY SIMULATED RATHER THAN A LIVE FEED
 * Public market APIs need keys, rate-limit aggressively, return nothing outside
 * market hours, and break demos at the worst moment. This engine produces
 * plausible price action deterministically from a seed, so the app behaves
 * identically on every machine and never depends on the network.
 *
 * The random walk is a simplified geometric Brownian motion: each tick applies
 * a small drift plus volatility-scaled noise, with per-instrument volatility so
 * a bank stock moves differently from a small-cap.
 */

export type Segment = "EQ" | "IDX" | "FUT" | "OPT";

export interface Instrument {
  symbol: string;
  name: string;
  segment: Segment;
  sector: string;
  prevClose: number;
  /** Daily volatility as a fraction, e.g. 0.018 = 1.8%. */
  vol: number;
  lotSize?: number;
}

export interface Quote {
  symbol: string;
  ltp: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  bid: number;
  ask: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/* Instrument universe                                                 */
/* ------------------------------------------------------------------ */

export const INSTRUMENTS: Instrument[] = [
  // Indices
  { symbol: "NIFTY50", name: "Nifty 50", segment: "IDX", sector: "Index", prevClose: 24218.6, vol: 0.008 },
  { symbol: "BANKNIFTY", name: "Nifty Bank", segment: "IDX", sector: "Index", prevClose: 51840.25, vol: 0.011 },
  { symbol: "FINNIFTY", name: "Nifty Financial", segment: "IDX", sector: "Index", prevClose: 23106.4, vol: 0.01 },
  { symbol: "SENSEX", name: "BSE Sensex", segment: "IDX", sector: "Index", prevClose: 79486.32, vol: 0.008 },

  // Equities
  { symbol: "RELIANCE", name: "Reliance Industries", segment: "EQ", sector: "Energy", prevClose: 2914.5, vol: 0.016 },
  { symbol: "TCS", name: "Tata Consultancy Services", segment: "EQ", sector: "IT", prevClose: 4082.15, vol: 0.014 },
  { symbol: "HDFCBANK", name: "HDFC Bank", segment: "EQ", sector: "Banking", prevClose: 1687.9, vol: 0.015 },
  { symbol: "INFY", name: "Infosys", segment: "EQ", sector: "IT", prevClose: 1842.25, vol: 0.017 },
  { symbol: "ICICIBANK", name: "ICICI Bank", segment: "EQ", sector: "Banking", prevClose: 1246.8, vol: 0.016 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", segment: "EQ", sector: "Telecom", prevClose: 1598.4, vol: 0.018 },
  { symbol: "ITC", name: "ITC Limited", segment: "EQ", sector: "FMCG", prevClose: 486.35, vol: 0.013 },
  { symbol: "LT", name: "Larsen & Toubro", segment: "EQ", sector: "Infrastructure", prevClose: 3624.7, vol: 0.019 },
  { symbol: "SBIN", name: "State Bank of India", segment: "EQ", sector: "Banking", prevClose: 812.55, vol: 0.02 },
  { symbol: "TATAMOTORS", name: "Tata Motors", segment: "EQ", sector: "Automobile", prevClose: 976.2, vol: 0.026 },
  { symbol: "AXISBANK", name: "Axis Bank", segment: "EQ", sector: "Banking", prevClose: 1152.35, vol: 0.018 },
  { symbol: "WIPRO", name: "Wipro", segment: "EQ", sector: "IT", prevClose: 542.8, vol: 0.019 },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", segment: "EQ", sector: "Pharma", prevClose: 1789.45, vol: 0.015 },
  { symbol: "MARUTI", name: "Maruti Suzuki", segment: "EQ", sector: "Automobile", prevClose: 12486.9, vol: 0.017 },
  { symbol: "ADANIENT", name: "Adani Enterprises", segment: "EQ", sector: "Conglomerate", prevClose: 2438.15, vol: 0.032 },
  { symbol: "ZOMATO", name: "Zomato", segment: "EQ", sector: "Consumer Tech", prevClose: 268.4, vol: 0.035 },
  { symbol: "PAYTM", name: "One97 Communications", segment: "EQ", sector: "Fintech", prevClose: 892.6, vol: 0.038 },
  { symbol: "TATASTEEL", name: "Tata Steel", segment: "EQ", sector: "Metals", prevClose: 148.75, vol: 0.024 },
];

export const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]));

/* ------------------------------------------------------------------ */
/* Deterministic PRNG                                                  */
/* ------------------------------------------------------------------ */

/** mulberry32 — small, fast, good enough for visual simulation. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller: uniform pair -> standard normal. Real returns are not uniform. */
function gauss(r: () => number) {
  const u = Math.max(r(), 1e-9);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function seedOf(symbol: string) {
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i++) {
    h ^= symbol.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Intraday series                                                     */
/* ------------------------------------------------------------------ */

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

/**
 * Build a day of candles for an instrument. Deterministic per symbol, so the
 * chart on the dashboard and the chart on the instrument page always agree.
 */
export function buildSeries(symbol: string, points = 78): Candle[] {
  const inst = BY_SYMBOL.get(symbol);
  if (!inst) return [];

  const r = rng(seedOf(symbol));
  const perTick = inst.vol / Math.sqrt(points);

  // 09:15 IST open, one candle every 5 minutes.
  const start = new Date();
  start.setHours(9, 15, 0, 0);

  let price = inst.prevClose * (1 + gauss(r) * perTick * 0.6);
  const out: Candle[] = [];

  for (let i = 0; i < points; i++) {
    const o = price;
    // Mild mean reversion toward prevClose keeps the walk from drifting away.
    const pull = (inst.prevClose - price) / inst.prevClose * 0.06;
    const step = (gauss(r) * perTick + pull) * price;
    const c = Math.max(0.5, o + step);

    const wick = Math.abs(step) * (0.4 + r() * 1.1);
    const h = Math.max(o, c) + wick * r();
    const l = Math.min(o, c) - wick * r();

    out.push({
      t: start.getTime() + i * 5 * 60_000,
      o: round(o),
      h: round(h),
      l: round(Math.max(0.5, l)),
      c: round(c),
      v: Math.round(20_000 + r() * 180_000 * (1 + inst.vol * 12)),
    });
    price = c;
  }
  return out;
}

/** Snapshot quote derived from the instrument's own series. */
export function quoteOf(symbol: string): Quote {
  const inst = BY_SYMBOL.get(symbol)!;
  const s = buildSeries(symbol);
  const last = s[s.length - 1];
  const ltp = last.c;
  const change = round(ltp - inst.prevClose);
  const spread = Math.max(0.05, round(ltp * 0.0004));

  return {
    symbol,
    ltp,
    change,
    changePct: round((change / inst.prevClose) * 100),
    open: s[0].o,
    high: round(Math.max(...s.map((c) => c.h))),
    low: round(Math.min(...s.map((c) => c.l))),
    prevClose: inst.prevClose,
    volume: s.reduce((a, c) => a + c.v, 0),
    bid: round(ltp - spread),
    ask: round(ltp + spread),
    updatedAt: Date.now(),
  };
}

export function initialQuotes(): Record<string, Quote> {
  const out: Record<string, Quote> = {};
  for (const i of INSTRUMENTS) out[i.symbol] = quoteOf(i.symbol);
  return out;
}

/**
 * Advance one quote by a single tick. Called on an interval by the store to
 * emulate a streaming feed — the same shape a WebSocket handler would take.
 */
export function tick(q: Quote): Quote {
  const inst = BY_SYMBOL.get(q.symbol)!;
  // Per-tick volatility: a fraction of the daily figure.
  const sigma = inst.vol / 26;
  const drift = ((inst.prevClose - q.ltp) / inst.prevClose) * 0.02;
  const ltp = Math.max(0.5, round(q.ltp * (1 + (Math.random() - 0.5) * 2 * sigma + drift)));

  const change = round(ltp - q.prevClose);
  const spread = Math.max(0.05, round(ltp * 0.0004));

  return {
    ...q,
    ltp,
    change,
    changePct: round((change / q.prevClose) * 100),
    high: Math.max(q.high, ltp),
    low: Math.min(q.low, ltp),
    volume: q.volume + Math.round(Math.random() * 4000),
    bid: round(ltp - spread),
    ask: round(ltp + spread),
    updatedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* Market clock                                                        */
/* ------------------------------------------------------------------ */

export function marketStatus(now = new Date()): { open: boolean; label: string } {
  const day = now.getDay();
  if (day === 0 || day === 6) return { open: false, label: "Closed · Weekend" };
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < 555) return { open: false, label: "Pre-open" };
  if (mins > 930) return { open: false, label: "Closed" };
  return { open: true, label: "Live" };
}

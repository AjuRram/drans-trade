"use client";

/**
 * Application state for Drans Trade.
 *
 * Deliberately built on React context + useReducer rather than pulling in a
 * state library: the shape here is small and well-bounded, and it keeps the
 * dependency list honest for a portfolio project.
 *
 * The quote stream is emulated with an interval that mutates a quote map. That
 * is intentionally the same shape a WebSocket `onmessage` handler would have,
 * so swapping the simulation for a real socket is a one-function change.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  INSTRUMENTS,
  Quote,
  initialQuotes,
  tick,
  BY_SYMBOL,
} from "./market";

export type Side = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type OrderStatus = "OPEN" | "EXECUTED" | "CANCELLED";

export interface Order {
  id: string;
  symbol: string;
  side: Side;
  qty: number;
  type: OrderType;
  limitPrice?: number;
  price: number;
  status: OrderStatus;
  placedAt: number;
}

export interface Position {
  symbol: string;
  qty: number;
  avg: number;
}

interface State {
  authed: boolean;
  clientCode: string;
  watchlist: string[];
  orders: Order[];
  positions: Position[];
  funds: number;
}

type Action =
  | { type: "LOGIN"; clientCode: string }
  | { type: "LOGOUT" }
  | { type: "WATCH_ADD"; symbol: string }
  | { type: "WATCH_REMOVE"; symbol: string }
  | { type: "ORDER_PLACE"; order: Order }
  | { type: "ORDER_CANCEL"; id: string }
  | { type: "ORDER_FILL"; id: string; price: number }
  | { type: "RESTORE"; state: State };

const SEED_WATCHLIST = [
  "RELIANCE",
  "TCS",
  "HDFCBANK",
  "INFY",
  "TATAMOTORS",
  "ZOMATO",
  "SBIN",
];

const SEED_POSITIONS: Position[] = [
  { symbol: "RELIANCE", qty: 40, avg: 2860.2 },
  { symbol: "INFY", qty: 75, avg: 1798.5 },
  { symbol: "TATAMOTORS", qty: 120, avg: 1012.4 },
  { symbol: "ITC", qty: 300, avg: 472.15 },
  { symbol: "SBIN", qty: -60, avg: 824.0 }, // negative = short
];

const initialState: State = {
  authed: false,
  clientCode: "",
  watchlist: SEED_WATCHLIST,
  orders: [],
  positions: SEED_POSITIONS,
  funds: 485_260.75,
};

function applyFill(positions: Position[], o: Order): Position[] {
  const delta = o.side === "BUY" ? o.qty : -o.qty;
  const idx = positions.findIndex((p) => p.symbol === o.symbol);

  if (idx === -1) return [...positions, { symbol: o.symbol, qty: delta, avg: o.price }];

  const p = positions[idx];
  const nextQty = p.qty + delta;
  const next = [...positions];

  if (nextQty === 0) {
    next.splice(idx, 1);
    return next;
  }

  // Averaging only applies when adding to an existing side; reducing keeps avg.
  const sameSide = Math.sign(p.qty) === Math.sign(delta);
  next[idx] = {
    ...p,
    qty: nextQty,
    avg: sameSide
      ? (p.avg * Math.abs(p.qty) + o.price * Math.abs(delta)) / Math.abs(nextQty)
      : p.avg,
  };
  return next;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESTORE":
      return action.state;
    case "LOGIN":
      return { ...state, authed: true, clientCode: action.clientCode };
    case "LOGOUT":
      return { ...initialState, authed: false };
    case "WATCH_ADD":
      return state.watchlist.includes(action.symbol)
        ? state
        : { ...state, watchlist: [action.symbol, ...state.watchlist] };
    case "WATCH_REMOVE":
      return { ...state, watchlist: state.watchlist.filter((s) => s !== action.symbol) };
    case "ORDER_PLACE": {
      const cost = action.order.price * action.order.qty;
      return {
        ...state,
        orders: [action.order, ...state.orders],
        funds: action.order.side === "BUY" ? state.funds - cost : state.funds + cost,
        positions:
          action.order.status === "EXECUTED"
            ? applyFill(state.positions, action.order)
            : state.positions,
      };
    }
    case "ORDER_CANCEL":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.id && o.status === "OPEN" ? { ...o, status: "CANCELLED" } : o
        ),
      };
    case "ORDER_FILL": {
      const target = state.orders.find((o) => o.id === action.id);
      if (!target || target.status !== "OPEN") return state;
      const filled: Order = { ...target, status: "EXECUTED", price: action.price };
      return {
        ...state,
        orders: state.orders.map((o) => (o.id === action.id ? filled : o)),
        positions: applyFill(state.positions, filled),
      };
    }
    default:
      return state;
  }
}

const PERSIST_KEY = "drans-trade:session";

interface Ctx extends State {
  /** False until sessionStorage has been read; guards route redirects. */
  hydrated: boolean;
  quotes: Record<string, Quote>;
  streaming: boolean;
  setStreaming: (v: boolean) => void;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Quotes start from the deterministic snapshot so server and client agree on
  // first paint; the interval only starts after mount.
  const [quotes, setQuotes] = useState<Record<string, Quote>>(() => initialQuotes());
  const [streaming, setStreaming] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Restore the session after mount. Reading storage during render would break
  // SSR, and redirecting before this completes would bounce a signed-in user
  // back to /login on every page load.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PERSIST_KEY);
      if (raw) dispatch({ type: "RESTORE", state: JSON.parse(raw) as State });
    } catch {
      /* corrupt or unavailable storage — start fresh */
    }
    setHydrated(true);
  }, []);

  // Persist on every state change once hydrated.
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(PERSIST_KEY, JSON.stringify(state));
    } catch {
      /* quota or private mode — non-fatal */
    }
  }, [state, hydrated]);
  const openOrders = useRef(state.orders);
  openOrders.current = state.orders;

  useEffect(() => {
    if (!streaming) return;

    const id = setInterval(() => {
      setQuotes((prev) => {
        const next: Record<string, Quote> = {};
        // Tick a rotating subset each cycle — a real feed does not update every
        // instrument on every frame, and this keeps the UI from feeling uniform.
        for (const inst of INSTRUMENTS) {
          const q = prev[inst.symbol];
          next[inst.symbol] = Math.random() < 0.55 ? tick(q) : q;
        }

        // Resting limit orders fill when the market trades through them.
        for (const o of openOrders.current) {
          if (o.status !== "OPEN" || o.type !== "LIMIT" || o.limitPrice == null) continue;
          const ltp = next[o.symbol]?.ltp;
          if (ltp == null) continue;
          const hit = o.side === "BUY" ? ltp <= o.limitPrice : ltp >= o.limitPrice;
          if (hit) dispatch({ type: "ORDER_FILL", id: o.id, price: o.limitPrice });
        }

        return next;
      });
    }, 1400);

    return () => clearInterval(id);
  }, [streaming]);

  const value = useMemo<Ctx>(
    () => ({ ...state, hydrated, quotes, streaming, setStreaming, dispatch }),
    [state, hydrated, quotes, streaming]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Derived selectors                                                   */
/* ------------------------------------------------------------------ */

export function usePortfolio() {
  const { positions, quotes } = useStore();
  return useMemo(() => {
    let invested = 0;
    let current = 0;
    let dayPnl = 0;

    const rows = positions.map((p) => {
      const q = quotes[p.symbol];
      const ltp = q?.ltp ?? p.avg;
      const units = Math.abs(p.qty);
      const dir = Math.sign(p.qty) || 1;

      const inv = p.avg * units;
      const cur = ltp * units;
      const pnl = (ltp - p.avg) * units * dir;
      const day = (q ? q.ltp - q.prevClose : 0) * units * dir;

      invested += inv;
      current += cur * dir > 0 ? cur : cur;
      dayPnl += day;

      return {
        ...p,
        name: BY_SYMBOL.get(p.symbol)?.name ?? p.symbol,
        ltp,
        invested: inv,
        currentValue: cur,
        pnl,
        pnlPct: inv === 0 ? 0 : (pnl / inv) * 100,
        dayPnl: day,
        dayPct: q?.changePct ?? 0,
      };
    });

    const totalPnl = rows.reduce((a, r) => a + r.pnl, 0);
    return {
      rows,
      invested,
      current,
      totalPnl,
      totalPnlPct: invested === 0 ? 0 : (totalPnl / invested) * 100,
      dayPnl,
    };
  }, [positions, quotes]);
}

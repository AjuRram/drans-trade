"use client";

/**
 * Watchlist.
 *
 * Responsive strategy: a dense table on >= sm, stacked cards below it. Forcing
 * a seven-column table into 390px behind horizontal scroll reads worse than
 * restructuring, so the two layouts are written separately and toggled.
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Search, Plus, Trash2, Eye } from "lucide-react";
import { useStore } from "@/lib/store";
import { INSTRUMENTS, BY_SYMBOL, buildSeries } from "@/lib/market";
import { money, signedPct, compact, toneClass } from "@/lib/format";
import { Card, Button, Badge, EmptyState } from "@/components/ui/Primitives";
import { Sparkline } from "@/components/ui/Charts";
import { LivePrice, ChangeCell } from "@/components/market/LivePrice";
import { OrderTicket, TicketRequest } from "@/components/order/OrderTicket";

export default function WatchlistPage() {
  const { watchlist, quotes, dispatch } = useStore();
  const [ticket, setTicket] = useState<TicketRequest | null>(null);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return [];
    return INSTRUMENTS.filter(
      (i) =>
        !watchlist.includes(i.symbol) &&
        (i.symbol.includes(q) || i.name.toUpperCase().includes(q))
    ).slice(0, 6);
  }, [query, watchlist]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header>
        <h1 className="text-lg font-bold tracking-tight text-ink">Watchlist</h1>
        <p className="mt-0.5 text-xs text-muted">
          {watchlist.length} instruments · live prices
        </p>
      </header>

      <Card className="relative overflow-visible">
        <div className="flex items-center gap-2 px-4 py-3">
          <Search size={16} className="shrink-0 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search to add an instrument…"
            aria-label="Search instruments"
            className="h-8 w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
        </div>

        {results.length > 0 ? (
          <div className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-card border border-hairline bg-surface shadow-pop">
            {results.map((i) => (
              <button
                key={i.symbol}
                onClick={() => {
                  dispatch({ type: "WATCH_ADD", symbol: i.symbol });
                  setQuery("");
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-raised"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-ink">{i.symbol}</span>
                  <span className="block truncate text-2xs text-faint">{i.name}</span>
                </span>
                <Plus size={15} className="shrink-0 text-brand" />
              </button>
            ))}
          </div>
        ) : null}
      </Card>

      {watchlist.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Eye size={18} />}
            title="Your watchlist is empty"
            hint="Search above to track instruments and see live prices here."
          />
        </Card>
      ) : (
        <>
          {/* Table — sm and up */}
          <Card className="hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="thead">
                  <tr className="border-b border-hairline">
                    <Th>Instrument</Th>
                    <Th right>LTP</Th>
                    <Th right>Change</Th>
                    <Th right>Day range</Th>
                    <Th right>Volume</Th>
                    <Th right>Trend</Th>
                    <Th right>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {watchlist.map((sym) => {
                    const q = quotes[sym];
                    const inst = BY_SYMBOL.get(sym);
                    if (!q || !inst) return null;
                    return (
                      <tr
                        key={sym}
                        className="border-b border-hairline/60 last:border-0 hover:bg-raised/40"
                      >
                        <td className="px-4 py-3">
                          <Link href={`/stock/${sym}`} className="group block">
                            <span className="flex items-center gap-2">
                              <span className="text-xs font-bold text-ink group-hover:text-brand">
                                {sym}
                              </span>
                              <Badge tone="neutral">{inst.segment}</Badge>
                            </span>
                            <span className="mt-0.5 block truncate text-2xs text-faint">
                              {inst.name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <LivePrice value={q.ltp} className="text-sm" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChangeCell change={q.change} pct={q.changePct} className="text-xs" />
                        </td>
                        <td className="tnum px-4 py-3 text-right text-2xs text-muted">
                          {money(q.low)} – {money(q.high)}
                        </td>
                        <td className="tnum px-4 py-3 text-right text-2xs text-muted">
                          {compact(q.volume)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="ml-auto w-24">
                            <Sparkline
                              data={buildSeries(sym, 30).map((c) => c.c)}
                              up={q.change >= 0}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="buy" onClick={() => setTicket({ symbol: sym, side: "BUY" })}>
                              BUY
                            </Button>
                            <Button size="sm" variant="sell" onClick={() => setTicket({ symbol: sym, side: "SELL" })}>
                              SELL
                            </Button>
                            <button
                              onClick={() => dispatch({ type: "WATCH_REMOVE", symbol: sym })}
                              aria-label={`Remove ${sym} from watchlist`}
                              className="rounded-md p-1.5 text-faint transition-colors hover:bg-down/10 hover:text-down"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Cards — below sm */}
          <div className="space-y-2.5 sm:hidden">
            {watchlist.map((sym) => {
              const q = quotes[sym];
              const inst = BY_SYMBOL.get(sym);
              if (!q || !inst) return null;
              return (
                <Card key={sym} className="card-pad">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/stock/${sym}`} className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">{sym}</span>
                      <span className="block truncate text-2xs text-faint">{inst.name}</span>
                    </Link>
                    <div className="shrink-0 text-right">
                      <LivePrice value={q.ltp} className="text-sm" />
                      <div className={clsx("tnum mt-0.5 text-2xs font-semibold", toneClass(q.change))}>
                        {signedPct(q.changePct)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <Sparkline data={buildSeries(sym, 30).map((c) => c.c)} up={q.change >= 0} />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button size="sm" variant="buy" className="flex-1" onClick={() => setTicket({ symbol: sym, side: "BUY" })}>
                      BUY
                    </Button>
                    <Button size="sm" variant="sell" className="flex-1" onClick={() => setTicket({ symbol: sym, side: "SELL" })}>
                      SELL
                    </Button>
                    <button
                      onClick={() => dispatch({ type: "WATCH_REMOVE", symbol: sym })}
                      aria-label={`Remove ${sym}`}
                      className="rounded-md border border-hairline p-2 text-faint hover:text-down"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <OrderTicket request={ticket} onClose={() => setTicket(null)} />
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={clsx(
        "px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-faint",
        right ? "text-right" : "text-left"
      )}
    >
      {children}
    </th>
  );
}

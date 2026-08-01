"use client";

/**
 * Dashboard — the landing surface after sign-in.
 *
 * Information hierarchy, top to bottom, follows what a trader checks in order:
 *   1. Portfolio health (am I up or down today?)
 *   2. Index strip (what is the market doing?)
 *   3. Allocation + chart (where is my money?)
 *   4. Movers and watchlist (what should I act on?)
 *
 * On mobile the same order becomes a single column, so the priority survives
 * the layout change rather than being an artefact of grid placement.
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { useStore, usePortfolio } from "@/lib/store";
import { INSTRUMENTS, BY_SYMBOL, buildSeries } from "@/lib/market";
import {
  rupees,
  signedMoney,
  signedPct,
  compact,
  toneClass,
  money,
} from "@/lib/format";
import { Card, CardHeader, Stat, Badge, Button, Segmented } from "@/components/ui/Primitives";
import { AreaChart, Sparkline } from "@/components/ui/Charts";
import { LivePrice, ChangeCell } from "@/components/market/LivePrice";
import { OrderTicket, TicketRequest } from "@/components/order/OrderTicket";

const INDICES = ["NIFTY50", "BANKNIFTY", "FINNIFTY", "SENSEX"];

export default function DashboardPage() {
  const { quotes, watchlist, funds } = useStore();
  const pf = usePortfolio();
  const [ticket, setTicket] = useState<TicketRequest | null>(null);
  const [range, setRange] = useState<"1D" | "1W" | "1M">("1D");

  // Top movers across the whole universe, excluding indices.
  const movers = useMemo(() => {
    const eq = INSTRUMENTS.filter((i) => i.segment === "EQ");
    const withQ = eq
      .map((i) => ({ inst: i, q: quotes[i.symbol] }))
      .filter((x) => x.q);
    const sorted = [...withQ].sort((a, b) => b.q.changePct - a.q.changePct);
    return { gainers: sorted.slice(0, 4), losers: sorted.slice(-4).reverse() };
  }, [quotes]);

  const chartSeries = useMemo(() => buildSeries("NIFTY50"), []);
  const niftyQ = quotes["NIFTY50"];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* ---------- Index strip ---------- */}
      <section className="scroll-x">
        <div className="flex gap-3 pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {INDICES.map((sym) => {
            const q = quotes[sym];
            const inst = BY_SYMBOL.get(sym);
            if (!q || !inst) return null;
            const up = q.change >= 0;
            return (
              <Link
                key={sym}
                href={`/stock/${sym}`}
                className="card card-pad min-w-[210px] flex-1 transition-colors hover:border-brand/50 sm:min-w-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-muted">
                    {inst.name}
                  </span>
                  <Badge tone={up ? "up" : "down"}>{signedPct(q.changePct)}</Badge>
                </div>
                <div className="mt-1.5 flex items-end justify-between gap-3">
                  <LivePrice value={q.ltp} prefix="" className="-ml-1 text-lg" />
                  <div className="w-20 shrink-0">
                    <Sparkline
                      data={buildSeries(sym, 30).map((c) => c.c)}
                      up={up}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------- Portfolio summary ---------- */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Portfolio value"
          value={rupees(pf.current)}
          sub={`Invested ${rupees(pf.invested)}`}
          icon={<PieChart size={15} />}
        />
        <Stat
          label="Overall P&L"
          value={signedMoney(pf.totalPnl)}
          sub={signedPct(pf.totalPnlPct)}
          tone={pf.totalPnl >= 0 ? "up" : "down"}
          icon={pf.totalPnl >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
        />
        <Stat
          label="Day's P&L"
          value={signedMoney(pf.dayPnl)}
          sub="Since previous close"
          tone={pf.dayPnl >= 0 ? "up" : "down"}
          icon={<ArrowUpRight size={15} />}
        />
        <Stat
          label="Available margin"
          value={rupees(funds)}
          sub="Ready to deploy"
          icon={<Wallet size={15} />}
        />
      </section>

      {/* ---------- Chart + allocation ---------- */}
      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader
            title="Nifty 50"
            subtitle={
              niftyQ
                ? `${money(niftyQ.ltp)} · ${signedPct(niftyQ.changePct)} today`
                : undefined
            }
            action={
              <Segmented
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { value: "1D", label: "1D" },
                  { value: "1W", label: "1W" },
                  { value: "1M", label: "1M" },
                ]}
              />
            }
          />
          <div className="p-3 pr-1 sm:p-4 sm:pr-2">
            <AreaChart
              candles={
                range === "1D"
                  ? chartSeries
                  : range === "1W"
                  ? chartSeries.filter((_, i) => i % 2 === 0)
                  : chartSeries.filter((_, i) => i % 3 === 0)
              }
              up={(niftyQ?.change ?? 0) >= 0}
              height={250}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Allocation" subtitle="By current value" />
          <div className="card-pad space-y-3">
            {pf.rows.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">No holdings yet.</p>
            ) : (
              pf.rows
                .slice()
                .sort((a, b) => b.currentValue - a.currentValue)
                .map((r) => {
                  const share = pf.current === 0 ? 0 : (r.currentValue / pf.current) * 100;
                  return (
                    <div key={r.symbol}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <Link
                          href={`/stock/${r.symbol}`}
                          className="truncate font-semibold text-ink hover:text-brand"
                        >
                          {r.symbol}
                        </Link>
                        <span className="tnum shrink-0 text-muted">
                          {share.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
                        <div
                          className={clsx(
                            "h-full rounded-full transition-all duration-500",
                            r.pnl >= 0 ? "bg-up" : "bg-down"
                          )}
                          style={{ width: `${Math.max(share, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </Card>
      </section>

      {/* ---------- Movers ---------- */}
      <section className="grid gap-5 lg:grid-cols-2">
        <MoversCard title="Top gainers" tone="up" rows={movers.gainers} onTrade={setTicket} />
        <MoversCard title="Top losers" tone="down" rows={movers.losers} onTrade={setTicket} />
      </section>

      {/* ---------- Watchlist preview ---------- */}
      <Card>
        <CardHeader
          title="Your watchlist"
          subtitle={`${watchlist.length} instruments`}
          action={
            <Link
              href="/watchlist"
              className="flex items-center gap-0.5 text-xs font-semibold text-brand hover:underline"
            >
              View all <ChevronRight size={14} />
            </Link>
          }
        />
        <div className="scroll-x">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="thead">
              <tr className="border-b border-hairline text-left">
                <Th>Instrument</Th>
                <Th right>LTP</Th>
                <Th right>Change</Th>
                <Th right className="hidden sm:table-cell">Trend</Th>
                <Th right>Action</Th>
              </tr>
            </thead>
            <tbody>
              {watchlist.slice(0, 6).map((sym) => {
                const q = quotes[sym];
                const inst = BY_SYMBOL.get(sym);
                if (!q || !inst) return null;
                return (
                  <tr
                    key={sym}
                    className="border-b border-hairline/60 last:border-0 hover:bg-raised/40"
                  >
                    <td className="px-4 py-2.5">
                      <Link href={`/stock/${sym}`} className="group block">
                        <div className="text-xs font-bold text-ink group-hover:text-brand">
                          {sym}
                        </div>
                        <div className="truncate text-2xs text-faint">{inst.name}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <LivePrice value={q.ltp} className="text-xs" />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ChangeCell change={q.change} pct={q.changePct} compact className="text-xs" />
                    </td>
                    <td className="hidden px-4 py-2.5 sm:table-cell">
                      <div className="ml-auto w-24">
                        <Sparkline
                          data={buildSeries(sym, 26).map((c) => c.c)}
                          up={q.change >= 0}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="buy" onClick={() => setTicket({ symbol: sym, side: "BUY" })}>
                          B
                        </Button>
                        <Button size="sm" variant="sell" onClick={() => setTicket({ symbol: sym, side: "SELL" })}>
                          S
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <OrderTicket request={ticket} onClose={() => setTicket(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MoversCard({
  title,
  tone,
  rows,
  onTrade,
}: {
  title: string;
  tone: "up" | "down";
  rows: { inst: (typeof INSTRUMENTS)[number]; q: any }[];
  onTrade: (r: TicketRequest) => void;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            {tone === "up" ? (
              <TrendingUp size={15} className="text-up" />
            ) : (
              <TrendingDown size={15} className="text-down" />
            )}
            {title}
          </span>
        }
      />
      <div className="divide-y divide-hairline/60">
        {rows.map(({ inst, q }) => (
          <div key={inst.symbol} className="flex items-center gap-3 px-4 py-2.5">
            <Link href={`/stock/${inst.symbol}`} className="min-w-0 flex-1 group">
              <div className="truncate text-xs font-bold text-ink group-hover:text-brand">
                {inst.symbol}
              </div>
              <div className="truncate text-2xs text-faint">{inst.sector}</div>
            </Link>

            <div className="hidden w-20 shrink-0 sm:block">
              <Sparkline
                data={buildSeries(inst.symbol, 24).map((c) => c.c)}
                up={q.changePct >= 0}
              />
            </div>

            <div className="shrink-0 text-right">
              <div className="tnum text-xs font-semibold text-ink">{money(q.ltp)}</div>
              <div className={clsx("tnum text-2xs font-semibold", toneClass(q.change))}>
                {signedPct(q.changePct)}
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => onTrade({ symbol: inst.symbol, side: tone === "up" ? "BUY" : "SELL" })}
            >
              Trade
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Th({
  children,
  right,
  className,
}: {
  children: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <th
      className={clsx(
        "px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-faint",
        right && "text-right",
        className
      )}
    >
      {children}
    </th>
  );
}

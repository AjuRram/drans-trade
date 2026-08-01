"use client";

/**
 * Instrument detail — the "company page".
 *
 * Layout: chart and key statistics lead, market depth and fundamentals follow.
 * On mobile the buy/sell actions become a fixed bar above the tab bar, so the
 * primary action is always reachable without scrolling back up.
 */

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowLeft,
  Plus,
  Check,
  TrendingUp,
  TrendingDown,
  Building2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { BY_SYMBOL, buildSeries } from "@/lib/market";
import {
  money,
  rupees,
  signedMoney,
  signedPct,
  compact,
  toneClass,
  qty as fmtQty,
} from "@/lib/format";
import { Card, CardHeader, Button, Badge, Segmented } from "@/components/ui/Primitives";
import { AreaChart, CandleChart, RangeBar } from "@/components/ui/Charts";
import { LivePrice } from "@/components/market/LivePrice";
import { OrderTicket, TicketRequest } from "@/components/order/OrderTicket";

export default function StockPage() {
  const params = useParams<{ symbol: string }>();
  const router = useRouter();
  const symbol = String(params?.symbol ?? "").toUpperCase();

  const { quotes, watchlist, positions, dispatch } = useStore();
  const [ticket, setTicket] = useState<TicketRequest | null>(null);
  const [chartKind, setChartKind] = useState<"area" | "candle">("area");

  const inst = BY_SYMBOL.get(symbol);
  const q = quotes[symbol];
  const candles = useMemo(() => buildSeries(symbol), [symbol]);
  const position = positions.find((p) => p.symbol === symbol);
  const watched = watchlist.includes(symbol);

  if (!inst || !q) {
    return (
      <Card className="card-pad mx-auto max-w-md text-center">
        <p className="text-sm font-semibold text-ink">Instrument not found</p>
        <p className="mt-1 text-xs text-muted">{symbol} is not in this universe.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/watchlist")}>
          Back to watchlist
        </Button>
      </Card>
    );
  }

  const up = q.change >= 0;

  // Synthetic five-level depth around the touch. Real depth comes from the
  // exchange; this keeps the shape and the visual weighting honest.
  const depth = useMemo(() => {
    const step = Math.max(0.05, q.ltp * 0.0006);
    const rows = Array.from({ length: 5 }, (_, i) => ({
      bid: q.bid - i * step,
      ask: q.ask + i * step,
      bidQty: Math.round(180 + Math.random() * 900) * (5 - i),
      askQty: Math.round(180 + Math.random() * 900) * (5 - i),
    }));
    const maxQ = Math.max(...rows.flatMap((r) => [r.bidQty, r.askQty]));
    return { rows, maxQ };
  }, [q.bid, q.ask, q.ltp]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="mt-0.5 rounded-soft p-1.5 text-muted hover:bg-raised hover:text-ink"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-ink">{symbol}</h1>
            <Badge tone="neutral">{inst.segment}</Badge>
            <Badge tone="brand">{inst.sector}</Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">{inst.name}</p>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <LivePrice value={q.ltp} className="-ml-1 text-2xl sm:text-3xl" />
            <span className={clsx("tnum text-sm font-semibold", toneClass(q.change))}>
              {signedMoney(q.change)} ({signedPct(q.changePct)})
            </span>
          </div>
        </div>

        <button
          onClick={() =>
            dispatch({
              type: watched ? "WATCH_REMOVE" : "WATCH_ADD",
              symbol,
            })
          }
          className={clsx(
            "shrink-0 rounded-soft border px-3 py-2 text-xs font-semibold transition-colors",
            watched
              ? "border-up/40 text-up hover:bg-up/10"
              : "border-hairline text-muted hover:border-brand hover:text-brand"
          )}
        >
          <span className="flex items-center gap-1.5">
            {watched ? <Check size={14} /> : <Plus size={14} />}
            <span className="hidden sm:inline">{watched ? "Watching" : "Watch"}</span>
          </span>
        </button>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader
          title="Price"
          subtitle="Intraday · 5-minute intervals"
          action={
            <Segmented
              size="sm"
              value={chartKind}
              onChange={(v) => setChartKind(v as "area" | "candle")}
              options={[
                { value: "area", label: "Area" },
                { value: "candle", label: "Candle" },
              ]}
            />
          }
        />
        <div className="p-3 pr-1 sm:p-4 sm:pr-2">
          {chartKind === "area" ? (
            <AreaChart candles={candles} up={up} height={280} />
          ) : (
            <CandleChart candles={candles} height={280} />
          )}
        </div>
      </Card>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="Open" value={money(q.open)} />
        <MiniStat label="High" value={money(q.high)} tone="up" />
        <MiniStat label="Low" value={money(q.low)} tone="down" />
        <MiniStat label="Prev close" value={money(q.prevClose)} />
        <MiniStat label="Volume" value={compact(q.volume)} />
        <MiniStat label="Bid / Ask" value={`${money(q.bid)} / ${money(q.ask)}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Depth */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader title="Market depth" subtitle="Top 5 bids and asks" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="thead">
                <tr className="border-b border-hairline text-2xs uppercase tracking-wider text-faint">
                  <th className="px-4 py-2 text-left font-semibold">Bid qty</th>
                  <th className="px-4 py-2 text-right font-semibold">Bid</th>
                  <th className="px-4 py-2 text-right font-semibold">Ask</th>
                  <th className="px-4 py-2 text-right font-semibold">Ask qty</th>
                </tr>
              </thead>
              <tbody>
                {depth.rows.map((r, i) => (
                  <tr key={i} className="border-b border-hairline/50 last:border-0">
                    <td className="relative px-4 py-2">
                      <span
                        className="absolute inset-y-0 left-0 bg-up/10"
                        style={{ width: `${(r.bidQty / depth.maxQ) * 100}%` }}
                        aria-hidden="true"
                      />
                      <span className="tnum relative text-2xs text-muted">
                        {fmtQty(r.bidQty)}
                      </span>
                    </td>
                    <td className="tnum px-4 py-2 text-right text-xs font-semibold text-up">
                      {money(r.bid)}
                    </td>
                    <td className="tnum px-4 py-2 text-right text-xs font-semibold text-down">
                      {money(r.ask)}
                    </td>
                    <td className="relative px-4 py-2 text-right">
                      <span
                        className="absolute inset-y-0 right-0 bg-down/10"
                        style={{ width: `${(r.askQty / depth.maxQ) * 100}%` }}
                        aria-hidden="true"
                      />
                      <span className="tnum relative text-2xs text-muted">
                        {fmtQty(r.askQty)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right rail */}
        <div className="min-w-0 space-y-5">
          <Card className="card-pad">
            <p className="eyebrow mb-3">Day range</p>
            <RangeBar low={q.low} high={q.high} value={q.ltp} />
          </Card>

          {position ? (
            <Card>
              <CardHeader title="Your position" />
              <div className="card-pad space-y-2 text-xs">
                <KV label="Quantity" value={`${position.qty > 0 ? "" : "-"}${Math.abs(position.qty)}`} />
                <KV label="Average price" value={money(position.avg)} />
                <KV label="Invested" value={rupees(position.avg * Math.abs(position.qty))} />
                <div className="divider my-1" />
                {(() => {
                  const dir = Math.sign(position.qty) || 1;
                  const pnl = (q.ltp - position.avg) * Math.abs(position.qty) * dir;
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Unrealised P&L</span>
                      <span className={clsx("tnum font-bold", toneClass(pnl))}>
                        {signedMoney(pnl)}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="About" />
            <div className="card-pad space-y-2 text-xs">
              <KV label="Sector" value={inst.sector} />
              <KV label="Segment" value={inst.segment} />
              <KV
                label="Volatility"
                value={`${(inst.vol * 100).toFixed(1)}% daily`}
              />
              <p className="pt-1 leading-relaxed text-muted">
                {inst.name} trades in the {inst.sector.toLowerCase()} sector.
                Figures shown are simulated for demonstration.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Desktop actions */}
      <div className="hidden gap-3 lg:flex">
        <Button size="lg" variant="buy" className="min-w-40" onClick={() => setTicket({ symbol, side: "BUY" })}>
          <TrendingUp size={17} /> BUY
        </Button>
        <Button size="lg" variant="sell" className="min-w-40" onClick={() => setTicket({ symbol, side: "SELL" })}>
          <TrendingDown size={17} /> SELL
        </Button>
      </div>

      {/* Mobile sticky actions, above the tab bar */}
      <div
        className="fixed inset-x-0 bottom-[62px] z-30 flex gap-2 border-t border-hairline bg-surface/95 p-3 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom))` }}
      >
        <Button variant="buy" className="flex-1" size="lg" onClick={() => setTicket({ symbol, side: "BUY" })}>
          BUY
        </Button>
        <Button variant="sell" className="flex-1" size="lg" onClick={() => setTicket({ symbol, side: "SELL" })}>
          SELL
        </Button>
      </div>

      <OrderTicket request={ticket} onClose={() => setTicket(null)} />
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="card px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p
        className={clsx(
          "tnum mt-1 text-xs font-semibold sm:text-sm",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          !tone && "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="tnum font-semibold text-ink">{value}</span>
    </div>
  );
}

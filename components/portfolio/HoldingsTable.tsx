"use client";

/**
 * Shared portfolio table used by both Positions and Holdings.
 *
 * The two pages differ in framing rather than data shape — positions are the
 * intraday view, holdings the longer-term one — so the presentation lives here
 * once and each page supplies its own copy and summary.
 */

import React, { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useStore, usePortfolio } from "@/lib/store";
import { money, rupees, signedMoney, signedPct, toneClass } from "@/lib/format";
import { Card, Button, Badge, EmptyState } from "@/components/ui/Primitives";
import { LivePrice } from "@/components/market/LivePrice";
import { OrderTicket, TicketRequest } from "@/components/order/OrderTicket";

export function HoldingsTable({
  emptyTitle,
  emptyHint,
  icon,
}: {
  emptyTitle: string;
  emptyHint: string;
  icon?: React.ReactNode;
}) {
  const pf = usePortfolio();
  const [ticket, setTicket] = useState<TicketRequest | null>(null);

  if (pf.rows.length === 0) {
    return (
      <Card>
        <EmptyState icon={icon} title={emptyTitle} hint={emptyHint} />
      </Card>
    );
  }

  return (
    <>
      {/* Table — sm and up */}
      <Card className="hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="thead">
              <tr className="border-b border-hairline text-2xs uppercase tracking-wider text-faint">
                <th className="px-4 py-2.5 text-left font-semibold">Instrument</th>
                <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                <th className="px-4 py-2.5 text-right font-semibold">Avg</th>
                <th className="px-4 py-2.5 text-right font-semibold">LTP</th>
                <th className="px-4 py-2.5 text-right font-semibold">Invested</th>
                <th className="px-4 py-2.5 text-right font-semibold">Current</th>
                <th className="px-4 py-2.5 text-right font-semibold">P&L</th>
                <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pf.rows.map((r) => (
                <tr key={r.symbol} className="border-b border-hairline/60 last:border-0 hover:bg-raised/40">
                  <td className="px-4 py-3">
                    <Link href={`/stock/${r.symbol}`} className="group block">
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink group-hover:text-brand">
                          {r.symbol}
                        </span>
                        {r.qty < 0 ? <Badge tone="down">SHORT</Badge> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-2xs text-faint">{r.name}</span>
                    </Link>
                  </td>
                  <td className="tnum px-4 py-3 text-right text-xs text-ink">{Math.abs(r.qty)}</td>
                  <td className="tnum px-4 py-3 text-right text-xs text-muted">{money(r.avg)}</td>
                  <td className="px-4 py-3 text-right">
                    <LivePrice value={r.ltp} className="text-xs" />
                  </td>
                  <td className="tnum px-4 py-3 text-right text-xs text-muted">
                    {rupees(r.invested)}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-xs text-ink">
                    {rupees(r.currentValue)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className={clsx("tnum text-xs font-bold", toneClass(r.pnl))}>
                      {signedMoney(r.pnl)}
                    </div>
                    <div className={clsx("tnum text-2xs", toneClass(r.pnl))}>
                      {signedPct(r.pnlPct)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="buy" onClick={() => setTicket({ symbol: r.symbol, side: "BUY" })}>
                        ADD
                      </Button>
                      <Button size="sm" variant="sell" onClick={() => setTicket({ symbol: r.symbol, side: "SELL" })}>
                        EXIT
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cards — below sm */}
      <div className="space-y-2.5 sm:hidden">
        {pf.rows.map((r) => (
          <Card key={r.symbol} className="card-pad">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/stock/${r.symbol}`} className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">{r.symbol}</span>
                  {r.qty < 0 ? <Badge tone="down">SHORT</Badge> : null}
                </span>
                <span className="block truncate text-2xs text-faint">{r.name}</span>
              </Link>
              <div className="shrink-0 text-right">
                <div className={clsx("tnum text-sm font-bold", toneClass(r.pnl))}>
                  {signedMoney(r.pnl)}
                </div>
                <div className={clsx("tnum text-2xs", toneClass(r.pnl))}>
                  {signedPct(r.pnlPct)}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5 text-2xs">
              <Mini label="Qty" value={String(Math.abs(r.qty))} />
              <Mini label="Avg" value={money(r.avg)} />
              <Mini label="LTP" value={money(r.ltp)} />
              <Mini label="Value" value={rupees(r.currentValue)} />
            </div>

            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="buy" className="flex-1" onClick={() => setTicket({ symbol: r.symbol, side: "BUY" })}>
                ADD
              </Button>
              <Button size="sm" variant="sell" className="flex-1" onClick={() => setTicket({ symbol: r.symbol, side: "SELL" })}>
                EXIT
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <OrderTicket request={ticket} onClose={() => setTicket(null)} />
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-canvas px-1.5 py-1.5 text-center">
      <p className="text-faint">{label}</p>
      <p className="tnum mt-0.5 truncate font-semibold text-ink">{value}</p>
    </div>
  );
}

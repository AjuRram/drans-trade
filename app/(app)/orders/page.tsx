"use client";

/**
 * Order book. Open orders can be cancelled; executed and cancelled orders are
 * kept for the session so the audit trail is visible.
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ScrollText, X } from "lucide-react";
import { useStore, OrderStatus } from "@/lib/store";
import { money, rupees, hhmm } from "@/lib/format";
import { Card, Badge, Button, EmptyState, Segmented } from "@/components/ui/Primitives";

type Filter = "ALL" | "OPEN" | "EXECUTED" | "CANCELLED";

export default function OrdersPage() {
  const { orders, dispatch } = useStore();
  const [filter, setFilter] = useState<Filter>("ALL");

  const rows = useMemo(
    () => (filter === "ALL" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  const counts = useMemo(
    () => ({
      ALL: orders.length,
      OPEN: orders.filter((o) => o.status === "OPEN").length,
      EXECUTED: orders.filter((o) => o.status === "EXECUTED").length,
      CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
    }),
    [orders]
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-ink">Orders</h1>
          <p className="mt-0.5 text-xs text-muted">{counts.ALL} orders this session</p>
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          size="sm"
          options={[
            { value: "ALL", label: `All ${counts.ALL}` },
            { value: "OPEN", label: `Open ${counts.OPEN}` },
            { value: "EXECUTED", label: `Filled ${counts.EXECUTED}` },
            { value: "CANCELLED", label: `Cancelled ${counts.CANCELLED}` },
          ]}
        />
      </header>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ScrollText size={18} />}
            title={filter === "ALL" ? "No orders yet" : `No ${filter.toLowerCase()} orders`}
            hint="Place an order from the watchlist or an instrument page and it will appear here."
            action={
              <Link href="/watchlist">
                <Button variant="outline" size="sm">Go to watchlist</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* Table — sm and up */}
          <Card className="hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="thead">
                  <tr className="border-b border-hairline text-2xs uppercase tracking-wider text-faint">
                    <th className="px-4 py-2.5 text-left font-semibold">Time</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Instrument</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Side</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Type</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Price</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Value</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className="border-b border-hairline/60 last:border-0 hover:bg-raised/40">
                      <td className="tnum px-4 py-3 text-2xs text-muted">{hhmm(o.placedAt)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/stock/${o.symbol}`} className="text-xs font-bold text-ink hover:text-brand">
                          {o.symbol}
                        </Link>
                        <div className="text-2xs text-faint">{o.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={o.side === "BUY" ? "up" : "down"}>{o.side}</Badge>
                      </td>
                      <td className="tnum px-4 py-3 text-right text-xs text-ink">{o.qty}</td>
                      <td className="px-4 py-3 text-right text-2xs text-muted">{o.type}</td>
                      <td className="tnum px-4 py-3 text-right text-xs text-ink">{money(o.price)}</td>
                      <td className="tnum px-4 py-3 text-right text-xs text-muted">
                        {rupees(o.price * o.qty)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {o.status === "OPEN" ? (
                          <button
                            onClick={() => dispatch({ type: "ORDER_CANCEL", id: o.id })}
                            className="rounded-md border border-hairline px-2 py-1 text-2xs font-semibold text-muted hover:border-down/40 hover:text-down"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Cards — below sm */}
          <div className="space-y-2.5 sm:hidden">
            {rows.map((o) => (
              <Card key={o.id} className="card-pad">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/stock/${o.symbol}`} className="text-sm font-bold text-ink">
                        {o.symbol}
                      </Link>
                      <Badge tone={o.side === "BUY" ? "up" : "down"}>{o.side}</Badge>
                    </div>
                    <p className="mt-0.5 text-2xs text-faint">
                      {o.id} · {hhmm(o.placedAt)}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-2xs">
                  <Cell label="Qty" value={String(o.qty)} />
                  <Cell label={o.type === "LIMIT" ? "Limit" : "Price"} value={money(o.price)} />
                  <Cell label="Value" value={rupees(o.price * o.qty)} />
                </div>

                {o.status === "OPEN" ? (
                  <Button
                    size="sm"
                    variant="danger"
                    block
                    className="mt-3"
                    onClick={() => dispatch({ type: "ORDER_CANCEL", id: o.id })}
                  >
                    <X size={13} /> Cancel order
                  </Button>
                ) : null}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const map = {
    OPEN: { tone: "warn", label: "Open" },
    EXECUTED: { tone: "up", label: "Filled" },
    CANCELLED: { tone: "neutral", label: "Cancelled" },
  } as const;
  const s = map[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-canvas px-2 py-1.5">
      <p className="text-faint">{label}</p>
      <p className="tnum mt-0.5 font-semibold text-ink">{value}</p>
    </div>
  );
}

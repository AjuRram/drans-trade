"use client";

/**
 * Order ticket.
 *
 * Presented as a right-hand drawer on desktop and a bottom sheet on mobile —
 * bottom sheets keep the primary action inside thumb reach, which matters when
 * the action is irreversible.
 *
 * Safety details that matter in a trading UI:
 *   - BUY and SELL are colour-coded and the confirm button restates the side
 *   - the order value and post-trade margin update live as you type
 *   - insufficient margin disables submission rather than failing after the fact
 */

import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { X, Info } from "lucide-react";
import { useStore, Side, OrderType, Order } from "@/lib/store";
import { BY_SYMBOL } from "@/lib/market";
import { money, rupees, signedPct, toneClass } from "@/lib/format";
import { Button, Segmented, Badge } from "@/components/ui/Primitives";
import { LivePrice } from "@/components/market/LivePrice";

export interface TicketRequest {
  symbol: string;
  side: Side;
}

export function OrderTicket({
  request,
  onClose,
}: {
  request: TicketRequest | null;
  onClose: () => void;
}) {
  const { quotes, funds, dispatch } = useStore();

  const [side, setSide] = useState<Side>("BUY");
  const [type, setType] = useState<OrderType>("MARKET");
  const [qty, setQty] = useState("1");
  const [limit, setLimit] = useState("");
  const [done, setDone] = useState<null | "placed">(null);

  const symbol = request?.symbol ?? "";
  const q = quotes[symbol];
  const inst = BY_SYMBOL.get(symbol);

  // Reset the form whenever a new ticket is opened.
  useEffect(() => {
    if (!request) return;
    setSide(request.side);
    setType("MARKET");
    setQty("1");
    setLimit(quotes[request.symbol]?.ltp.toFixed(2) ?? "");
    setDone(null);
  }, [request, quotes]);

  // Escape closes — expected for any modal surface.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const nQty = Math.max(0, parseInt(qty || "0", 10) || 0);
  const price = type === "LIMIT" ? parseFloat(limit || "0") || 0 : q?.ltp ?? 0;
  const value = nQty * price;

  const marginAfter = side === "BUY" ? funds - value : funds + value;
  const insufficient = side === "BUY" && value > funds;
  const invalid = nQty <= 0 || price <= 0 || insufficient;

  const submit = () => {
    if (invalid || !q) return;
    const order: Order = {
      id: `ORD${Date.now().toString().slice(-8)}`,
      symbol,
      side,
      qty: nQty,
      type,
      limitPrice: type === "LIMIT" ? price : undefined,
      price,
      // Market orders fill immediately; limit orders rest until the tick engine
      // trades through them.
      status: type === "MARKET" ? "EXECUTED" : "OPEN",
      placedAt: Date.now(),
    };
    dispatch({ type: "ORDER_PLACE", order });
    setDone("placed");
    setTimeout(onClose, 1100);
  };

  const open = Boolean(request && q && inst);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={clsx(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden="true"
      />

      {/* Sheet on mobile, drawer on desktop */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Order ticket"
        className={clsx(
          "fixed z-50 flex flex-col bg-surface transition-transform duration-250 ease-out",
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t border-hairline",
          "sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[400px] sm:rounded-none sm:border-l sm:border-t-0",
          open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {open && q && inst ? (
          <>
            {/* Grab handle, mobile affordance only */}
            <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-hairline sm:hidden" />

            <header className="flex items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-base font-bold text-ink">{symbol}</h2>
                  <Badge tone="neutral">{inst.segment}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">{inst.name}</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close order ticket"
                className="-mr-1.5 rounded-soft p-1.5 text-muted hover:bg-raised hover:text-ink"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex items-baseline gap-2 px-5 pb-4">
              <LivePrice value={q.ltp} className="-ml-1 text-xl" />
              <span className={clsx("tnum text-xs font-semibold", toneClass(q.change))}>
                {signedPct(q.changePct)}
              </span>
            </div>

            <div className="divider" />

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {/* Side */}
              <div className="grid grid-cols-2 gap-2">
                {(["BUY", "SELL"] as Side[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    className={clsx(
                      "h-11 rounded-soft text-sm font-bold transition-all",
                      side === s
                        ? s === "BUY"
                          ? "bg-up text-[#05231A]"
                          : "bg-down text-[#2A0A10]"
                        : "border border-hairline text-muted hover:text-ink"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Type */}
              <div>
                <label className="eyebrow mb-1.5 block">Order type</label>
                <Segmented
                  value={type}
                  onChange={(v) => setType(v as OrderType)}
                  options={[
                    { value: "MARKET", label: "Market" },
                    { value: "LIMIT", label: "Limit" },
                  ]}
                />
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="ord-qty" className="eyebrow mb-1.5 block">
                  Quantity
                </label>
                <input
                  id="ord-qty"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
                  className="tnum h-11 w-full rounded-soft border border-hairline bg-canvas px-3.5 text-sm font-semibold text-ink outline-none focus:border-brand"
                />
                <div className="mt-2 flex gap-1.5">
                  {[1, 5, 10, 25, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQty(String(n))}
                      className="rounded-md border border-hairline px-2 py-1 text-2xs font-semibold text-muted hover:border-brand hover:text-brand"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Limit price */}
              {type === "LIMIT" ? (
                <div>
                  <label htmlFor="ord-limit" className="eyebrow mb-1.5 block">
                    Limit price
                  </label>
                  <input
                    id="ord-limit"
                    inputMode="decimal"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value.replace(/[^\d.]/g, ""))}
                    className="tnum h-11 w-full rounded-soft border border-hairline bg-canvas px-3.5 text-sm font-semibold text-ink outline-none focus:border-brand"
                  />
                  <p className="mt-1.5 flex items-start gap-1.5 text-2xs text-faint">
                    <Info size={12} className="mt-0.5 shrink-0" />
                    Rests until the market trades at your price.
                  </p>
                </div>
              ) : null}

              {/* Summary */}
              <div className="space-y-2 rounded-soft bg-canvas p-3.5">
                <Row label="Order value" value={rupees(value)} />
                <Row
                  label="Bid / Ask"
                  value={`${money(q.bid)} / ${money(q.ask)}`}
                />
                <div className="divider my-1" />
                <Row label="Available margin" value={rupees(funds)} />
                <Row
                  label="Margin after"
                  value={rupees(marginAfter)}
                  tone={insufficient ? "down" : undefined}
                />
              </div>

              {insufficient ? (
                <p role="alert" className="text-xs font-medium text-down">
                  Order value exceeds available margin.
                </p>
              ) : null}
            </div>

            <footer className="border-t border-hairline p-4">
              {done ? (
                <div className="flex h-12 items-center justify-center rounded-soft bg-up/12 text-sm font-bold text-up">
                  Order placed
                </div>
              ) : (
                <Button
                  block
                  size="lg"
                  variant={side === "BUY" ? "buy" : "sell"}
                  disabled={invalid}
                  onClick={submit}
                >
                  {side} {nQty > 0 ? nQty : ""} {symbol}
                </Button>
              )}
            </footer>
          </>
        ) : null}
      </aside>
    </>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "down";
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span
        className={clsx(
          "tnum font-semibold",
          tone === "down" ? "text-down" : "text-ink"
        )}
      >
        {value}
      </span>
    </div>
  );
}

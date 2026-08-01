"use client";

/**
 * Funds — margin summary and a simple add/withdraw form.
 *
 * The form is deliberately non-functional against any backend; it demonstrates
 * validation states, disabled reasoning and the confirmation pattern used
 * throughout the app.
 */

import React, { useState } from "react";
import clsx from "clsx";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Check } from "lucide-react";
import { useStore, usePortfolio } from "@/lib/store";
import { rupees, signedMoney } from "@/lib/format";
import { Card, CardHeader, Button, Stat, Segmented, Badge } from "@/components/ui/Primitives";

export default function FundsPage() {
  const { funds } = useStore();
  const pf = usePortfolio();

  const [mode, setMode] = useState<"ADD" | "WITHDRAW">("ADD");
  const [amount, setAmount] = useState("");
  const [done, setDone] = useState(false);

  const n = parseFloat(amount || "0") || 0;
  const tooMuch = mode === "WITHDRAW" && n > funds;
  const invalid = n <= 0 || tooMuch;

  const submit = () => {
    if (invalid) return;
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setAmount("");
    }, 1600);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header>
        <h1 className="text-lg font-bold tracking-tight text-ink">Funds</h1>
        <p className="mt-0.5 text-xs text-muted">Margin, ledger and transfers</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Available margin" value={rupees(funds)} icon={<Wallet size={15} />} />
        <Stat label="Used margin" value={rupees(pf.invested)} sub="Across open positions" />
        <Stat
          label="Unrealised P&L"
          value={signedMoney(pf.totalPnl)}
          tone={pf.totalPnl >= 0 ? "up" : "down"}
        />
        <Stat label="Net worth" value={rupees(funds + pf.current)} sub="Cash + holdings" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Transfer form */}
        <Card className="min-w-0 lg:col-span-1">
          <CardHeader title="Transfer funds" />
          <div className="card-pad space-y-4">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "ADD", label: "Add" },
                { value: "WITHDRAW", label: "Withdraw" },
              ]}
              className="w-full"
            />

            <div>
              <label htmlFor="amt" className="eyebrow mb-1.5 block">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">
                  ₹
                </span>
                <input
                  id="amt"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0.00"
                  className="tnum h-11 w-full rounded-soft border border-hairline bg-canvas pl-8 pr-3.5 text-sm font-semibold text-ink outline-none focus:border-brand"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[5000, 10000, 25000, 50000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    className="rounded-md border border-hairline px-2 py-1 text-2xs font-semibold text-muted hover:border-brand hover:text-brand"
                  >
                    ₹{v.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
            </div>

            {tooMuch ? (
              <p role="alert" className="text-xs font-medium text-down">
                Amount exceeds your available margin.
              </p>
            ) : null}

            {done ? (
              <div className="flex h-11 items-center justify-center gap-2 rounded-soft bg-up/12 text-sm font-bold text-up">
                <Check size={16} /> Request submitted
              </div>
            ) : (
              <Button block size="lg" disabled={invalid} onClick={submit}>
                {mode === "ADD" ? (
                  <>
                    <ArrowDownToLine size={16} /> Add funds
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine size={16} /> Withdraw
                  </>
                )}
              </Button>
            )}

            <p className="text-2xs leading-relaxed text-faint">
              Demonstration only — no payment gateway is connected and no money moves.
            </p>
          </div>
        </Card>

        {/* Ledger */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader title="Recent ledger" subtitle="Simulated entries" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="thead">
                <tr className="border-b border-hairline text-2xs uppercase tracking-wider text-faint">
                  <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Description</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {LEDGER.map((e, i) => (
                  <tr key={i} className="border-b border-hairline/60 last:border-0">
                    <td className="px-4 py-3 text-2xs text-muted">{e.date}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-ink">{e.desc}</span>
                      <Badge tone={e.kind === "CREDIT" ? "up" : "neutral"} className="ml-2">
                        {e.kind}
                      </Badge>
                    </td>
                    <td
                      className={clsx(
                        "tnum px-4 py-3 text-right text-xs font-semibold",
                        e.amount >= 0 ? "text-up" : "text-down"
                      )}
                    >
                      {signedMoney(e.amount)}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-xs text-muted">
                      {rupees(e.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

const LEDGER = [
  { date: "01 Aug", desc: "Funds added via UPI", kind: "CREDIT", amount: 50000, balance: 485260.75 },
  { date: "29 Jul", desc: "Brokerage & charges", kind: "DEBIT", amount: -184.2, balance: 435260.75 },
  { date: "28 Jul", desc: "Equity purchase — RELIANCE", kind: "DEBIT", amount: -114408.0, balance: 435444.95 },
  { date: "24 Jul", desc: "Equity sale — WIPRO", kind: "CREDIT", amount: 27140.0, balance: 549852.95 },
  { date: "22 Jul", desc: "Funds added via NEFT", kind: "CREDIT", amount: 100000, balance: 522712.95 },
  { date: "18 Jul", desc: "Dividend — ITC", kind: "CREDIT", amount: 2145.0, balance: 422712.95 },
] as const;

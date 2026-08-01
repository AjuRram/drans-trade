"use client";

import { Briefcase } from "lucide-react";
import { usePortfolio } from "@/lib/store";
import { rupees, signedMoney, signedPct } from "@/lib/format";
import { Stat } from "@/components/ui/Primitives";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";

export default function HoldingsPage() {
  const pf = usePortfolio();
  const best = [...pf.rows].sort((a, b) => b.pnlPct - a.pnlPct)[0];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header>
        <h1 className="text-lg font-bold tracking-tight text-ink">Holdings</h1>
        <p className="mt-0.5 text-xs text-muted">
          Long-term portfolio · {pf.rows.length} instruments
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total investment" value={rupees(pf.invested)} />
        <Stat label="Market value" value={rupees(pf.current)} />
        <Stat
          label="Total returns"
          value={signedMoney(pf.totalPnl)}
          sub={signedPct(pf.totalPnlPct)}
          tone={pf.totalPnl >= 0 ? "up" : "down"}
        />
        <Stat
          label="Best performer"
          value={best ? best.symbol : "—"}
          sub={best ? signedPct(best.pnlPct) : undefined}
          tone={best && best.pnl >= 0 ? "up" : "down"}
        />
      </div>

      <HoldingsTable
        icon={<Briefcase size={18} />}
        emptyTitle="No holdings yet"
        emptyHint="Instruments you hold will be listed here with live valuations."
      />
    </div>
  );
}

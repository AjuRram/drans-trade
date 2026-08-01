"use client";

import { Layers } from "lucide-react";
import { usePortfolio } from "@/lib/store";
import { rupees, signedMoney, signedPct } from "@/lib/format";
import { Stat } from "@/components/ui/Primitives";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";

export default function PositionsPage() {
  const pf = usePortfolio();

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header>
        <h1 className="text-lg font-bold tracking-tight text-ink">Positions</h1>
        <p className="mt-0.5 text-xs text-muted">
          {pf.rows.length} open positions · marked to market
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Invested" value={rupees(pf.invested)} />
        <Stat label="Current value" value={rupees(pf.current)} />
        <Stat
          label="Unrealised P&L"
          value={signedMoney(pf.totalPnl)}
          sub={signedPct(pf.totalPnlPct)}
          tone={pf.totalPnl >= 0 ? "up" : "down"}
        />
        <Stat
          label="Day's P&L"
          value={signedMoney(pf.dayPnl)}
          tone={pf.dayPnl >= 0 ? "up" : "down"}
        />
      </div>

      <HoldingsTable
        icon={<Layers size={18} />}
        emptyTitle="No open positions"
        emptyHint="Positions appear here once an order is filled."
      />
    </div>
  );
}

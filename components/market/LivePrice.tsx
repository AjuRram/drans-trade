"use client";

/**
 * Price cells that flash green/red on change.
 *
 * The flash is driven by comparing against the previous render's value held in
 * a ref, then re-keying the element so the CSS animation restarts. Using a key
 * bump is more reliable than toggling a class, which can miss rapid successive
 * ticks because the animation never gets a chance to reset.
 */

import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { money, signedMoney, signedPct, toneClass } from "@/lib/format";

export function LivePrice({
  value,
  className,
  prefix = "₹",
}: {
  value: number;
  className?: string;
  prefix?: string;
}) {
  const prev = useRef(value);
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  const [seq, setSeq] = useState(0);

  useEffect(() => {
    if (value === prev.current) return;
    setDir(value > prev.current ? 1 : -1);
    setSeq((s) => s + 1);
    prev.current = value;
  }, [value]);

  return (
    <span
      key={seq}
      className={clsx(
        "tnum inline-block rounded px-1 font-semibold tabular-nums",
        dir === 1 && "animate-flash-up",
        dir === -1 && "animate-flash-down",
        className
      )}
    >
      {prefix}
      {money(value)}
    </span>
  );
}

/** Change + percent, coloured by sign. */
export function ChangeCell({
  change,
  pct,
  compact = false,
  className,
}: {
  change: number;
  pct: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={clsx("tnum font-medium", toneClass(change), className)}>
      {compact ? (
        signedPct(pct)
      ) : (
        <>
          {signedMoney(change)}{" "}
          <span className="opacity-80">({signedPct(pct)})</span>
        </>
      )}
    </span>
  );
}

/** Small pulsing dot used to indicate a live stream. */
export function LiveDot({ active }: { active: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2" aria-hidden="true">
      <span
        className={clsx(
          "inline-flex h-2 w-2 rounded-full",
          active ? "animate-pulse-dot bg-up" : "bg-faint"
        )}
      />
    </span>
  );
}

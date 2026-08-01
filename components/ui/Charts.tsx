"use client";

/**
 * Charts, hand-written in SVG.
 *
 * No charting library. For the shapes this app needs — sparkline, area, candle,
 * depth bar — a dependency would add far more weight than it saves, and drawing
 * them directly keeps full control over how they respond at mobile widths.
 *
 * Every chart uses a viewBox with preserveAspectRatio="none" so it stretches to
 * its container, which is what makes them responsive without JS measurement.
 */

import React, { useId, useMemo } from "react";
import clsx from "clsx";
import type { Candle } from "@/lib/market";

/* ------------------------------------------------------------------ */
/* Sparkline — inline trend, used in tables and cards                  */
/* ------------------------------------------------------------------ */

export function Sparkline({
  data,
  up,
  className,
  strokeWidth = 1.6,
}: {
  data: number[];
  up: boolean;
  className?: string;
  strokeWidth?: number;
}) {
  const d = useMemo(() => {
    if (data.length < 2) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const stepX = 100 / (data.length - 1);

    return data
      .map((v, i) => {
        const x = i * stepX;
        // SVG y grows downward, so invert.
        const y = 30 - ((v - min) / span) * 28 - 1;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [data]);

  if (!d) return null;

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className={clsx("h-8 w-full", className)}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke={up ? "rgb(var(--up))" : "rgb(var(--down))"}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Area chart — the main instrument chart                              */
/* ------------------------------------------------------------------ */

export function AreaChart({
  candles,
  up,
  height = 260,
  showAxis = true,
}: {
  candles: Candle[];
  up: boolean;
  height?: number;
  showAxis?: boolean;
}) {
  const gid = useId();

  const { line, area, min, max, mid } = useMemo(() => {
    const closes = candles.map((c) => c.c);
    if (closes.length < 2)
      return { line: "", area: "", min: 0, max: 0, mid: 0 };

    const lo = Math.min(...closes);
    const hi = Math.max(...closes);
    // Pad so the line never touches the frame edges.
    const pad = (hi - lo) * 0.12 || 1;
    const min = lo - pad;
    const max = hi + pad;
    const span = max - min;
    const stepX = 100 / (closes.length - 1);

    const pts = closes.map((v, i) => {
      const x = i * stepX;
      const y = 100 - ((v - min) / span) * 100;
      return [x, y] as const;
    });

    const line = pts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");

    const area = `${line} L100,100 L0,100 Z`;

    return { line, area, min, max, mid: (min + max) / 2 };
  }, [candles]);

  if (!line) return null;

  const stroke = up ? "rgb(var(--up))" : "rgb(var(--down))";

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Price chart"
      >
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal guides. Drawn in user units so they stay crisp. */}
        {[25, 50, 75].map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke="rgb(var(--hairline))"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={area} fill={`url(#fill-${gid})`} />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {showAxis ? (
        <div className="tnum pointer-events-none absolute inset-y-0 right-0 flex w-14 flex-col justify-between py-0.5 text-right text-2xs text-faint">
          <span>{max.toFixed(1)}</span>
          <span>{mid.toFixed(1)}</span>
          <span>{min.toFixed(1)}</span>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Candlestick chart                                                   */
/* ------------------------------------------------------------------ */

export function CandleChart({
  candles,
  height = 300,
}: {
  candles: Candle[];
  height?: number;
}) {
  const { bars, min, max } = useMemo(() => {
    if (!candles.length) return { bars: [], min: 0, max: 0 };
    const lo = Math.min(...candles.map((c) => c.l));
    const hi = Math.max(...candles.map((c) => c.h));
    const pad = (hi - lo) * 0.08 || 1;
    const min = lo - pad;
    const max = hi + pad;
    const span = max - min;

    const slot = 100 / candles.length;
    const bodyW = Math.max(slot * 0.58, 0.35);

    const y = (v: number) => 100 - ((v - min) / span) * 100;

    const bars = candles.map((c, i) => {
      const cx = i * slot + slot / 2;
      const rising = c.c >= c.o;
      const top = y(Math.max(c.o, c.c));
      const bot = y(Math.min(c.o, c.c));
      return {
        key: c.t,
        cx,
        x: cx - bodyW / 2,
        w: bodyW,
        yTop: top,
        // Guarantee a visible body even on a doji.
        h: Math.max(bot - top, 0.6),
        wickTop: y(c.h),
        wickBot: y(c.l),
        rising,
      };
    });

    return { bars, min, max };
  }, [candles]);

  if (!bars.length) return null;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Candlestick chart"
      >
        {[20, 40, 60, 80].map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke="rgb(var(--hairline))"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {bars.map((b) => {
          const col = b.rising ? "rgb(var(--up))" : "rgb(var(--down))";
          return (
            <g key={b.key}>
              <line
                x1={b.cx}
                x2={b.cx}
                y1={b.wickTop}
                y2={b.wickBot}
                stroke={col}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <rect x={b.x} y={b.yTop} width={b.w} height={b.h} fill={col} />
            </g>
          );
        })}
      </svg>

      <div className="tnum pointer-events-none absolute inset-y-0 right-0 flex w-14 flex-col justify-between py-0.5 text-right text-2xs text-faint">
        <span>{max.toFixed(1)}</span>
        <span>{((max + min) / 2).toFixed(1)}</span>
        <span>{min.toFixed(1)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Day range bar — where the last price sits between low and high      */
/* ------------------------------------------------------------------ */

export function RangeBar({
  low,
  high,
  value,
}: {
  low: number;
  high: number;
  value: number;
}) {
  const pct = high === low ? 50 : ((value - low) / (high - low)) * 100;
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <div className="w-full">
      <div className="relative h-1.5 w-full rounded-full bg-raised">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-down via-warn to-up"
          style={{ width: "100%", opacity: 0.35 }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-ink shadow"
          style={{ left: `${clamped}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="tnum mt-1.5 flex justify-between text-2xs text-faint">
        <span>{low.toFixed(2)}</span>
        <span>{high.toFixed(2)}</span>
      </div>
    </div>
  );
}

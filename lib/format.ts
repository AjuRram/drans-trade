/**
 * Formatting helpers.
 *
 * Every function here is deterministic and locale-pinned to en-IN. Relying on
 * the browser's default locale causes server/client hydration mismatches in
 * Next.js, because the server formats with one locale and the client another.
 */

const inr = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** 1234567.5 -> "12,34,567.50" */
export function money(v: number): string {
  return inr.format(v);
}

/** With the rupee sign. */
export function rupees(v: number): string {
  return `₹${inr.format(v)}`;
}

/** Signed, for P&L. Explicit + reads better than relying on colour alone. */
export function signedMoney(v: number): string {
  const s = inr.format(Math.abs(v));
  return `${v < 0 ? "-" : "+"}₹${s}`;
}

export function signedPct(v: number): string {
  return `${v < 0 ? "" : "+"}${v.toFixed(2)}%`;
}

/** Compact Indian notation: 1.24 Cr, 45.6 L, 12.3 K. */
export function compact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)} K`;
  return inr0.format(v);
}

export function qty(v: number): string {
  return inr0.format(v);
}

/** Fixed HH:MM:SS so the header clock never shifts width. */
export function clock(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function hhmm(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Tailwind text colour for a signed value. Neutral at exactly zero. */
export function toneClass(v: number): string {
  if (v > 0) return "text-up";
  if (v < 0) return "text-down";
  return "text-muted";
}

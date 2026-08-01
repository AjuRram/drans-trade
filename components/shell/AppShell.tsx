"use client";

/**
 * Application shell.
 *
 * Responsive strategy — two distinct navigation models rather than one that
 * awkwardly stretches:
 *   - >= lg : persistent left sidebar, full labels, dense header
 *   - < lg  : fixed bottom tab bar (thumb-reachable) + compact top bar
 *
 * The bottom bar carries safe-area padding so it clears the iOS home indicator.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Eye,
  ScrollText,
  Layers,
  Briefcase,
  Wallet,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Radio,
  PauseCircle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { marketStatus } from "@/lib/market";
import { clock, rupees } from "@/lib/format";
import { LiveDot } from "@/components/market/LivePrice";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/orders", label: "Orders", icon: ScrollText },
  { href: "/positions", label: "Positions", icon: Layers },
  { href: "/holdings", label: "Holdings", icon: Briefcase },
  { href: "/funds", label: "Funds", icon: Wallet },
];

/* Bottom bar shows the five most-used destinations. */
const MOBILE_NAV = NAV.slice(0, 5);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authed, hydrated, clientCode, funds, streaming, setStreaming, dispatch } = useStore();

  const [drawer, setDrawer] = useState(false);
  const [light, setLight] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  // Clock starts only after mount — rendering a live time on the server would
  // guarantee a hydration mismatch.
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
  }, [light]);

  // Route guard. Waits for the session to be restored from storage, otherwise a
  // signed-in user is bounced to /login on every full page load.
  useEffect(() => {
    if (hydrated && !authed) router.replace("/login");
  }, [hydrated, authed, router]);

  useEffect(() => setDrawer(false), [pathname]);

  // Brief hold while the session is read. Rendering the shell first would flash
  // the UI; redirecting first would log the user out.
  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas">
        <div className="flex items-center gap-2.5 text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-hairline border-t-brand" />
          <span className="text-xs font-medium">Restoring session…</span>
        </div>
      </div>
    );
  }

  if (!authed) return null;

  const status = marketStatus();

  return (
    <div className="min-h-dvh bg-canvas">
      {/* ---------------- Desktop sidebar ---------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-hairline bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Logo />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
          ))}
        </nav>

        <div className="border-t border-hairline p-3">
          <div className="rounded-soft bg-raised px-3 py-2.5">
            <p className="eyebrow">Available margin</p>
            <p className="tnum mt-0.5 text-sm font-semibold text-ink">{rupees(funds)}</p>
          </div>
          <button
            onClick={() => dispatch({ type: "LOGOUT" })}
            className="mt-2 flex w-full items-center gap-2.5 rounded-soft px-3 py-2 text-sm text-muted transition-colors hover:bg-raised hover:text-down"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ---------------- Mobile drawer ---------------- */}
      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 animate-rise-in border-r border-hairline bg-surface p-4">
            <div className="mb-5 flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="rounded-soft p-1.5 text-muted hover:bg-raised"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
              ))}
            </nav>
            <button
              onClick={() => dispatch({ type: "LOGOUT" })}
              className="mt-4 flex w-full items-center gap-2.5 rounded-soft px-3 py-2 text-sm text-muted hover:bg-raised hover:text-down"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      ) : null}

      {/* ---------------- Main column ---------------- */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-6">
            <button
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              className="rounded-soft p-1.5 text-muted hover:bg-raised lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="lg:hidden">
              <Logo compact />
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {/* Market status */}
              <div className="hidden items-center gap-2 rounded-soft border border-hairline bg-surface px-2.5 py-1.5 sm:flex">
                <LiveDot active={status.open && streaming} />
                <span className="text-2xs font-semibold text-muted">{status.label}</span>
                {now !== null ? (
                  <span className="tnum text-2xs text-faint">{clock(now)}</span>
                ) : null}
              </div>

              {/* Stream pause — useful when reading a dense table */}
              <button
                onClick={() => setStreaming(!streaming)}
                title={streaming ? "Pause live prices" : "Resume live prices"}
                aria-label={streaming ? "Pause live prices" : "Resume live prices"}
                className="rounded-soft p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
              >
                {streaming ? <Radio size={17} /> : <PauseCircle size={17} />}
              </button>

              <button
                onClick={() => setLight((v) => !v)}
                aria-label="Toggle theme"
                className="rounded-soft p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
              >
                {light ? <Moon size={17} /> : <Sun size={17} />}
              </button>

              <div className="flex items-center gap-2 rounded-soft border border-hairline bg-surface py-1 pl-1 pr-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-brand/15 text-2xs font-bold text-brand">
                  {clientCode.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden text-xs font-semibold text-ink sm:block">
                  {clientCode}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* pb-24 on mobile keeps content clear of the fixed bottom bar */}
        <main className="px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:pb-10">{children}</main>
      </div>

      {/* ---------------- Mobile bottom nav ---------------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex flex-col items-center gap-1 py-2.5 text-2xs font-medium transition-colors",
                  active ? "text-brand" : "text-faint"
                )}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 1.9} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-2.5 rounded-soft px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-brand/12 text-brand"
          : "text-muted hover:bg-raised hover:text-ink"
      )}
    >
      <Icon size={17} strokeWidth={active ? 2.3 : 1.9} />
      {label}
    </Link>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-gradient-to-br from-brand to-[rgb(var(--up))] text-sm font-black text-white shadow-glow">
        D
      </span>
      {!compact ? (
        <span className="text-[0.95rem] font-bold tracking-tight text-ink">
          Drans<span className="text-brand">Trade</span>
        </span>
      ) : (
        <span className="text-sm font-bold tracking-tight text-ink">
          Drans<span className="text-brand">Trade</span>
        </span>
      )}
    </div>
  );
}

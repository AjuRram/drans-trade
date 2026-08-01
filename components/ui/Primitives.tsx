import React from "react";
import clsx from "clsx";

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("card", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-start justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-5",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "buy" | "sell" | "danger";
  size?: "sm" | "md" | "lg";
  block?: boolean;
};

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-brand text-white hover:brightness-110 active:brightness-95",
  ghost: "text-muted hover:bg-raised hover:text-ink",
  outline: "border border-hairline bg-transparent text-ink hover:bg-raised",
  buy: "bg-up text-[#05231A] hover:brightness-110 active:brightness-95",
  sell: "bg-down text-[#2A0A10] hover:brightness-110 active:brightness-95",
  danger: "border border-down/40 text-down hover:bg-down/10",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[0.95rem]",
};

export function Button({
  variant = "primary",
  size = "md",
  block,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex select-none items-center justify-center gap-2 rounded-soft font-semibold",
        "transition-[filter,background-color,color] duration-150",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Badge / Pill                                                        */
/* ------------------------------------------------------------------ */

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "up" | "down" | "brand" | "warn";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-raised text-muted",
    up: "bg-up/12 text-up",
    down: "bg-down/12 text-down",
    brand: "bg-brand/12 text-brand",
    warn: "bg-warn/12 text-warn",
  } as const;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Stat — the headline number pattern used across dashboards           */
/* ------------------------------------------------------------------ */

export function Stat({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}) {
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {icon ? <span className="text-faint">{icon}</span> : null}
      </div>
      <div
        className={clsx(
          "tnum mt-2 text-xl font-semibold tracking-tight sm:text-2xl",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          (!tone || tone === "neutral") && "text-ink"
        )}
      >
        {value}
      </div>
      {sub ? <div className="tnum mt-1 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-raised text-faint">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint ? <p className="mt-1 max-w-xs text-xs text-muted">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control — used for filters and BUY/SELL toggles           */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={clsx(
        "inline-flex items-center gap-1 rounded-soft border border-hairline bg-canvas p-1",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              "rounded-[7px] font-semibold transition-colors",
              size === "sm" ? "px-2.5 py-1 text-2xs" : "px-3 py-1.5 text-xs",
              active
                ? "bg-raised text-ink shadow-sm"
                : "text-muted hover:text-ink"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} />;
}

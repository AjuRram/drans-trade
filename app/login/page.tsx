"use client";

/**
 * Multi-step sign-in: client code -> OTP -> PIN.
 *
 * Modelled on how Indian brokerage logins actually work, where identity, a
 * one-time factor and a fast re-entry PIN are separate steps. Splitting them
 * keeps each screen to a single decision, which matters most on mobile.
 *
 * The OTP and PIN inputs auto-advance between boxes, accept a pasted code, and
 * support backspace-to-previous — small details, but their absence is the most
 * common complaint about OTP forms.
 */

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, ArrowLeft, ShieldCheck, Smartphone, KeyRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Primitives";
import { Logo } from "@/components/shell/AppShell";

type Step = "code" | "otp" | "pin";

const DEMO_OTP = "481902";
const DEMO_PIN = "2468";

export default function LoginPage() {
  const router = useRouter();
  const { authed, hydrated, dispatch } = useStore();

  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && authed) router.replace("/dashboard");
  }, [hydrated, authed, router]);

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 3) return setError("Enter a valid client code.");
    setError("");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep("otp");
    }, 450);
  };

  const submitOtp = () => {
    if (otp !== DEMO_OTP) return setError(`Incorrect OTP. Use ${DEMO_OTP} for this demo.`);
    setError("");
    setStep("pin");
  };

  const submitPin = () => {
    if (pin !== DEMO_PIN) return setError(`Incorrect PIN. Use ${DEMO_PIN} for this demo.`);
    setError("");
    setBusy(true);
    setTimeout(() => dispatch({ type: "LOGIN", clientCode: code.toUpperCase() }), 400);
  };

  useEffect(() => {
    if (otp.length === 6) submitOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  useEffect(() => {
    if (pin.length === 4) submitPin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* ------------ Brand panel (desktop only) ------------ */}
      <section className="relative hidden overflow-hidden border-r border-hairline bg-surface lg:block">
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 15%, rgb(var(--brand)/0.28), transparent 70%), radial-gradient(50% 40% at 85% 80%, rgb(var(--up)/0.18), transparent 70%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo />

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-ink">
              Every market,
              <br />
              <span className="text-brand">one terminal.</span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Live watchlists, single-tap order placement, real-time positions and
              instrument analysis — built for speed on desktop and mobile alike.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Streaming prices with sub-second updates",
                "Market and limit orders with live margin checks",
                "Position and P&L tracking that updates as you watch",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-muted">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-up" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-2xs text-faint">
            Demonstration application. Simulated market data — no real orders are placed.
          </p>
        </div>
      </section>

      {/* ------------ Form panel ------------ */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-rise-in">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <Stepper step={step} />

          {step === "code" ? (
            <form onSubmit={submitCode} className="mt-7">
              <h2 className="text-xl font-bold tracking-tight text-ink">Sign in</h2>
              <p className="mt-1.5 text-sm text-muted">
                Enter your client code to continue.
              </p>

              <label htmlFor="client-code" className="eyebrow mt-7 block">
                Client code
              </label>
              <input
                id="client-code"
                autoFocus
                autoComplete="username"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="DT1042"
                className="mt-1.5 h-12 w-full rounded-soft border border-hairline bg-surface px-3.5 text-sm font-semibold tracking-wide text-ink outline-none transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:text-faint focus:border-brand"
              />

              {error ? <Err msg={error} /> : null}

              <Button type="submit" block size="lg" className="mt-5" disabled={busy}>
                {busy ? "Checking…" : "Continue"}
                {!busy ? <ArrowRight size={16} /> : null}
              </Button>

              <p className="mt-4 text-center text-2xs text-faint">
                Demo — any client code works, e.g. <b className="text-muted">DT1042</b>
              </p>
            </form>
          ) : null}

          {step === "otp" ? (
            <div className="mt-7">
              <button
                onClick={() => {
                  setStep("code");
                  setOtp("");
                  setError("");
                }}
                className="mb-4 flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
              >
                <ArrowLeft size={14} /> Back
              </button>

              <div className="mb-1 flex items-center gap-2 text-brand">
                <Smartphone size={17} />
                <span className="text-2xs font-bold uppercase tracking-wider">
                  Step 2 of 3
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-ink">
                Verify your device
              </h2>
              <p className="mt-1.5 text-sm text-muted">
                We sent a 6-digit code to the number linked to{" "}
                <b className="text-ink">{code}</b>.
              </p>

              <CodeInput length={6} value={otp} onChange={setOtp} className="mt-7" />
              {error ? <Err msg={error} /> : null}

              <p className="mt-5 text-center text-2xs text-faint">
                Demo OTP — <b className="text-muted">{DEMO_OTP}</b>
              </p>
            </div>
          ) : null}

          {step === "pin" ? (
            <div className="mt-7">
              <button
                onClick={() => {
                  setStep("otp");
                  setPin("");
                  setError("");
                }}
                className="mb-4 flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
              >
                <ArrowLeft size={14} /> Back
              </button>

              <div className="mb-1 flex items-center gap-2 text-brand">
                <KeyRound size={17} />
                <span className="text-2xs font-bold uppercase tracking-wider">
                  Step 3 of 3
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-ink">
                Enter your PIN
              </h2>
              <p className="mt-1.5 text-sm text-muted">
                Your 4-digit trading PIN authorises this session.
              </p>

              <CodeInput
                length={4}
                value={pin}
                onChange={setPin}
                masked
                className="mt-7"
              />
              {error ? <Err msg={error} /> : null}

              {busy ? (
                <p className="mt-5 text-center text-xs text-muted">Signing you in…</p>
              ) : (
                <p className="mt-5 text-center text-2xs text-faint">
                  Demo PIN — <b className="text-muted">{DEMO_PIN}</b>
                </p>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Err({ msg }: { msg: string }) {
  return (
    <p role="alert" className="mt-2.5 text-xs font-medium text-down">
      {msg}
    </p>
  );
}

function Stepper({ step }: { step: Step }) {
  const order: Step[] = ["code", "otp", "pin"];
  const idx = order.indexOf(step);
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {order.map((s, i) => (
        <span
          key={s}
          className={clsx(
            "h-1 flex-1 rounded-full transition-colors duration-300",
            i <= idx ? "bg-brand" : "bg-raised"
          )}
        />
      ))}
    </div>
  );
}

/**
 * Segmented numeric input. One <input> per digit, with paste, auto-advance and
 * backspace-to-previous handled explicitly.
 */
function CodeInput({
  length,
  value,
  onChange,
  masked = false,
  className,
}: {
  length: number;
  value: string;
  onChange: (v: string) => void;
  masked?: boolean;
  className?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setDigit = (i: number, d: string) => {
    const next = value.split("");
    next[i] = d;
    const joined = next.join("").slice(0, length);
    onChange(joined);
    if (d && i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div className={clsx("flex gap-2", className)}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          // `tel` gives the numeric keypad on mobile without spinner arrows.
          type={masked ? "password" : "tel"}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          value={value[i] ?? ""}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            setDigit(i, d);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (text) {
              onChange(text);
              refs.current[Math.min(text.length, length - 1)]?.focus();
            }
          }}
          className="tnum h-13 w-full min-w-0 rounded-soft border border-hairline bg-surface py-3 text-center text-lg font-bold text-ink outline-none transition-colors focus:border-brand"
          style={{ height: "3.25rem" }}
        />
      ))}
    </div>
  );
}

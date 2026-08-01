import type { Config } from "tailwindcss";

/**
 * Drans Trade design tokens.
 *
 * Built dark-first because that is what traders actually use — long sessions
 * staring at dense numeric data. Light mode is supported via the `light` class
 * on <html>, driven by CSS variables in globals.css.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces, layered from furthest back to closest to the user.
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        raised: "rgb(var(--raised) / <alpha-value>)",
        hairline: "rgb(var(--hairline) / <alpha-value>)",

        // Text
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",

        // Brand + semantics. `up`/`down` carry meaning, never decoration.
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
        },
        up: "rgb(var(--up) / <alpha-value>)",
        down: "rgb(var(--down) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
      },
      borderRadius: {
        card: "14px",
        soft: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.28), 0 8px 24px -12px rgb(0 0 0 / 0.45)",
        pop: "0 12px 40px -8px rgb(0 0 0 / 0.55)",
        glow: "0 0 0 1px rgb(var(--brand) / 0.35), 0 8px 32px -8px rgb(var(--brand) / 0.35)",
      },
      keyframes: {
        flashUp: {
          "0%": { backgroundColor: "rgb(var(--up) / 0.22)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashDown: {
          "0%": { backgroundColor: "rgb(var(--down) / 0.22)" },
          "100%": { backgroundColor: "transparent" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        pulseDot: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "flash-up": "flashUp 700ms ease-out",
        "flash-down": "flashDown 700ms ease-out",
        "rise-in": "riseIn 300ms cubic-bezier(0.2,0.8,0.2,1) both",
        shimmer: "shimmer 1.6s infinite",
        "pulse-dot": "pulseDot 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

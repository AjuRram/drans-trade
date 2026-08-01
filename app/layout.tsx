import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

/**
 * Inter with `display: swap` so text paints immediately rather than blocking on
 * the font. next/font self-hosts it, so there is no external request at runtime.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Drans Trade — Modern Trading Terminal",
    template: "%s · Drans Trade",
  },
  description:
    "Drans Trade is a modern trading web application: live watchlists, order placement, positions, holdings and instrument analysis in one responsive terminal.",
  applicationName: "Drans Trade",
  authors: [{ name: "Arjun Ramachandran" }],
  keywords: ["trading", "stock market", "portfolio", "watchlist", "terminal"],
};

export const viewport: Viewport = {
  themeColor: "#080B14",
  width: "device-width",
  initialScale: 1,
  // Zoom left enabled deliberately — disabling it is an accessibility failure.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}

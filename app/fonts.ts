import { Geist, Instrument_Serif } from "next/font/google";

// Two families, per the design system: an editorial display serif used at
// extreme scale, and a neutral variable sans for everything else. next/font
// self-hosts, subsets and adds metric-matched fallbacks (no CLS on swap).
export const displayFont = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});

export const textFont = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

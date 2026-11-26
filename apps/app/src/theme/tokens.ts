/**
 * Homer Family Cookbook design tokens: Round 6, "Tomato & Butter" with Apple-native glass.
 *
 * global.css holds the same colors as CSS variables for NativeWind classes
 * (bg-primary, text-muted-foreground, ...). Use this file where a raw value is
 * needed instead: icon colors, GlassView tint, shadows, charts. Keep both in sync.
 */

export type ColorScheme = "light" | "dark";

const light = {
  background: "#fbf6ee", // paper
  grouped: "#f4efe7", // forms and grouped lists
  foreground: "#1d1a17", // ink
  card: "#ffffff",
  cardForeground: "#1d1a17",
  muted: "#ece4d8", // photo placeholder, quiet fills
  mutedForeground: "#6e6760",
  placeholder: "#b3aaa0",
  primary: "#d23b22", // tomato
  primaryForeground: "#ffffff",
  accent: "#f4c242", // butter: timers and highlights
  accentForeground: "#1d1a17",
  accentSoft: "#fdf3d9",
  success: "#34c759",
  successForeground: "#1f7a3d",
  destructive: "#e0301e",
  separator: "rgba(29,26,23,0.08)",
  hairline: "rgba(29,26,23,0.12)",
  chevron: "#b9b1a8",
  glassFill: "rgba(255,255,255,0.42)",
  glassFillStrong: "rgba(255,255,255,0.88)",
  glassEdge: "rgba(255,255,255,0.7)",
  scrim: "rgba(29,26,23,0.18)",
} as const;

const dark: Record<keyof typeof light, string> = {
  background: "#16110e",
  grouped: "#1d1714",
  foreground: "#f5ece0",
  card: "#241d19",
  cardForeground: "#f5ece0",
  muted: "#342c26",
  mutedForeground: "#b8aa98",
  placeholder: "#807568",
  primary: "#ff6a4d",
  primaryForeground: "#1d1a17",
  accent: "#ffd25e",
  accentForeground: "#1d1a17",
  accentSoft: "#3d3118",
  success: "#4ade80",
  successForeground: "#5fd18a",
  destructive: "#ff6354",
  separator: "rgba(245,236,224,0.10)",
  hairline: "rgba(245,236,224,0.16)",
  chevron: "#6f6459",
  glassFill: "rgba(58,46,40,0.45)",
  glassFillStrong: "rgba(48,38,33,0.88)",
  glassEdge: "rgba(255,255,255,0.14)",
  scrim: "rgba(0,0,0,0.4)",
};

export const colors = { light, dark };
export type ColorToken = keyof typeof light;

/** 4pt grid. Screens use 16 side padding, 18 on the library and recipe pages. */
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

export const radius = {
  thumb: 14,
  field: 16,
  card: 22,
  panel: 30, // popovers, the cook-mode control panel
  sheet: 38,
  pill: 999,
} as const;

/** Font files, by role. Each weight is its own family on native. */
export const fonts = {
  sans: "InstrumentSans_400Regular",
  sansMedium: "InstrumentSans_500Medium",
  sansSemibold: "InstrumentSans_600SemiBold",
  sansBold: "InstrumentSans_700Bold",
  serif: "Newsreader_500Medium",
  serifRegular: "Newsreader_400Regular",
  serifSemibold: "Newsreader_600SemiBold",
} as const;

/**
 * Text styles, sized like Apple's so they track Dynamic Type. Large titles,
 * titles and the cook-mode step use Newsreader; everything else Instrument Sans.
 */
export const type = {
  largeTitle: { size: 34, line: 41, weight: "500", serif: true },
  title1: { size: 28, line: 34, weight: "500", serif: true },
  title2: { size: 22, line: 28, weight: "500", serif: true },
  title3: { size: 20, line: 25, weight: "600" },
  headline: { size: 17, line: 22, weight: "600" },
  body: { size: 17, line: 22, weight: "400" },
  callout: { size: 16, line: 21, weight: "400" },
  subhead: { size: 15, line: 20, weight: "400" },
  footnote: { size: 13, line: 18, weight: "400" },
  caption: { size: 12, line: 16, weight: "600" },
  step: { size: 30, line: 36, weight: "500", serif: true }, // cook mode, readable at arm's length
  timer: { size: 34, line: 40, weight: "700" },
} as const;

/** Touch targets: 44pt minimum (HIG). */
export const size = { hit: 44, control: 56, fab: 62, avatar: 36 } as const;

/**
 * Glass. On iOS 26 the system draws Liquid Glass; these values are the
 * fallback (blur + fill + bright top edge) used on older iOS, Android and web.
 */
export const glass = {
  blur: 30,
  saturate: 1.9,
  shadow: {
    light: "0 10px 30px rgba(60,30,10,0.14)",
    dark: "0 10px 30px rgba(0,0,0,0.4)",
  },
} as const;

export const shadow = {
  primary: "0 8px 20px rgba(210,59,34,0.3)",
  card: "0 1px 2px rgba(29,26,23,0.06)",
  sheet: "0 -10px 40px rgba(29,26,23,0.18)",
} as const;

export const motion = {
  /** Spring for presses and sheet snaps (Reanimated withSpring config). */
  spring: { damping: 18, stiffness: 220, mass: 1 },
  fast: 150,
  base: 250,
} as const;

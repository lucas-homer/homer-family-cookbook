const { platformSelect } = require("nativewind/theme");

// Native gets the loaded font's name; web adds the Google Fonts family as a fallback.
const fam = (native, web) => platformSelect({ ios: native, android: native, default: `${native}, ${web}` });

const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./App.tsx", "./src/**/*.{ts,tsx}", "./.storybook/**/*.{ts,tsx}"],
  // <Text> builds these from the weight class at runtime.
  safelist: ["font-sans", "font-sans-medium", "font-sans-semibold", "font-sans-bold", "font-serif", "font-serif-regular", "font-serif-semibold"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: c("background"),
        grouped: c("grouped"),
        foreground: c("foreground"),
        card: { DEFAULT: c("card"), foreground: c("card-foreground") },
        muted: { DEFAULT: c("muted"), foreground: c("muted-foreground") },
        placeholder: c("placeholder"),
        primary: { DEFAULT: c("primary"), foreground: c("primary-foreground") },
        accent: { DEFAULT: c("accent"), foreground: c("accent-foreground"), soft: c("accent-soft") },
        success: { DEFAULT: c("success"), foreground: c("success-foreground") },
        destructive: c("destructive"),
        border: c("border"),
        glass: c("glass"),
        ring: c("ring"),
      },
      // Instrument Sans for the interface, Newsreader for recipe names, titles
      // and the cook-mode step. On native each weight is its own font file, so
      // <Text> swaps font-sans-semibold etc. in from the weight class.
      fontFamily: {
        sans: fam("InstrumentSans_400Regular", "'Instrument Sans', system-ui, sans-serif"),
        "sans-medium": fam("InstrumentSans_500Medium", "'Instrument Sans', system-ui, sans-serif"),
        "sans-semibold": fam("InstrumentSans_600SemiBold", "'Instrument Sans', system-ui, sans-serif"),
        "sans-bold": fam("InstrumentSans_700Bold", "'Instrument Sans', system-ui, sans-serif"),
        serif: fam("Newsreader_500Medium", "Newsreader, Georgia, serif"),
        "serif-regular": fam("Newsreader_400Regular", "Newsreader, Georgia, serif"),
        "serif-semibold": fam("Newsreader_600SemiBold", "Newsreader, Georgia, serif"),
      },
      // Apple text styles (size / line height). Names follow the HIG.
      fontSize: {
        "large-title": ["34px", { lineHeight: "41px" }],
        "title-1": ["28px", { lineHeight: "34px" }],
        "title-2": ["22px", { lineHeight: "28px" }],
        "title-3": ["20px", { lineHeight: "25px" }],
        headline: ["17px", { lineHeight: "22px" }],
        body: ["17px", { lineHeight: "22px" }],
        callout: ["16px", { lineHeight: "21px" }],
        subhead: ["15px", { lineHeight: "20px" }],
        footnote: ["13px", { lineHeight: "18px" }],
        caption: ["12px", { lineHeight: "16px" }],
        step: ["30px", { lineHeight: "36px" }],
        timer: ["34px", { lineHeight: "40px" }],
      },
      borderRadius: {
        thumb: "14px",
        field: "16px",
        card: "22px",
        panel: "30px",
        sheet: "38px",
      },
    },
  },
  plugins: [],
};

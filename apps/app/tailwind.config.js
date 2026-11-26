const { platformSelect } = require("nativewind/theme");

const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./App.tsx", "./src/**/*.{ts,tsx}", "./.storybook/**/*.{ts,tsx}"],
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
      fontFamily: {
        // SF Pro on Apple platforms, the system UI font elsewhere.
        sans: platformSelect({ ios: "System", android: "sans-serif", default: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }),
        // New York on Apple platforms.
        serif: platformSelect({ ios: "ui-serif", android: "serif", default: "ui-serif, 'New York', Georgia, serif" }),
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

import type { Config } from "tailwindcss";

// Material-3 dark palette ported from the Stitch designs. Flat hex tokens so
// both `bg-primary` and opacity modifiers (`bg-primary/20`) work.
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
        // Core Material tokens
        primary: "#4edea3",
        "on-primary": "#003824",
        "primary-container": "#10b981",
        "on-primary-container": "#00422b",
        secondary: "#4cd7f6",
        "on-secondary": "#003640",
        "secondary-container": "#03b5d3",
        "on-secondary-container": "#00424e",
        tertiary: "#ffb3ad",
        error: "#ffb4ab",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",
        background: "#09090B",
        "on-background": "#e5e1e4",
        surface: "#131315",
        "on-surface": "#e5e1e4",
        "on-surface-variant": "#bbcabf",
        "surface-variant": "#353437",
        "surface-container-lowest": "#0e0e10",
        "surface-container-low": "#1c1b1d",
        "surface-container": "#201f22",
        "surface-container-high": "#2a2a2c",
        "surface-container-highest": "#353437",
        outline: "#86948a",
        "outline-variant": "#3c4a42",
        // Legacy tokens (kept so any unported markup still resolves)
        haven: {
          bg: "#09090B",
          surface: "#131315",
          surfaceHi: "#201f22",
          border: "#3c4a42",
          text: "#e5e1e4",
          muted: "#bbcabf",
          accent: "#4edea3",
          calm: "#4cd7f6",
          warn: "#ffd166",
          danger: "#ff6b6b",
          dangerBg: "#3a0d0d",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "label-lg": ["16px", { lineHeight: "20px", letterSpacing: "0.05em", fontWeight: "600" }],
        "emergency-action": ["24px", { lineHeight: "32px", fontWeight: "800" }],
        "headline-md": ["28px", { lineHeight: "34px", fontWeight: "600" }],
        "body-md": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "headline-lg-mobile": ["32px", { lineHeight: "38px", fontWeight: "700" }],
        "body-lg": ["20px", { lineHeight: "30px", fontWeight: "400" }],
        "headline-lg": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" }],
      },
      spacing: {
        "touch-target-min": "48px",
        touch: "48px",
        "margin-mobile": "20px",
        "margin-desktop": "64px",
        gutter: "24px",
        "stack-sm": "12px",
        "stack-md": "24px",
        "stack-lg": "48px",
      },
      minHeight: { touch: "48px" },
      minWidth: { touch: "48px" },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      keyframes: {
        wave: { from: { height: "8px" }, to: { height: "32px" } },
        "pulse-red": {
          "0%": { boxShadow: "0 0 0 0 rgba(255,180,171,0.6)" },
          "70%": { boxShadow: "0 0 0 18px rgba(255,180,171,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(255,180,171,0)" },
        },
      },
      animation: {
        wave: "wave 1.2s ease-in-out infinite alternate",
        "pulse-red": "pulse-red 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;

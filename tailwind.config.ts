import type { Config } from "tailwindcss";

// High-contrast dark theme tuned toward WCAG AAA (>=7:1 body text on bg).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        haven: {
          bg: "#0a0e14",
          surface: "#141b26",
          surfaceHi: "#1e2a3a",
          border: "#33465e",
          text: "#f5f8fc",
          muted: "#c3d0e0",
          accent: "#7fd1ff",
          calm: "#8ef0c8",
          warn: "#ffd166",
          danger: "#ff6b6b",
          dangerBg: "#3a0d0d",
        },
      },
      minHeight: {
        touch: "48px",
      },
      minWidth: {
        touch: "48px",
      },
    },
  },
  plugins: [],
};

export default config;

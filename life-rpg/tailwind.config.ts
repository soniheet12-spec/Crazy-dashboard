import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep charcoal / navy RPG palette
        bg: {
          DEFAULT: "#0a0e1a",
          soft: "#0f1626",
          card: "#121a2e",
          hover: "#16203a",
        },
        line: "#1e2a45",
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)", // dynamic, themeable
          dim: "#0ea5e9",
          glow: "#7dd3fc",
        },
        amber: {
          DEFAULT: "#fbbf24",
          dim: "#f59e0b",
        },
        // Stat colors
        body: "#f87171",
        mind: "#a78bfa",
        wealth: "#34d399",
        social: "#fb923c",
        discipline: "#38bdf8",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        pixel: ["var(--font-pixel)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(56,189,248,0.25), 0 0 24px -6px rgba(56,189,248,0.35)",
        "glow-amber": "0 0 0 1px rgba(251,191,36,0.25), 0 0 24px -6px rgba(251,191,36,0.4)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

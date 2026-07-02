import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--av-color-ink) / <alpha-value>)",
        muted: "rgb(var(--av-color-muted) / <alpha-value>)",
        mist: "rgb(var(--av-color-mist) / <alpha-value>)",
        line: "rgb(var(--av-color-line) / <alpha-value>)",
        leaf: "rgb(var(--av-color-leaf) / <alpha-value>)",
        moss: "rgb(var(--av-color-moss) / <alpha-value>)",
        sky: "rgb(var(--av-color-sky) / <alpha-value>)",
        coral: "rgb(var(--av-color-coral) / <alpha-value>)",
        amber: "rgb(var(--av-color-amber) / <alpha-value>)",
        ember: "rgb(var(--av-color-ember) / <alpha-value>)",
        coal: "rgb(var(--av-color-coal) / <alpha-value>)",
        paper: "rgb(var(--av-color-paper) / <alpha-value>)",
        wash: "rgb(var(--av-color-wash) / <alpha-value>)"
      },
      boxShadow: {
        soft: "var(--av-shadow-soft)",
        lift: "var(--av-shadow-lift)",
        glow: "var(--av-shadow-glow)"
      }
    }
  },
  plugins: []
} satisfies Config;

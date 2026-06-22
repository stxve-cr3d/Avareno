import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1b1c1c",
        muted: "#66706d",
        mist: "#eef2f0",
        line: "#d9dfdc",
        leaf: "#2F8F83",
        moss: "#1b6259",
        sky: "#2f8bd8",
        coral: "#f06b54",
        amber: "#d97706",
        ember: "#dc2626",
        coal: "#1b1c1c",
        paper: "#f8faf9",
        wash: "#eef2f0"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 35, 29, 0.08)",
        lift: "0 20px 70px rgba(47, 143, 131, 0.18)",
        glow: "0 14px 38px rgba(47, 143, 131, 0.22)"
      }
    }
  },
  plugins: []
} satisfies Config;

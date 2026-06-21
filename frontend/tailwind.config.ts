import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111513",
        mist: "#f4faf7",
        line: "#dce8e2",
        leaf: "#14a86b",
        moss: "#10724b",
        sky: "#2f8bd8",
        coral: "#f06b54",
        amber: "#d97706",
        ember: "#dc2626",
        coal: "#17231d",
        paper: "#fbfdfb"
      },
      boxShadow: {
        soft: "0 16px 44px rgba(29, 49, 39, 0.08)",
        lift: "0 20px 60px rgba(20, 168, 107, 0.16)"
      }
    }
  },
  plugins: []
} satisfies Config;

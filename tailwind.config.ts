import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Hustly UI: white + light bright emerald ONLY. No sky blue, no navy, no deep green.
        brand: {
          DEFAULT: "#10B981",
          light: "#34D399",
          soft: "#ECFDF5",
          soft2: "#D1FAE5",
          hover: "#0DA678",
          text: "#0F766E",
        },
        ink: { DEFAULT: "#0F172A", soft: "#334155", muted: "#64748B" },
        line: "#E2E8F0",
        paper: "#FFFFFF",
        wash: "#F8FAFC",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.06)",
        lift: "0 6px 20px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;

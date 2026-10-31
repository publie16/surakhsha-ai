import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#3E2F2F",
        surface: "#2E2323",
        "surface-dark": "#231B1B",
        terracotta: {
          DEFAULT: "#B8663F",
          hover: "#A35732",
          light: "#C77B56",
        },
        copper: {
          DEFAULT: "#D9A07C",
          muted: "#B88667",
        },
        cream: {
          DEFAULT: "#F3E3DA",
          muted: "#D8C6BD",
        },
        safe: {
          DEFAULT: "#4ADE80",
          glow: "rgba(74, 222, 128, 0.25)",
        },
        sos: {
          DEFAULT: "#EF4444",
          hover: "#DC2626",
          glow: "rgba(239, 68, 68, 0.35)",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;

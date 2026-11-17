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
        navy: {
          DEFAULT: "#20251f",
          light: "#3d4038",
          dark: "#183b2d",
          soft: "#e6eadf",
        },
        primary: {
          DEFAULT: "#244b3a",
          dark: "#183b2d",
          light: "#e6eadf",
        },
        accent: {
          DEFAULT: "#ba472f",
          hover: "#943520",
          soft: "#e6eadf",
        },
        offwhite: {
          DEFAULT: "#f3e9d5",
          DEFAULT2: "#e9ddc6",
        },
        sapen: {
          50: "#fdf9f0",
          100: "#f3e9d5",
          200: "#e9ddc6",
          300: "#d2c5ad",
          400: "#b8aa8e",
          500: "#8b806b",
          600: "#625f54",
          700: "#3d4038",
          800: "#20251f",
          900: "#183b2d",
          950: "#142f25",
        },
        leaf: {
          DEFAULT: "#244b3a",
          dark: "#183b2d",
          soft: "#e6eadf",
        },
        paper: {
          DEFAULT: "#f3e9d5",
          deep: "#e9ddc6",
          light: "#fdf9f0",
          green: "#e6eadf",
        },
        earth: {
          DEFAULT: "#ba472f",
          dark: "#943520",
          soft: "#e5bf4f",
        },
        sunshine: {
          DEFAULT: "#e5bf4f",
          soft: "#f3e9d5",
        },
        ink: {
          DEFAULT: "#20251f",
        },
        body: {
          DEFAULT: "#3d4038",
        },
        muted: {
          DEFAULT: "#625f54",
        },
        rule: {
          DEFAULT: "#d2c5ad",
          strong: "#b8aa8e",
        },
        gray: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "-apple-system", "sans-serif"],
        display: ['"Fraunces"', '"Georgia"', "serif"],
      },
      boxShadow: {
        card: "0 12px 35px rgba(52, 43, 29, 0.08)",
        hover: "0 18px 42px rgba(52, 43, 29, .13)",
        soft: "0 12px 35px rgba(52, 43, 29, 0.08)",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;

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
          DEFAULT: "#20251F",
          light: "#355D49",
          dark: "#183B2D",
          soft: "#E6EADF",
        },
        primary: {
          DEFAULT: "#244B3A",
          dark: "#183B2D",
          light: "#E6EADF",
        },
        accent: {
          DEFAULT: "#BA472F",
          hover: "#943520",
          soft: "#F5DED3",
        },
        offwhite: {
          DEFAULT: "#F3E9D5",
          DEFAULT2: "#E9DDC6",
        },
        sapen: {
          50: "#E6EADF",
          100: "#CFD9CC",
          200: "#B3C6B5",
          300: "#8BA996",
          400: "#638675",
          500: "#426A55",
          600: "#244B3A",
          700: "#183B2D",
          800: "#123024",
          900: "#0D241B",
          950: "#081811",
        },
        leaf: {
          DEFAULT: "#244B3A",
          dark: "#183B2D",
          soft: "#E6EADF",
        },
        paper: {
          DEFAULT: "#F3E9D5",
          deep: "#E9DDC6",
          light: "#FDF9F0",
          green: "#E8EDE2",
        },
        earth: {
          DEFAULT: "#BA472F",
          dark: "#943520",
          soft: "#F5DED3",
        },
        sunshine: {
          DEFAULT: "#E5BF4F",
          soft: "#F6EBC5",
        },
        ink: {
          DEFAULT: "#20251F",
        },
        body: {
          DEFAULT: "#3D4038",
        },
        muted: {
          DEFAULT: "#625F54",
        },
        rule: {
          DEFAULT: "#D2C5AD",
          strong: "#B8AA8E",
        },
        gray: {
          50: "#F8F3E9",
          100: "#EFE7D9",
          200: "#DDD1BD",
          300: "#C5B69E",
          400: "#8B816F",
          500: "#6D6557",
          600: "#514B40",
          700: "#39372F",
          800: "#292D26",
          900: "#1D2A21",
          950: "#111A14",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "-apple-system", "sans-serif"],
        display: ['"Fraunces"', '"Georgia"', "serif"],
      },
      boxShadow: {
        card: "0 8px 24px rgba(47, 42, 31, 0.08)",
        hover: "0 14px 30px rgba(47, 42, 31, 0.13)",
        soft: "0 5px 16px rgba(47, 42, 31, 0.08)",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;

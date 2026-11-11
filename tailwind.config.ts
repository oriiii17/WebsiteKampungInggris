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
          DEFAULT: "#0B2545",
          light: "#1B3A5C",
          dark: "#071B30",
          soft: "#E8EEF5",
        },
        primary: {
          DEFAULT: "#0B2545",
          dark: "#071B30",
          light: "#E8EEF5",
        },
        accent: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          soft: "#FEF3C7",
        },
        offwhite: {
          DEFAULT: "#FDFBF7",
          DEFAULT2: "#FAF9F6",
        },
        sapen: {
          50: "#E8EEF5",
          100: "#D3E0EC",
          200: "#A8C2DC",
          300: "#6C9BBD",
          400: "#3D6B96",
          500: "#14532D",
          600: "#0F3F22",
          700: "#0B3220",
          800: "#0A271C",
          900: "#071E15",
          950: "#04110B",
        },
      },
      fontFamily: {
        sans: ['"Nunito"', "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px rgba(11, 37, 69, 0.06)",
        hover: "0 12px 32px rgba(11, 37, 69, 0.12)",
        soft: "0 4px 16px rgba(11, 37, 69, 0.08)",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;

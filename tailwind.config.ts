import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    "./content/**/*.{md,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef9f3",
          100: "#d6f1e1",
          500: "#0e9f6e",
          600: "#057a55",
          700: "#046c4e",
          900: "#014737",
        },
        ink: {
          900: "#0b1220",
          700: "#1f2937",
          500: "#4b5563",
          300: "#9ca3af",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [typography],
};

export default config;

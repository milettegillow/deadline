import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // One calm accent colour used throughout the app.
        accent: {
          50: "#eef4ff",
          100: "#dbe6ff",
          200: "#bdd0ff",
          300: "#94b2ff",
          400: "#6489fb",
          500: "#4263f0",
          600: "#2f47d6",
          700: "#2738ac",
          800: "#243389",
          900: "#23316d",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;

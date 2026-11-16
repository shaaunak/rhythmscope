/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FBFBF9",
        surface: "#FFFFFF",
        "surface-subtle": "#F5F4EF",
        "surface-muted": "#EBEAE4",
        border: "#E4E2D9",
        "border-strong": "#CBD5E1",
        navy: {
          950: "#070C18",
          900: "#0B132B",
          800: "#1C2541",
          700: "#2B3A67",
          600: "#3A506B",
        },
        teal: {
          DEFAULT: "#0D9488",
          light: "#14B8A6",
          dark: "#0F766E",
          bg: "#F0FDFA",
        },
        coral: {
          DEFAULT: "#F43F5E",
          light: "#FB7185",
          dark: "#E11D48",
          bg: "#FFF1F2",
        },
        amber: {
          DEFAULT: "#D97706",
          light: "#F59E0B",
          bg: "#FFFBEB",
        }
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "'SF Mono'",
          "SFMono-Regular",
          "ui-monospace",
          "'DejaVu Sans Mono'",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

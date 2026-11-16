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
        canvas: "#D7E1E8",
        surface: "#F0F0F7",
        card: "#FFFFFF",
        "card-subtle": "#F6F6FB",
        "surface-lavender": "#E8E8F2",
        border: "#E2E4EB",
        "border-translucent": "rgba(255, 255, 255, 0.7)",
        primary: "#17191F",
        secondary: "#858A98",
        muted: "#A0A5B5",
        teal: {
          DEFAULT: "#16A6A1",
          light: "#22C5BE",
          dark: "#0F7A76",
          bg: "#EBF7F7",
        },
        coral: {
          DEFAULT: "#F46C83",
          light: "#FB8AA0",
          dark: "#D64D66",
          bg: "#FDEFF2",
        },
        actionYellow: {
          DEFAULT: "#FFF08C",
          hover: "#FFE966",
          active: "#FFE042",
        },
        accentPurple: {
          DEFAULT: "#8B5CF6",
          bg: "#F3F0FF",
        }
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '22px',
        '3xl': '28px',
        '4xl': '36px',
        '5xl': '44px',
      },
      fontFamily: {
        sans: [
          "'Plus Jakarta Sans'",
          "'Manrope'",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "'SF Mono'",
          "SFMono-Regular",
          "ui-monospace",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(23, 25, 31, 0.04), 0 2px 6px -1px rgba(23, 25, 31, 0.02)',
        'float': '0 20px 40px -15px rgba(11, 19, 43, 0.08), 0 0 1px 1px rgba(255, 255, 255, 0.9)',
        'app-frame': '0 30px 80px -20px rgba(70, 95, 120, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.8) inset, 0 0 0 1px rgba(255, 255, 255, 0.6)',
        'pill': '0 2px 8px rgba(23, 25, 31, 0.04), 0 1px 2px rgba(23, 25, 31, 0.02)',
      }
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "#E2E8F0",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#2563EB",
          soft: "#EFF6FF",
          dark: "#1D4ED8",
        },
        success: {
          DEFAULT: "#059669",
          light: "#ECFDF5",
          border: "#A7F3D0",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#FFFBEB",
          border: "#FDE68A",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FEF2F2",
          border: "#FECACA",
        },
        ink: {
          DEFAULT: "#0F172A",
          secondary: "#64748B",
          tertiary: "#94A3B8",
        }
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        card: "12px",
        button: "8px",
        dialog: "16px",
        xl: "16px",
        "2xl": "24px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(15,23,42,0.04)",
        DEFAULT: "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
        card: "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
        soft: "0 4px 16px rgba(15,23,42,0.08)",
        md: "0 4px 12px rgba(15,23,42,0.08)",
        lg: "0 8px 24px rgba(15,23,42,0.10)",
        focus: "0 0 0 3px rgba(37,99,235,0.20)",
      },
      fontFamily: {
        sans: [
          "'DIN Next Rounded'",
          "'Nunito Sans'",
          "'SF Pro Rounded'",
          "ui-rounded",
          "system-ui",
          "sans-serif"
        ]
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;

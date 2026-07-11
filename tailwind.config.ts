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
        "border-strong": "#CBD5E1",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        "surface-raised": "#FAFBFD",
        sidebar: "#F1F5F9",
        primary: {
          DEFAULT: "#2563EB",
          soft: "#EFF6FF",
          muted: "#DBEAFE",
          dark: "#1D4ED8",
          deeper: "#1E40AF",
        },
        success: {
          DEFAULT: "#059669",
          light: "#ECFDF5",
          muted: "#D1FAE5",
          border: "#A7F3D0",
          dark: "#047857",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#FFFBEB",
          muted: "#FEF3C7",
          border: "#FDE68A",
          dark: "#B45309",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FEF2F2",
          muted: "#FEE2E2",
          border: "#FECACA",
          dark: "#DC2626",
        },
        ink: {
          DEFAULT: "#0F172A",
          secondary: "#475569",
          tertiary: "#94A3B8",
          faint: "#CBD5E1",
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
        "3xl": "32px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(15,23,42,0.05)",
        DEFAULT: "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
        card: "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
        soft: "0 4px 16px rgba(15,23,42,0.08)",
        md: "0 4px 12px rgba(15,23,42,0.08)",
        lg: "0 8px 24px rgba(15,23,42,0.10)",
        xl: "0 12px 40px rgba(15,23,42,0.14)",
        "primary-soft": "0 4px 16px rgba(37,99,235,0.16)",
        "primary-md": "0 4px 20px rgba(37,99,235,0.24)",
        focus: "0 0 0 3px rgba(37,99,235,0.20)",
        "success-sm": "0 2px 8px rgba(5,150,105,0.16)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
        "gradient-primary-vivid": "linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)",
        "gradient-surface": "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
        "gradient-hero": "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 40%, #2563EB 70%, #3B82F6 100%)",
        "gradient-card-primary": "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
        "gradient-card-success": "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
        "gradient-card-warning": "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
        "gradient-card-danger": "linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)",
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
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.3)" }
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out forwards",
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;

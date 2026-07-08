import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        line: "#d9e2ea",
        panel: "#f7fafc",
        brand: {
          50: "#f2fbf8",
          100: "#d9f2e8",
          500: "#1f8f63",
          700: "#146246",
          900: "#0b1714"
        },
        dept: {
          supervisor: "#1f8f63",
          calidad: "#d31f32",
          seguridad: "#6b7280",
          mantenimiento: "#1976d2",
          mejora: "#111827"
        },
        warn: "#f4b942",
        danger: "#d1495b",
        info: "#2d7dd2",
        grape: "#7768ae"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(23, 32, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

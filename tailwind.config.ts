import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171a18",
        line: "#dce2de",
        panel: "#f7f9f8",
        brand: {
          50: "#fff3f4",
          100: "#ffe0e3",
          500: "#e21d2b",
          700: "#b5121d",
          900: "#620b12"
        },
        dept: {
          supervisor: "#14835f",
          calidad: "#d32236",
          seguridad: "#626a70",
          mantenimiento: "#176fc1",
          mejora: "#171a18"
        },
        warn: "#b7791f",
        danger: "#d32236",
        info: "#176fc1",
        grape: "#7768ae"
      },
      boxShadow: {
        soft: "0 10px 28px rgba(23, 26, 24, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

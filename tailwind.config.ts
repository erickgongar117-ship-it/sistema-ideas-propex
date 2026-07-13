import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        line: "#dedede",
        panel: "#f7f7f7",
        brand: {
          50: "#fff1f4",
          100: "#ffe0e7",
          500: "#ea0029",
          700: "#b50020",
          900: "#620011"
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

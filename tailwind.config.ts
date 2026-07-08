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
          50: "#edf7f4",
          100: "#d3ebe3",
          500: "#25826b",
          700: "#17614f"
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

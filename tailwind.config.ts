import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121417",
        paper: "#f7f5ef",
        mint: "#37d49a",
        coral: "#ff7a59",
        steel: "#4b6b88"
      },
      boxShadow: {
        soft: "0 20px 70px rgba(18, 20, 23, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;

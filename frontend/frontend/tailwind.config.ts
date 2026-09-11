import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111315",
        paper: "#f7f3eb",
        line: "#ddd8cf",
        accent: "#e45f45",
        teal: "#1e8a7a",
        grape: "#6d5dfc"
      },
      boxShadow: {
        soft: "0 18px 60px rgb(17 19 21 / 0.1)"
      }
    }
  },
  plugins: []
};

export default config;

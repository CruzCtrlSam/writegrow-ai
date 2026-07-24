import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Growth theme: fresh green primary, warm honey accent, soft paper base
        paper: "#FBFAF5",
        ink: "#23302A",
        sprout: {
          50: "#EEF6EE",
          100: "#D6EBD7",
          200: "#AED7B0",
          300: "#7FBF86",
          400: "#53A45F",
          500: "#318545", // primary
          600: "#256A37",
          700: "#1D5430",
          800: "#163F25",
          900: "#0F2C1B",
        },
        honey: {
          100: "#FBEFD2",
          200: "#F6DC9E",
          300: "#EFC560",
          400: "#E5AC2E",
          500: "#C98A12",
        },
        clay: "#C2654A",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(35,48,42,0.04), 0 8px 24px -12px rgba(35,48,42,0.18)",
        lift: "0 2px 4px rgba(35,48,42,0.06), 0 18px 40px -16px rgba(35,48,42,0.28)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;

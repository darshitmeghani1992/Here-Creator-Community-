import type { Config } from "tailwindcss";

/**
 * HERE design tokens — mirror the CSS variables in app/globals.css so classes
 * and raw `var(--token)` usage stay in lockstep with the prototype.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f4f5f8",
        card: "#ffffff",
        ink: "#15171c",
        muted: "#697386",
        faint: "#9aa2b1",
        line: "#eef0f4",
        line2: "#e4e7ee",
        violet: {
          DEFAULT: "#7c3aed",
          dk: "#6d28d9",
          100: "#f2ecfe",
          200: "#e6d9fd",
          700: "#5b21b6",
        },
        red: {
          DEFAULT: "#ef2d4c",
          100: "#fdecef",
        },
        green: {
          DEFAULT: "#0f9d6b",
          100: "#e7f6ef",
        },
        orange: {
          DEFAULT: "#f59e0b",
          100: "#fdf3e0",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        pulseDot: {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".4", transform: "scale(.8)" },
        },
        sheetUp: {
          from: { transform: "translateY(102%)" },
          to: { transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        msgIn: {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        floatUp: {
          "0%": { transform: "translateY(0) scale(.6)", opacity: "0" },
          "18%": { opacity: "1" },
          "100%": { transform: "translateY(-150px) scale(1.25)", opacity: "0" },
        },
        toastIn: {
          from: { transform: "translateY(16px) scale(.96)", opacity: "0" },
          to: { transform: "translateY(0) scale(1)", opacity: "1" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.1s infinite",
        sheetUp: "sheetUp .3s cubic-bezier(.2,.8,.2,1)",
        fadeIn: "fadeIn .2s ease",
        msgIn: "msgIn .22s ease",
        floatUp: "floatUp 2.6s ease-out forwards",
        toastIn: "toastIn .28s cubic-bezier(.2,.8,.2,1)",
      },
    },
  },
  plugins: [],
};

export default config;

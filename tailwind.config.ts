import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      colors: {
        brand: {
          50:  "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          300: "#f0abfc",
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
          700: "#a21caf",
          800: "#86198f",
          900: "#701a75",
          950: "#4a044e",
        },
        gold: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        surface: {
          DEFAULT: "#0f0a1a",
          card:    "#1a1028",
          border:  "#2d1f42",
          hover:   "#231535",
        },
        text: {
          muted: "#a78bba",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-glow":
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(217,70,239,0.25) 0%, transparent 60%)",
        "card-shine":
          "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)",
      },
      animation: {
        "fade-in":     "fadeIn 0.6s ease forwards",
        "slide-up":    "slideUp 0.5s ease forwards",
        "slide-right": "slideRight 0.4s ease forwards",
        "pulse-slow":  "pulse 3s ease-in-out infinite",
        "float":       "float 6s ease-in-out infinite",
        "shimmer":     "shimmer 2s linear infinite",
        "spin-slow":   "spin 8s linear infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" },                 to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideRight:{ from: { opacity: "0", transform: "translateX(-20px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        float:     { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        shimmer:   { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
      },
      boxShadow: {
        glow:       "0 0 30px rgba(217,70,239,0.3)",
        "glow-sm":  "0 0 12px rgba(217,70,239,0.2)",
        "glow-gold":"0 0 20px rgba(251,191,36,0.35)",
        card:       "0 4px 24px rgba(0,0,0,0.4)",
      },
      backdropBlur: { xs: "2px" },
    },
  },
  plugins: [],
};

export default config;

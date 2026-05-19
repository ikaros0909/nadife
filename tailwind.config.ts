import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"]
      },
      colors: {
        ink: {
          50: "#f5f3ee",
          100: "#e8e3d8",
          200: "#bfb7a3",
          800: "#1a1817",
          900: "#0d0c0b"
        },
        nadi: {
          gold: "#d4af6f",
          rose: "#c47b8a",
          night: "#0b0e1a",
          deep: "#11142b",
          glow: "#f5e6c8"
        }
      },
      backgroundImage: {
        "starfield":
          "radial-gradient(ellipse at top, rgba(212,175,111,0.12), transparent 50%), radial-gradient(ellipse at bottom, rgba(196,123,138,0.10), transparent 50%), linear-gradient(180deg, #0b0e1a 0%, #11142b 100%)",
        "card-gold":
          "linear-gradient(135deg, rgba(212,175,111,0.25), rgba(196,123,138,0.20))"
      },
      animation: {
        "shimmer": "shimmer 2.4s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "reveal": "reveal 1.2s cubic-bezier(.22,.8,.18,1) forwards"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" }
        },
        reveal: {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        }
      }
    }
  },
  plugins: []
};

export default config;

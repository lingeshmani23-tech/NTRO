/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mint: "#70FFD2",
        "mint-hover": "#5CE6BD",
        "light-yellow": "#FFFC8C",
        "brand-amber": "#FFCC4D",
        "brand-orange": "#FF9137",
        bgPrimary: "#0B1120",
        bgSecondary: "#0F172A",
        cardDark: "#111827",
        cardElevated: "#172033",
        borderDark: "#263449",
        textPrimary: "#F8FAFC",
        textSecondary: "#94A3B8",
        textMuted: "#64748B",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        xl: '0.75rem',
      },
    },
  },
  plugins: [],
}

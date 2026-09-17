/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B1220",
        "ink-soft": "#131C2E",
        card: "#FFFFFF",
        line: "#1F2A3D",
        "line-light": "#E5E9F0",
        primary: "#2563EB",
        critical: "#DC2626",
        high: "#EA580C",
        warning: "#F59E0B",
        medium: "#F59E0B",
        low: "#64748B",
        secure: "#16A34A",
        info: "#0EA5E9",
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

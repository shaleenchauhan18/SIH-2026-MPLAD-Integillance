/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1220",
        surface: "#0f172a",
        panel: "#111a2e",
        border: "#1f2a44",
        muted: "#94a3b8",
        accent: "#3b82f6",
        low: "#10b981",
        medium: "#f59e0b",
        high: "#f97316",
        critical: "#ef4444"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      }
    }
  },
  plugins: []
};

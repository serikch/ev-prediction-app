/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ev-dark': '#0a0a0a',
        'ev-darker': '#050505',
        'ev-card': '#111111',
        'ev-border': '#1f1f1f',
        'ev-green': '#00d26a',
        'ev-blue': '#00a8ff',
        'ev-orange': '#ff9500',
        'ev-red': '#ff3b30',
        'ev-yellow': '#ffcc00',
      },
    },
  },
  plugins: [],
}
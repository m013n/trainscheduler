/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        train: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          conductor: '#f59e0b',
          r3: '#3b82f6',
          r2: '#10b981',
          r1: '#8b5cf6'
        }
      }
    },
  },
  plugins: [],
}

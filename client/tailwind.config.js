/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#1DB954',
        'brand-dark': '#158a3e',
        surface: '#121212',
        'surface-2': '#1E1E1E',
        'surface-3': '#2A2A2A',
        'surface-4': '#333333',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}

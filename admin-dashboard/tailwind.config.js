/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#1DB954',
        'brand-dark': '#158a3e',
        'd1': '#1E1E1E',
        'd2': '#121212',
        'd3': '#0A0A0A',
        'd4': '#2A2A2A',
      }
    }
  },
  plugins: [],
}

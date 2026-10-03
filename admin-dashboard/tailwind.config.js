/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#1DB954',
          hover: '#1ed760',
          dark: '#158a3e',
          glow: 'rgba(29, 185, 84, 0.25)',
        },
        surface: {
          0: '#07080b',
          1: '#0d0f15',
          2: '#131620',
          3: '#1a1e2b',
        },
        d1: '#12141c',
        d2: '#0b0c10',
        d3: '#07080b',
        d4: '#1a1e2a',
      },
      boxShadow: {
        'brand-glow': '0 0 25px -5px rgba(29, 185, 84, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'pulse-subtle': 'pulseSubtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}

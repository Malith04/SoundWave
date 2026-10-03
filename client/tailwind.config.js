function withOpacity(variableName, fallbackRgb = '29, 185, 84') {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}, ${fallbackRgb}), ${opacityValue})`
    }
    return `rgb(var(${variableName}, ${fallbackRgb}))`
  }
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand:       withOpacity('--brand-rgb', '29, 185, 84'),
        'brand-dark':'var(--brand-dark, #158a3e)',
        surface:     'var(--bg,  #121212)',
        'surface-2': 'var(--bg2, #1E1E1E)',
        'surface-3': 'var(--bg3, #2A2A2A)',
        'surface-4': 'var(--bg4, #333333)',
      },
      animation: {
        'spin-slow':  'spin 8s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}

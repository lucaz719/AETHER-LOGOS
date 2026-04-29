/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'glass-bg': '#0a0a0f',
        'glass-card': '#12121a',
        'glass-border': 'rgba(255, 255, 255, 0.15)',
      },
      backgroundColor: {
        'glass': 'rgba(18, 18, 26, 0.8)',
      },
      backdropFilter: {
        'glass': 'blur(8px)',
      },
    },
  },
  plugins: [],
}

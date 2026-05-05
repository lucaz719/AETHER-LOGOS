/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        surface: {
          page: '#f8fafc',
          panel: '#ffffff',
          subtle: '#f1f5f9',
          border: '#dbe3ed',
        },
        market: {
          yes: '#15803d',
          no: '#b91c1c',
        },
      },
      boxShadow: {
        panel: '0 1px 2px 0 rgba(15, 23, 42, 0.08)',
        // Fix for undefined --shadow-card and --glow-cyan used in globals.css
        card: '0 10px 25px -3px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.06)',
        'glow-indigo': '0 0 20px rgba(99, 102, 241, 0.4)',
        'glow-primary': '0 0 20px rgba(0, 102, 255, 0.35)',
      },
    },
  },
  plugins: [],
}

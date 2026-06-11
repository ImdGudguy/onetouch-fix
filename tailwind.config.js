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
        'neon-cyan': '#00e5ff',
        'neon-purple': '#a855f7',
        'neon-green': '#10b981',
        'neon-pink': '#ec4899',
        'neon-orange': '#f97316',
        'neon-red': '#ef4444',
        'neon-yellow': '#facc15',
        'space-black': '#0a0a12',
        'space-dark': '#12121a',
        // Semantic tokens (intent-named) layered over the neon palette so
        // component code expresses meaning, not raw hue. Per UI/UX color-semantic.
        primary: '#00e5ff',   // brand / primary action  (cyan)
        accent: '#a855f7',    // secondary accent         (purple)
        success: '#10b981',   // healthy / completed      (green)
        warning: '#facc15',   // attention / degraded     (yellow)
        danger: '#ef4444',    // critical / failed        (red)
        info: '#60a5fa',      // neutral informational    (blue)
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        xxs: ['0.625rem', { lineHeight: '0.875rem' }],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}

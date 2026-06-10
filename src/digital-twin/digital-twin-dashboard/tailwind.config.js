/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0f1a',
        'bg-surface': '#111827',
        'bg-elevated': '#1f2937',
        'accent-ok': '#10b981',
        'accent-warn': '#f59e0b',
        'accent-crit': '#ef4444',
        'accent-blue': '#3b82f6',
        'text-primary': '#f9fafb',
        'text-secondary': '#9ca3af',
        border: '#374151',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

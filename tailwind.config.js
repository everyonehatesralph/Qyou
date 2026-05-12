/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds — now powered by CSS vars for theme switching
        background: 'var(--bg)',
        surface:    'var(--surface)',
        'surface-2':'var(--surface-2)',
        'surface-3':'var(--surface-3)',
        // Brand — rich caramel gold
        primary:        'var(--primary)',
        'primary-dark': '#A06B00',
        'primary-light':'#E09B1A',
        'primary-glow': 'rgba(200,134,10,0.18)',
        // Accent — soft warm cream
        accent:        '#E8C97A',
        'accent-soft': 'rgba(232,201,122,0.12)',
        // Text — theme-aware
        'text-base':   'var(--text)',
        'text-muted':  'var(--text-muted)',
        'text-faint':  'var(--text-faint)',
        // Border — theme-aware
        border:        'var(--border)',
        'border-light':'var(--border-light)',
        // Status
        success:       '#4ADE80',
        'success-bg':  'rgba(74,222,128,0.1)',
        warning:       '#FBBF24',
        'warning-bg':  'rgba(251,191,36,0.1)',
        error:         '#F87171',
        'error-bg':    'rgba(248,113,113,0.1)',
        info:          '#60A5FA',
        'info-bg':     'rgba(96,165,250,0.1)',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm':  '6px',
        DEFAULT:'10px',
        'md':  '12px',
        'lg':  '16px',
        'xl':  '20px',
        '2xl': '24px',
      },
      boxShadow: {
        'glow-primary': '0 0 24px rgba(200,134,10,0.25)',
        'glow-sm':      '0 0 12px rgba(200,134,10,0.15)',
        'card':         'var(--card-shadow)',
        'card-hover':   'var(--card-shadow-hover)',
      },
      backdropBlur: {
        'xs': '4px',
      },
    },
  },
  plugins: [],
}

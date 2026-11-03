/** @type {import('tailwindcss').Config} */
// Every color is a CSS custom property defined in src/styles/globals.css.
const status = ['waiting', 'progress', 'ready', 'done', 'cancelled']

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:            'var(--bg)',
        surface:       'var(--surface)',
        'surface-2':   'var(--surface-2)',
        'surface-3':   'var(--surface-3)',
        line:          'var(--border)',
        'line-strong': 'var(--border-strong)',
        ink:           'var(--text)',
        'ink-muted':   'var(--text-muted)',
        'ink-faint':   'var(--text-faint)',
        accent:        'var(--accent)',
        'accent-hover':'var(--accent-hover)',
        'accent-soft': 'var(--accent-soft)',
        'accent-text': 'var(--accent-text)',
        'on-accent':   'var(--on-accent)',
        scrim:         'var(--scrim)',
        ...Object.fromEntries(status.flatMap(s => [
          [`status-${s}-bg`, `var(--status-${s}-bg)`],
          [`status-${s}-text`, `var(--status-${s}-text)`],
        ])),

        // Legacy aliases, removed in the cleanup task
        background:     'var(--bg)',
        primary:        'var(--accent)',
        'primary-dark': 'var(--accent-hover)',
        'primary-light':'var(--accent-hover)',
        'primary-glow': 'var(--accent-soft)',
        'text-base':    'var(--text)',
        'text-muted':   'var(--text-muted)',
        'text-faint':   'var(--text-faint)',
        border:         'var(--border)',
        'border-light': 'var(--border-strong)',
        success:        'var(--status-ready-text)',
        'success-bg':   'var(--status-ready-bg)',
        warning:        'var(--status-waiting-text)',
        'warning-bg':   'var(--status-waiting-bg)',
        error:          'var(--status-cancelled-text)',
        'error-bg':     'var(--status-cancelled-bg)',
        info:           'var(--status-progress-text)',
        'info-bg':      'var(--status-progress-bg)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        control: '10px',
        card:    '12px',
        sheet:   '16px',
        // Legacy keys, removed in the cleanup task
        'sm':  '6px',
        DEFAULT:'10px',
        'md':  '12px',
        'lg':  '16px',
        'xl':  '20px',
        '2xl': '24px',
      },
      boxShadow: {
        pop:            'var(--shadow-pop)',
        // Legacy keys, removed in the cleanup task
        'glow-primary': 'none',
        'glow-sm':      'none',
        'card':         'none',
        'card-hover':   'none',
      },
    },
  },
  plugins: [],
}

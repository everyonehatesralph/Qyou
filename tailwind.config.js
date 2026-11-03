/** @type {import('tailwindcss').Config} */
// Every color is a CSS custom property defined in src/styles/globals.css.
const status = ['waiting', 'progress', 'ready', 'done', 'cancelled']

export default {
  // Hover styles only on devices that can hover, so taps don't leave sticky hover states
  future: { hoverOnlyWhenSupported: true },
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
        glass:         'var(--glass-bg)',
        ...Object.fromEntries(status.flatMap(s => [
          [`status-${s}-bg`, `var(--status-${s}-bg)`],
          [`status-${s}-text`, `var(--status-${s}-text)`],
        ])),

      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        control: '10px',
        card:    '12px',
        sheet:   '16px',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        enter: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        ring: {
          '0%, 100%': { transform: 'rotate(0)' },
          '10%, 30%, 50%': { transform: 'rotate(-14deg)' },
          '20%, 40%': { transform: 'rotate(14deg)' },
          '60%': { transform: 'rotate(0)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
        enter: 'enter 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        pop: 'pop 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        marquee: 'marquee 28s linear infinite',
        ring: 'ring 1.6s ease-in-out infinite',
      },
      transitionTimingFunction: {
        // Strong ease-out: starts fast so UI feels responsive
        DEFAULT: 'cubic-bezier(0.23, 1, 0.32, 1)',
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      boxShadow: {
        pop:            'var(--shadow-pop)',
        lift:           'var(--shadow-lift)',
      },
    },
  },
  plugins: [],
}

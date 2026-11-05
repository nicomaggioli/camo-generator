/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ps: {
          menu: '#2b2b2b',
          bar: '#323232',
          panel: '#383838',
          tab: '#2b2b2b',
          input: '#232323',
          line: '#1f1f1f',
          edge: '#4a4a4a',
          hover: '#454545',
          active: '#535353',
          canvas: '#262626',
          text: '#d6d6d6',
          dim: '#9a9a9a',
          faint: '#6e6e6e',
          blue: '#1473e6',
        },
        tactical: {
          950: '#121315',
          900: '#1a1c1e',
          800: '#25282b',
          700: '#2f3336',
          600: '#3c4145',
          500: '#5a6066',
          400: '#8a9096',
          300: '#b4b9bd',
          accent: '#4ade80',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAF7',
        surface: '#FFFFFF',
        surfaceHover: '#F3F5EE',
        border: '#E2E6D9',
        ink: '#2A2E2C',
        muted: '#737A7B',
        accent: '#AACF38',
        accentSoft: '#D5E3B7',
        onAccent: '#20241C',
        online: '#7CB342',
        pending: '#C7CCC6',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

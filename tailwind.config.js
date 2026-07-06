/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#10121A',
        surface: '#1A1D29',
        surfaceHover: '#20232F',
        border: '#2B2F3D',
        ink: '#EDEEF3',
        muted: '#8C90A4',
        accent: '#FF6A3D',
        accentSoft: 'rgba(255,106,61,0.12)',
        online: '#4ADE80',
        pending: '#565B6E',
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

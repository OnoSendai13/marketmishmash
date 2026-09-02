/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette sombre du dashboard
        base: '#0b0f19',
        panel: '#151b2b',
        panel2: '#1c2436',
        accent: '#3b82f6',
        up: '#16c784',
        down: '#ea3943',
      },
    },
  },
  plugins: [],
}

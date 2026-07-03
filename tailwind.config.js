/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#191919',
        panel: '#2D2D2D',
        border: '#1E1E1E',
        accent: '#4E99A3',
        input: '#232323',
        icon: '#9FA0A0',
        primary: '#C3C3C3'
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

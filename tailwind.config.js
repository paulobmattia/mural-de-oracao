/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Essa linha obriga o site a obedecer o seu botão
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
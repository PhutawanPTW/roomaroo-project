/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./src/**/*.component.{html,ts}",
    "./src/**/*.component.{html,ts,css}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'thai': ['Noto Sans Thai', 'sans-serif'],
        'english': ['Inter', 'sans-serif'],
      },
      spacing: {
        '0.45': '0.45rem',
      },
    },
  },
  plugins: [],
}

 
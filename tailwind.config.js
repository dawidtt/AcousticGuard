/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#4A0072',   // Twój fiolet
        secondary: '#FDDAFF', // Twój róż
        background: '#121212',
      },
    },
  },
  plugins: [],
}


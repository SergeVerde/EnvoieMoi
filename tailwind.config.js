/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#E94E1B', hover: '#D84315', light: '#FFF1EE' },
        surface: '#F8F5F1',
        danger: '#DC2626',
        basil: '#6FCF97',
        saffron: '#F2C94C',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderWidth: { '3': '3px' },
    },
  },
  plugins: [],
};

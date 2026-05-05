/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{js,vue,ts}',
    './composables/**/*.{js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        soil: {
          950: '#0d0f0d',
          900: '#171311',
          800: '#2d241d'
        },
        leaf: {
          500: '#4f9d69',
          400: '#6cc182',
          300: '#97d6aa'
        },
        maize: {
          500: '#d1a642',
          400: '#e6bc61',
          300: '#f1d58f'
        }
      },
      boxShadow: {
        floating: '0 18px 40px rgba(0, 0, 0, 0.28)'
      }
    }
  },
  plugins: []
}
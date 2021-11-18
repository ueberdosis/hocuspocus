module.exports = {
  purge: [
    './src/**/*.vue',
    './src/*.html',
  ],
  theme: {
    extend: {},
  },
  variants: {
  },
  plugins: [
    require('tailwindcss-font-inter')(),
  ],
}

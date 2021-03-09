const colors = require('tailwindcss/colors')

module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
  },
  experimental: {},
  purge: {
    content: ['./src/index.html', './src/**/*.vue'],
  },
  theme: {
    interFontFeatures: {
      default: ['calt', 'liga', 'kern'],
      numeric: ['tnum', 'salt', 'ss02'],
    },
    extend: {
      colors: {
        gray: {
          100: '#f5f5f5',
          200: '#eeeeee',
          300: '#e0e0e0',
          400: '#bdbdbd',
          500: '#9e9e9e',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
        },
      },
    },
  },
  variants: {},
  plugins: [
    require('tailwindcss-font-inter')({
      importFontFace: true,
      disableUnusedFeatures: true,
    }),
  ],
}

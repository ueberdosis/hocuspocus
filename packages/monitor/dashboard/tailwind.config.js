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

const postcssPresetEnv = require('postcss-preset-env')

const presetEnv = postcssPresetEnv({
  /* use stage 3 features + css nesting rules */
  stage: 3,
  features: {
    'nesting-rules': true,
  },
})

module.exports = {
  plugins: [require('tailwindcss'), presetEnv],
}

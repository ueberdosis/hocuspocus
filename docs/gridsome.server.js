const { createDefaultOpenGraphImage, createSpecificOpenGraphImage } = require('./utilities/opengraph-images')

createDefaultOpenGraphImage('The plug & play collaboration backend. ', 'static/images/og-image.png')

module.exports = function (api) {
  api.onCreateNode(options => {
    if (process.env.NODE_ENV === 'production' && options.internal.typeName === 'DocPage') {
      createSpecificOpenGraphImage(options.title, options.content, `static/images${options.path}og-image.png`)
    }
  })
}

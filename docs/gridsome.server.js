const globby = require('globby')
const { createDefaultOpenGraphImage, createSpecificOpenGraphImage } = require('./utilities/opengraph-images')

createDefaultOpenGraphImage('The plug & play collaboration backend.', 'static/images/og-image.png')

module.exports = function (api) {

  api.setClientOptions({
    cwd: process.cwd(),
  })

  api.onCreateNode(options => {
    if (process.env.NODE_ENV === 'production' && options.internal.typeName === 'DocPage') {
      createSpecificOpenGraphImage(options.title, options.content, `static/images${options.path}og-image.png`)
    }
  })

  api.loadSource(() => {
    /**
     * Generate pages for all demo components for testing purposes
     */
    const demos = []

    globby.sync('./src/demos/**/index.(vue|jsx)').forEach(file => {
      const match = file.match(
        new RegExp(/\.\/src\/demos\/([\S]+)\/index.(vue|jsx)/i),
      )

      if (!match) {
        return
      }

      demos.push(match[1])
    })

    api.createPages(({ createPage }) => {
      createPage({
        path: '/demos',
        component: './src/templates/DemoPages/index.vue',
        context: {
          demos,
        },
      })

      demos.forEach(name => {
        createPage({
          path: `/demos/${name}`,
          component: './src/templates/DemoPage/index.vue',
          context: {
            name,
          },
        })
      })
    })
  })

}

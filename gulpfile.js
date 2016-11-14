/* eslint-env node */

var gulp = require('gulp')
var $ = require('gulp-load-plugins')()
var runSequence = require('run-sequence').use(gulp)

require('../yjs/gulpfile.helper.js')(gulp, {
  polyfills: [],
  entry: './src/Websockets-server.js',
  targetName: 'y-websockets-server.js',
  moduleName: 'yWebsocketsServer',
  specs: []
})

gulp.task('default', ['updateSubmodule'], function (cb) {
  gulp.src('package.json')
    .pipe($.prompt.prompt({
      type: 'checkbox',
      name: 'tasks',
      message: 'Which tasks would you like to run?',
      choices: [
        'test                    Test this project',
        'dev:browser             Watch files & serve the testsuite for the browser',
        'dev:nodejs              Watch filse & test this project with nodejs',
        'bump                    Bump the current state of the project',
        'publish                 Publish this project. Creates a github tag',
        'dist                    Build the distribution files'
      ]
    }, function (res) {
      var tasks = res.tasks.map(function (task) {
        return task.split(' ')[0]
      })
      if (tasks.length > 0) {
        console.info('gulp ' + tasks.join(' '))
        runSequence(tasks, cb)
      } else {
        console.info('Ok, .. goodbye')
      }
    }))
})

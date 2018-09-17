const path = require('path')
const fs = require('fs-extra')
const lodash = require('lodash')
const glob = require('glob')

// global

global.__base = path.resolve(__dirname, '../../..')

require('app-module-path').addPath(`${global.__base}/src`)

global.__src = function(...args) {
  return require(path.resolve(global.__base, 'src', ...args))
}

global.__load = function(options) {
  const dir = options.dir
  const files = glob.sync('**/*.js', { cwd: dir })
  const excludes = lodash.compact(lodash.concat('index.js', options.excludes))

  const data = {}

  files.forEach(file => {
    if (excludes.includes(file)) return

    lodash.assign(data, require(path.join(dir, file)))
  })

  return data
}

global.__temp = function(file, data) {
  if (!(typeof data === 'string')) {
    data = JSON.stringify(data, null, 2)
  }

  fs.outputFileSync('temp/' + file, data)
}

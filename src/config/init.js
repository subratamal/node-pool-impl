const path = require('path')
const fs = require('fs-extra')
const yaml = require('js-yaml')
const Config = require('./config')

module.exports = initConfig()

function initConfig() {
  const file = path.join(__base, 'config.yaml')
  const text = fs.readFileSync(file, 'utf8')

  const data = yaml.safeLoad(text)

  return new Config(data)
}

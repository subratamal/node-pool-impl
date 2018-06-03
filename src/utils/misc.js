const path = require('path')
const slug = require('slug')

exports.sanitizePath = function(text) {
  text = text.split(/[\\//]/)

  return path.join(...text.map(part => slug(part.replace(/\./g, '_'), '_')))
}

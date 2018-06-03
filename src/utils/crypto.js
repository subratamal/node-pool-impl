const crypto = require('crypto')

exports.md5 = function(data) {
  return crypto.createHash('md5').update(data).digest('hex')
}

exports.decodeBase64 = function(data) {
  try {
    const buffer = new Buffer(data, 'base64')

    return buffer.toString('utf8')
  } catch (error) {
    return null
  }
}

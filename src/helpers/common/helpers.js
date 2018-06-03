const urlparser = require('url')
const querystring = require('querystring')
const lodash = require('lodash')
const Crypto = __src('utils/crypto')

exports.standardName = function(name, options = {}) {
  const { full = false } = options

  let displayName = lodash.trim(name)

  if (!displayName) {
    return full ? { name: null, displayName: null } : null
  }

  displayName = displayName.replace(/\s+/g, ' ')

  name = lodash.lowerCase(displayName)
    .replace(/(\s+|-|\/|\\|`|\.|,)/g, '_')

  return full ? { name, displayName } : name
}

exports.standardPhoneNumber = function(text, options = {}) {
  const { code, prefixes, length = 0 } = options

  const phoneNumber = text
    .trim()
    .replace(/[^0-9]/g, '')
    .replace(/^0+/, '')
    .replace(new RegExp('^' + code), '')
    .replace(/^0+/, '')

  let ok = false

  lodash.forEach(prefixes, prefix => {
    if (!ok && phoneNumber.startsWith(prefix)) {
      ok = true
    }

    return !ok
  })

  if (!ok) return null

  if (length && phoneNumber.length !== length) return null

  return code + phoneNumber
}

exports.parseLink = function(text) {
  const url = urlparser.parse(text)
  const params = querystring.parse(url.query)

  return { path: url.pathname, params }
}

exports.stringifyUrl = function(options) {
  let url = (options.baseUrl || '') + (options.uri || options.url || '')
  const qs = querystring.stringify(options.qs)

  if (qs) url = url + '?' + qs

  return url
}

exports.toId = function(data) {
  return Crypto.md5(JSON.stringify(data))
}

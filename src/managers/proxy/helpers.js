const net = require('net')
const lodash = require('lodash')
const request = require('request-promise')
const plimit = require('p-limit')

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'

module.exports = {
  USER_AGENT,
  toProxyUrl,
  jar,
  cookie,
  isIP,
  createRequest,
  createLimit
}

function jar({ cookies, url } = {}) {
  const jar = request.jar()

  if (lodash.isPlainObject(cookies)) {
    cookies = lodash.map(cookies, (value, name) => [{ name, value }])
  }

  if (lodash.isArray(cookies)) {
    cookies.forEach(cookie => {
      jar.setCookie(this.cookie(cookie.name, cookie.value), url)
    })
  }

  return jar
}

function cookie(name, value) {
  return request.cookie(`${name}=${encodeURIComponent(value)}`)
}

function toProxyUrl(proxy) {
  const auth = (proxy.username && proxy.password) ? `${proxy.username}:${proxy.password}@` : ''
  const host = net.isIPv6(proxy.host) ? `[${proxy.host}]` : proxy.host

  return `http://${auth}${host}:${proxy.port}`
}

function isIP(...args) {
  return net.isIP(...args)
}

function createRequest(proxy, options) {
  options = lodash.merge({
    headers: {
      'User-Agent': USER_AGENT
    },
    proxy: toProxyUrl(proxy),
    simple: false
  }, options)

  return request.defaults(options)
}

function createLimit(threshold, delay = [100, 200]) {
  const limit = plimit(threshold)
  let count = 1

  return function(fn) {
    if (count > threshold) return limit(fn)

    count += 1
    const wait = count * lodash.random(delay[0], delay[1])

    return limit(async function() {
      await Promise.delay(wait)
      return await fn()
    })
  }
}

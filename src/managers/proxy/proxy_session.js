const lodash = require('lodash')
const request = require('request-promise')
const errors = __src('runners/errors')
const helpers = require('./helpers')

const TIMEOUT_INCREASEMENT = 30000
const RETRY_DELAY = 1000

class ProxySession {

  constructor(proxyManager, proxy, config) {
    this._proxyManager = proxyManager
    this._proxy = proxy

    this._config = config

    this._options = {
      headers: {
        'User-Agent': helpers.USER_AGENT
      },
      proxy: helpers.toProxyUrl(proxy),
      simple: false,
      jar: request.jar()
    }
  }

  get proxyInfo() {
    return this._proxy
  }

  release(error) {
    return this._proxyManager.release(this._proxy, error)
  }

  jar(...args) {
    return helpers.jar(...args)
  }

  cookie(...args) {
    return helpers.jar(...args)
  }

  defaults(options = {}, merge = true) {
    if (!merge) {
      this._options = options
      return
    }

    lodash.merge(this._options, options)
  }

  async request(options, config) {
    config = lodash.assign({}, this._config, config)

    let { retries = 0, timeout = 0 } = config

    options = lodash.merge({}, this._options, options)

    if (!options.jar) {
      options.jar = request.jar()
    }

    let result = null
    let error = null

    for (let i = 0; i <= retries; i++) {
      try {
        result = await this._timeoutRequest(options, timeout)
        error = null
        break
      } catch (err) {
        // increase time out by 30s
        if (timeout) {
          timeout += TIMEOUT_INCREASEMENT
        }

        error = err
        await Promise.delay(RETRY_DELAY)
      }
    }

    if (error) {
      throw errors.toProxyError(this._proxy, error)
    }

    return result
  }

  _timeoutRequest(options, timeout = 0) {
    let resolved = false
    let timeoutId = null

    const deferred = Promise.pending()

    if (timeout) {
      const timeoutCallback = () => {
        if (resolved) return

        resolved = true
        timeoutId = null

        deferred.reject(new errors.RequestTimeoutError(timeout, options))
      }

      timeoutId = setTimeout(timeoutCallback, timeout)
    }

    const timeoutCancel = () => {
      resolved = true
      if (timeoutId && !resolved) clearTimeout(timeoutId)
    }

    request(options)
      .then(result => {
        timeoutCancel()
        deferred.resolve(result)
      })
      .catch(error => {
        timeoutCancel()
        deferred.reject(new errors.RequestError(error))
      })

    return deferred.promise
  }

}

module.exports = ProxySession

const lodash = require('lodash')
const moment = require('moment')
const Config = __src('config')
const DataManager = __src('managers/data')
const LogManager = __src('managers/log')
const errors = __src('runners/errors')
const TaskQueue = __src('utils/task_queue')
const ProxySession = require('./proxy_session')
const { checkProxy } = require('./proxy_checker')
const { createLimit } = require('./helpers')

const SYNC_INTERVAL = Config.toTime('5m', 'ms')
const RELEASE_PROXIES_INTERVAL = Config.toTime('1s', 'ms')
const SUSPEND_PROXIES_INTERVAL = Config.toTime('1s', 'ms')
const CHECK_SUSPENDED_PROXIES_INTERVAL = Config.toTime('30m', 'ms')
const CHECK_SUSPENDED_PROXIES_THRESHOLD = 50
const CHECK_ACTIVE_PROXIES_INTERVAL = Config.toTime('5s', 'ms')

const DEFAULT_DELAY = [5, 10]
const DEFAULT_RETRIES = 2
const DEFAULT_TIMEOUT = Config.toTime('90s', 'ms')

class ProxyManager {

  async init(site, options) {
    this._site = site

    this._options = lodash.assign({
      retries: DEFAULT_RETRIES,
      timeout: DEFAULT_TIMEOUT,
      countries: [],
      maxProxies: 0
    }, options)

    this._options.delay = this._getDelay(this._options.delay)

    this._queue = new TaskQueue({ name: 'proxy_manager' })

    this._logger = LogManager.for('site').sub('manager.proxy')

    this._proxies = {
      pool: {},
      available: [],
      using: [],
      releasing: [],
      suspending: []
    }

    await this._sync()

    this._syncInterval()
    this._releaseProxiesInterval()
    this._suspendProxiesInterval()
    this._checkSuspendedProxiesInterval()
    this._checkActiveProxiesInterval()
  }

  async get() {
    return this._queue.exec(() => this._get())
  }

  async _get() {
    const { available } = this._proxies

    if (lodash.isEmpty(available)) {
      await Promise.delay(1000)
      return await this._get()
    }

    const proxyId = lodash.sample(available)
    const proxy = lodash.get(this._proxies.pool, proxyId)

    const session = new ProxySession(this, proxy, {
      retries: this._options.retries,
      timeout: this._options.timeout
    })

    lodash.pull(available, proxyId)

    this._proxies.using.push({
      proxyId,
      timestamp: moment().unix()
    })

    return session
  }

  async release(proxy, error = null) {
    const proxyId = proxy.id
    const delay = lodash.random(this._options.delay[0], this._options.delay[1])

    lodash.remove(this._proxies.using, usingProxy => usingProxy.proxyId == proxyId)

    if (error) {
      this._proxies.suspending.push(proxyId)
    } else {
      this._proxies.releasing.push({
        proxyId,
        delay,
        timestamp: moment().unix()
      })
    }
  }

  request(...args) {
    return this.session(proxy => proxy.request(...args))
  }

  async session(options) {
    let proxy
    let result
    let retry = 0

    if (lodash.isFunction(options)) {
      options = {
        run: options,
        shouldRetry: false
      }
    }

    const shouldRetry = (error) => {
      if (options.retries && retry >= options.retries) return false

      if (lodash.isFunction(options.shouldRetry)) {
        return options.shouldRetry(error)
      }

      if (options.shouldRetry === false) return false

      return errors.isProxyRelatedError(error)
    }

    const onError = (error) => {
      if (options.onError) options.onError(error)
    }

    do {
      proxy = null

      try {
        if ((retry > 0) && lodash.isFunction(options.retry)) {
          result = await options.retry()
        } else {
          proxy = await this.get()
          result = await options.run(proxy)
        }

        if (proxy) await proxy.release()

        break
      } catch (error) {
        const proxyError = errors.toProxyError(proxy.proxyInfo, error)

        if (proxy) {
          await proxy.release(errors.isProxyRelatedError(error) ? error : null)
        }

        onError(proxyError)

        if (await shouldRetry(error)) {
          retry += 1
        } else {
          throw proxyError
        }
      }
    } while (true)

    return result
  }

  threads(items, fn, delay = [100, 200]) {
    const queue = new TaskQueue({
      name: 'proxy_manager_threads',
      concurrent: true,
      threads: () => this._threshold()
    })

    const threads = this._threshold()

    const tasks = items.map((item, index) => queue.exec(async () => {
      if (index < threads) {
        const wait = index * lodash.random(delay[0], delay[1])
        await Promise.delay(wait)
      }

      return await fn(item, index)
    }))

    return Promise.all(tasks)
  }

  limit() {
    return createLimit(this._threshold())
  }

  get threshold() {
    return this._threshold()
  }

  _threshold() {
    const { maxProxies } = this._options

    let threshold = this.totalActiveProxies()

    if (maxProxies) {
      threshold = Math.min(threshold, maxProxies)
    }

    threshold = Math.max(threshold, 1)

    return threshold
  }

  totalActiveProxies() {
    const { available, using, releasing } = this._proxies

    return available.length + using.length + releasing.length
  }

  getAverageSleepTime() {
    const { delay } = this._options

    return (delay[0] + delay[1]) / 2
  }

  async _sync() {
    const proxies = await DataManager.fetchProxies(this._options.countries)
    const siteProxies = await DataManager.fetchSiteProxies(this._site.id)

    await this._syncSiteProxies(proxies, siteProxies)
    this._syncAvailableProxies(proxies, siteProxies)

    this._proxies.pool = lodash.keyBy(proxies, 'id')
  }

  async _syncInterval() {
    await Promise.delay(SYNC_INTERVAL)

    this._logger.info('sync proxies')

    try {
      await this._sync()
    } catch (error) {
      this._logger.error(error, 'sync proxies error')
    }

    this._syncInterval()
  }

  _syncAvailableProxies(proxies, siteProxies) {
    const suspendedProxyIds = siteProxies
      .filter(siteProxy => siteProxy.status === 'suspended')
      .map(siteProxy => siteProxy.proxyId)

    const usingProxyIds = lodash.map(this._proxies.using, 'proxyId')
    const releasingProxyIds = lodash.map(this._proxies.releasing, 'proxyId')

    const ignoreProxyIds = lodash.keyBy(lodash.concat(
      suspendedProxyIds, usingProxyIds, releasingProxyIds
    ))

    const availableProxyIds = lodash.values(proxies)
      .filter(proxy => !lodash.has(ignoreProxyIds, proxy.id))
      .map(proxy => proxy.id)

    this._proxies.available = availableProxyIds
  }

  async _syncSiteProxies(proxies, siteProxies) {
    // await this._deleteOutDatedSiteProxies(proxies, siteProxies)
    await this._addMissingSiteProxies(proxies, siteProxies)
  }

  // async _deleteOutDatedSiteProxies(proxies, siteProxies) {
    // TODO:
    // check same countries for site proxies before deleting

    // const comparator = (proxy, siteProxy) => {
    //   return proxy.id === siteProxy.proxyId
    // }

    // const deletingProxyIds = lodash.differenceWith(siteProxies, proxies, comparator)
    //   .map(siteProxy => siteProxy.proxyId)

    // if (lodash.isEmpty(deletingProxyIds)) return

    // await DataManager.deleteSiteProxies(this._site.id, deletingProxyIds, {
    //   countries: this._options.countries
    // })
  // }

  async _addMissingSiteProxies(proxies, siteProxies) {
    const comparator = (proxy, siteProxy) => {
      return proxy.id === siteProxy.proxyId
    }

    const addingProxyIds = lodash.differenceWith(proxies, siteProxies, comparator)
      .map(proxy => proxy.id)

    if (lodash.isEmpty(addingProxyIds)) return

    await DataManager.addSiteProxies(this._site.id, addingProxyIds)
  }

  async _releaseProxiesInterval() {
    await Promise.delay(RELEASE_PROXIES_INTERVAL)

    try {
      await this._releaseProxies()
    } catch (error) {
      this._logger.error(error, 'release proxies error')
    }

    this._releaseProxiesInterval()
  }

  async _releaseProxies() {
    const now = moment().unix()

    const releasingProxies = this._proxies.releasing.filter(releasingProxy => {
      return now - releasingProxy.timestamp > releasingProxy.delay
    })

    lodash.pullAllBy(this._proxies.releasing, releasingProxies, 'proxyId')

    const proxyIds = releasingProxies
      .filter(releasingProxy => lodash.has(this._proxies.pool, releasingProxy.proxyId))
      .map(releasingProxy => releasingProxy.proxyId)

    this._proxies.available = lodash.union(this._proxies.available, proxyIds)
  }

  async _suspendProxiesInterval() {
    await Promise.delay(SUSPEND_PROXIES_INTERVAL)

    try {
      const proxyIds = this._proxies.suspending

      if (!lodash.isEmpty(proxyIds)) {
        await DataManager.suspendSiteProxies(this._site.id, proxyIds)

        this._proxies.suspending = []
      }
    } catch (error) {
      this._logger.error(error, 'suspend proxies error')
    }

    this._suspendProxiesInterval()
  }

  async _checkSuspendedProxiesInterval(delay = CHECK_SUSPENDED_PROXIES_INTERVAL) {
    await Promise.delay(delay)

    this._logger.info('check suspended proxies')

    try {
      await this._checkSuspendedProxies()
      this._checkSuspendedProxiesInterval()
    } catch (error) {
      this._logger.error(error, 'check suspended proxies error')
      this._checkSuspendedProxiesInterval(10000)
    }
  }

  async _checkSuspendedProxies() {
    const proxies = await DataManager.fetchSuspendedProxies(this._site.id, {
      threshold: CHECK_SUSPENDED_PROXIES_THRESHOLD,
      countries: this._options.countries
    })

    for (const proxy of proxies) {
      await this._checkSuspendedProxy(proxy)
    }
  }

  async _checkSuspendedProxy(proxy) {
    try {
      await checkProxy(this._site, proxy)
      await DataManager.resetSuspendedSiteProxy(this._site.id, proxy.proxyId)
    } catch (error) {
      this._logger.debug({ err: error, proxy: proxy.host }, 'still die')
      await DataManager.suspendSiteProxy(this._site.id, proxy.proxyId)
    }
  }

  async _checkActiveProxiesInterval() {
    await Promise.delay(CHECK_ACTIVE_PROXIES_INTERVAL)

    try {
      await this._checkActiveProxies()
    } catch (error) {
      this._logger.error(error, 'check active proxies error')
    }

    this._checkActiveProxiesInterval()
  }

  async _checkActiveProxies() {
    const activeProxies = this.totalActiveProxies()
    if (activeProxies > 0) return

    this._logger.warn('no active proxies -> reset all suspended proxies')

    await DataManager.resetSuspendedSiteProxies(this._site.id, {
      countries: this._options.countries
    })

    await this._sync()
  }

  _getDelay(defaultDelay) {
    const delay = Config.site(this._site.key).get('proxy.sleep_time') ||
      defaultDelay ||
      Config.get('proxy.sleep_time')

    const toTime = (value, defaultValue) => {
      if (lodash.isNumber(value)) return value
      return Config.toTime(value, 'seconds') || defaultValue
    }

    if (lodash.isArray(delay)) {
      const min = toTime(delay[0], DEFAULT_DELAY[0])
      const max = toTime(delay.length === 1 ? delay[0] : delay[1], DEFAULT_DELAY[1])

      return [min, max]
    }

    if (lodash.isString(delay)) {
      const min = toTime(delay, DEFAULT_DELAY[0])
      const max = toTime(delay, DEFAULT_DELAY[1])

      return [min, max]
    }

    if (lodash.isNumber(delay)) {
      return [delay, delay]
    }

    return DEFAULT_DELAY
  }

}

module.exports = ProxyManager

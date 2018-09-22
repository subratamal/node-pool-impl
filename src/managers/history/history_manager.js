const lodash = require('lodash')
const Config = __src('config')
const DataManager = __src('managers/data')
const LogManager = __src('managers/log')
const ProxyManager = __src('managers/proxy')

const SYNC_ACTIVE_PROXIES_INTERVAL = Config.toTime('1h', 'ms')

class HistoryManager {

  get runId() {
    return this._runId || null
  }

  async init(site, link) {
    this._site = site
    this._link = link

    this._logger = LogManager.for('site').sub('managers.history')

    await this._addHistory()
    this._syncActiveProxiesInterval()
  }

  async _addHistory() {
    const sleepTime = ProxyManager.getAverageSleepTime()
    const activeProxies = ProxyManager.totalActiveProxies()

    const data = {
      scraper: this._site.domain,
      category: this._link.categoryLink,
      sleepTime: sleepTime,
      activeProxies: lodash.times(24).map(() => activeProxies)
    }

    const result = await DataManager.addHistory(data)

    this._logger.info({ runId: result.runId }, 'scraping history added')

    this._runId = result.runId
    this._activeProxies = data.activeProxies
  }

  async _syncActiveProxiesInterval(delay = SYNC_ACTIVE_PROXIES_INTERVAL) {
    await Promise.delay(delay)

    const activeProxies = ProxyManager.totalActiveProxies()
    this._logger.info({ activeProxies }, 'update active proxies')

    try {
      await this._syncActiveProxies(activeProxies)
      this._syncActiveProxiesInterval()
    } catch (error) {
      this._logger.error({ err: error, activeProxies }, 'update active proxies error')
      this._syncActiveProxiesInterval(10000)
    }
  }

  async _syncActiveProxies(activeProxies) {
    const list = this._activeProxies.slice()

    list.shift()
    list.push(activeProxies)

    await DataManager.updateActiveProxies(this._runId, list)

    this._activeProxies = list
  }

}

module.exports = new HistoryManager()

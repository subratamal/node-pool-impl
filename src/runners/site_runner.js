const path = require('path')
const fs = require('fs-extra')
const LogManager = require('./../managers/log')
const CacheManager = require('./../managers/cache')
const DataManager = require('./../managers/data')
const ProxyPool = require('./../managers/proxy')
const AddressManager = require('./../managers/address')
const HistoryManager = require('./../managers/history')
const PhoneNumberManager = require('./../managers/phone_number')
const StatsManager = require('./../managers/stats')
const AdsManager = require('./../managers/ads')
const File = require('./../utils/file')

// const LogManager = __src('managers/log')
// const CacheManager = __src('managers/cache')
// const DataManager = __src('managers/data')
// const ProxyManager = __src('managers/proxy')
// const AddressManager = __src('managers/address')
// const HistoryManager = __src('managers/history')
// const PhoneNumberManager = __src('managers/phone_number')
// const StatsManager = __src('managers/stats')
// const AdsManager = __src('managers/ads')
// const File = __src('utils/file')

const RESTART_DELAY = 1000

class SiteRunner {

  constructor(site, link, options) {
    this._site = site
    this._options = options
    this._link = link
  }

  async run() {
    await this._initManagers()

    this._stage = new File(path.join(__base, 'data/schedule', this._site.key, this._link.categoryLink, 'stage'))
    this._logger = LogManager.for('site').sub('site')

    await this._tryRun()
  }

  async _tryRun() {
    let stage = await this._stage.read('precycle')

    try {
      if (stage === 'precycle') {
        await this._precycle()
        stage = 'prerun'
        await this._stage.write(stage)
      }

      if (stage === 'prerun') {
        await this._prerun()
        stage = 'run'
        // NOTE: don't save stage here
        // so prerun get called everytime the worker is reset
      }

      if (stage === 'run') {
        await this._run()
        stage = 'wait'
        await this._stage.write(stage)
      }

      if (stage === 'wait') {
        await this._wait()
        stage = 'postrun'
        await this._stage.write(stage)
      }

      if (stage === 'postrun') {
        await this._postrun()
        stage = 'postcycle'
        await this._stage.write(stage)
      }

      if (stage === 'postcycle') {
        await this._postcycle()
        await this._stage.remove()
      }
    } catch (error) {
      this._logger.error(error, 'error -> restart')

      await Promise.delay(RESTART_DELAY)
      await this._tryRun()
    }
  }

  async _initManagers() {
    const site = this._site
    const link = this._link
    const { proxy, countries, adRunner } = this._options

    await LogManager.init(site, link)
    await CacheManager.init(site, link)
    await ProxyPool.init(site, link, proxy)
    await AddressManager.init(site, { countries })
    await HistoryManager.init(site, link)
    await PhoneNumberManager.init(site)
    await StatsManager.init(site)

    await AdsManager.init(site, { adRunner })
  }

  async _precycle() {
    this._logger.info('prepare the cycle')

    await this._cleanup()
    await DataManager.resetSuspendedSiteProxies(this._site.id)

    if (this._options.precycle) {
      await this._options.precycle()
    }
  }

  async _postcycle() {
    await this._flushCache()

    if (this._options.postcycle) {
      await this._options.postcycle()
    }
  }

  async _prerun() {
    if (this._options.prerun) {
      await this._options.prerun()
    }

    this._prerunCalled = true
  }

  async _postrun() {
    // postrun should be called
    // only if either prerun or run has been called
    if (!this._prerunCalled &&  !this._runCalled) return

    if (this._options.postrun) {
      await this._options.postrun()
    }
  }

  async _run() {
    const runner = await this._options.siteRunner(this._link)
    await runner.run()

    this._runCalled = true
  }

  async _wait() {
    this._logger.info('wait for ads finished')

    await AdsManager.waitForFinished()
  }

  async _cleanup() {
    await this._flushCache()
    await this._cleanupCache()
  }

  async _flushCache() {
    await PhoneNumberManager.flush()
    await StatsManager.flush()
  }

  async _cleanupCache() {
    const dir = path.join(__base, 'data/cache/sites', this._site.key, this._link.categoryLink)

    const caches = [
      'config',
      'list',
      'phone_numbers',
      'stats',
      'running_ads'
    ]

    for (const cache of caches) {
      await fs.remove(path.join(dir, cache))
    }
  }
}

module.exports = SiteRunner

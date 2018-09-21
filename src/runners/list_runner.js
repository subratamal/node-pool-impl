const lodash = require('lodash')
const CacheManager = require('managers/cache')
const LogManager = require('managers/log')
const ProxyPool = require('managers/proxy')
const StatsManager = require('managers/stats')
const PhoneNumberManager = require('managers/phone_number')
const AdsManager = require('managers/ads')
const redisClient = require('managers/data/redis')
const commonHelpers = require('helpers/common')

class ListRunner {
  constructor(options) {
    this._options = options

    this._link = options.link
    this._linkId = commonHelpers.toId(options.link)

    this._cache = CacheManager.for('list/' + this._linkId)

    this._uniqueCacheKey = `list-${this._linkId}`
    this._cacheKeys = {
      pageCount: CacheManager.key(`${this._uniqueCacheKey}:page-count`),
      pageAds: (index) => CacheManager.key(`${this._uniqueCacheKey}:${index}:ads`),
      pageAdsState: (index) => CacheManager.key(`${this._uniqueCacheKey}:${index}:ads:state`)
    }

    this._logger = LogManager.for('site').sub('runner.list', {
      link: this._link
    })
  }

  async run() {
    this._logger.info('fetching pages count')

    const pageCount = this._pages = await this._tryFetchPages()

    this._logger.info('found %d pages', pageCount)

    this._logger.info({ pageCount }, 'fetching pages')

		this._done = 0

    await ProxyPool.pool('list')
      .threads(lodash.times(pageCount), pageIndex => this._tryRunPage(pageIndex + 1))

    // await this._cache.destroy()
    await redisClient.delAsync(`${CacheManager.basePath}:${this._uniqueCacheKey}*`)

    await PhoneNumberManager.flush()
    await StatsManager.flush()
  }

  async _tryFetchPages() {
    const debugPages = +process.env.DEBUG_LIST_PAGES

    if (debugPages) {
      this._logger.debug({ pages: debugPages }, 'use debug pages')
      return debugPages
    }

    const keyPages = 'pages'

    // let pages = await this._cache.get(keyPages)
    let pages = await redisClient.getAsync(this._cacheKeys.pageCount)

    if (pages) {
      this._logger.debug({ pages }, 'use cached pages')
      return pages
    }

    pages = await this._fetchPages()

    // await this._cache.put(keyPages, pages)
    await redisClient.setAsync(this._cacheKeys.pageCount, pages)

    return pages
  }

  _fetchPages() {
    const { pages } = this._options
    if (lodash.isNumber(pages)) return pages

    const { fetchPages } = this._options
    if (!lodash.isFunction(fetchPages)) return 0

    return ProxyPool.pool('list').session({
      run: proxy => this._options.fetchPages({
        link: this._link,
        proxy,
        logger: this._logger
      }),
      onError: (error) => {
        this._logger.error(error, 'fetch pages error -> retry')
      }
    })
  }

  async _tryRunPage(pageIndex) {
    try {
      this._logger.debug({
        pageIndex,
        pages: this._pages
      }, 'page ads - fetching')

      const keyPageResults = 'page-results:' + pageIndex

      // let ads = await this._cache.get(keyPageResults, null)
      const pageAdIndexKey = this._cacheKeys.pageAds(pageIndex)
      const adsCached = await redisClient.lrangeAsync(pageAdIndexKey, 0, -1)
      let ads = adsCached.map(adCached => JSON.parse(adCached)) || null
      const pageAdIndexKeyExist = await redisClient.existsAsync(pageAdIndexKey)

      if (pageAdIndexKeyExist && lodash.isArray(ads)) {
        this._done += 1

        this._logger.debug({
          page: pageIndex,
          pages: this._pages,
          done: this._done,
          ads: ads.length
        }, 'page ads - use cache')
      } else {
        ads = await ProxyPool.pool('list').session({
          run: proxy => this._runPage(pageIndex, proxy),
          onError: (error) => {
            this._logger.error(error, 'fetch page ads error -> retry')
          }
        })
      }

      // await this._cache.put(keyPageResults, ads)

      if (Array.isArray(ads) && ads.length > 0) {
        const adsStringified = ads.map(ad => JSON.stringify(ad))
        await redisClient.delAsync(pageAdIndexKey)
        await redisClient.rpushAsync(pageAdIndexKey, ...adsStringified)
      }

      this._done += 1

      this._logger.debug({
        pageIndex,
        pages: this._pages,
        done: this._done,
        ads: ads.length
      }, 'page ads - fetched')

      this._logger.info({ pageIndex }, 'found %d ads', ads.length)

      await this._enqueueAds(pageIndex, ads)
    } catch (error) {
      this._logger.error(error, 'try run page processing blanket error')
    }
  }

  async _runPage(pageIndex, proxy) {
    const ads = await this._options.fetchPageAds({
      link: this._link,
      pageIndex,
      proxy,
      logger: this._logger
    })

    const debugPageAds = +process.env.DEBUG_PAGE_ADS

    return debugPageAds ? ads.slice(0, debugPageAds) : ads
  }

  async _enqueueAds(pageIndex, ads) {
    for (const ad of ads) {
      await this._enqueueAd(pageIndex, ad)
    }
  }

  async _enqueueAd(pageIndex, ad) {
    const adId = commonHelpers.toId(ad)
    // const keyAdDone = 'ad-done:' + adId

    const adsStateKeyAtIndex = this._cacheKeys.pageAdsState(pageIndex)

    // let isDone = await this._cache.get(keyAdDone, false)
    let adsStateForPageIndex = await redisClient.hgetallAsync(adsStateKeyAtIndex)
    adsStateForPageIndex = adsStateForPageIndex || {}
    let isDone = adsStateForPageIndex[adId] || false

    await redisClient.rpushAsync('before_is_done_check', Math.random())
    if (isDone) return

    await AdsManager.enqueue(ad)

    // await this._cache.put(keyAdDone, true)
    await redisClient.hsetAsync(adsStateKeyAtIndex, adId, true)
  }
}

module.exports = ListRunner

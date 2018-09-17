const lodash = require('lodash')
const LogManager = __src('managers/log')
const CacheManager = __src('managers/cache')

class LinksRunner {

  constructor(options) {
    this._options = options

    this._logger = LogManager.for('site').sub('runner.links')
  }

  async run() {
    const cache = CacheManager.for('config')

    const keyLinks = 'links'
    const keyLinkIndex = 'link-index'

    this._logger.info('fetching links')

    let links = await cache.get(keyLinks)

    if (lodash.isEmpty(links)) {
      links = await this._tryFetchLinks()
      await cache.put(keyLinks, links)
    }

    const debugLinks = +process.env.DEBUG_LINKS

    if (debugLinks) {
      links = links.slice(0, debugLinks)
    }

    this._logger.info('found %d links', links.length)

    const index = await cache.get(keyLinkIndex, 0)

    // for (let i = index; i < links.length; i++) {
    //   await cache.put(keyLinkIndex, i)

    //   await this._runLink(links[i])
    // }

    await this._runLink(this._options.link)
    await cache.del(keyLinks)
    await cache.del(keyLinkIndex)
  }

  async _tryFetchLinks() {
    const { links, fetchLinks } = this._options

    if (lodash.isArray(links)) {
      return links
    }

    if (!lodash.isFunction(fetchLinks)) {
      return []
    }

    do {
      try {
        return await fetchLinks({ logger: this._logger })
      } catch (error) {
        this._logger.error(error, 'fetch links error -> retry')
        await Promise.delay(1000)
      }
    } while (true)
  }

  async _runLink(link) {
    const runner = await this._options.linkRunner({
      link
    })

    await runner.run()
  }

}

module.exports = LinksRunner

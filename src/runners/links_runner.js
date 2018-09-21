const lodash = require('lodash')
const LogManager = require('managers/log')
const CacheManager = require('managers/cache')

class LinksRunner {
  constructor(options) {
    this._options = options
  }

  async run() {
    await this._runLink(this._options.link)
  }

  async _runLink(link) {
    const runner = await this._options.linkRunner({
      link
    })

    await runner.run()
  }

}

module.exports = LinksRunner

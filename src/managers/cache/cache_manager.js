const Cache = require('../../utils/cache')

class CacheManager {
  init(site, link) {
    this._site = site
    this._link = link
  }

  for(name) {
    name = `sites/${this._site.key}/${this._link.categoryLink}/${name}`

    return new Cache(name)
  }
}

module.exports = new CacheManager()

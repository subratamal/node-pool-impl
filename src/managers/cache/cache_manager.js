const Cache = require('utils/cache')

class CacheManager {
  init(site, link, rootKey) {
    this._site = site
    this._link = link
    this._basePath = null
  }

  get basePath() {
    return this._basePath
  }

  for(name) {
    name = `sites/${this._site.key}/${this._link.categoryLink}/${name}`

    return new Cache(name)
  }

  key(name) {
    this._basePath = `${this._site.key}:${this._link.categoryLink}`
    return `${this._basePath}:${name}`
  }
}

module.exports = new CacheManager()

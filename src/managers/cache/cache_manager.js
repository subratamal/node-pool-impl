const Cache = __src('utils/cache')

class CacheManager {

  init(site) {
    this._site = site
  }

  for(name) {
    name = 'sites/' + this._site.key + '/' + name

    return new Cache(name)
  }

}

module.exports = new CacheManager()

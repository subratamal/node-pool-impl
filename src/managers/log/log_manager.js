const Logger = require('./../../utils/logger')

class LogManager {

  init(site, link) {
    this._site = site
    this._link = link
  }

  for(name, options) {
    if (this._link) {
      name = `sites/${this._site.key}/${this._link.categoryLink}/${name}`
    } else {
      name = `sites/${this._site.key}/${name}`
    }

    return new Logger(name, options)
  }

}

module.exports = new LogManager()

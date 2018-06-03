const Logger = __src('utils/logger')

class LogManager {

  init(site) {
    this._site = site
  }

  for(name, options) {
    name = 'sites/' + this._site.key + '/' + name

    return new Logger(name, options)
  }

}

module.exports = new LogManager()

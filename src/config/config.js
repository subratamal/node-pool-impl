const lodash = require('lodash')
const toTime = require('to-time')

class Config {

  constructor(data, prefix = '') {
    this._data = data
    this._prefix = prefix
  }

  site(key) {
    const path = this.key('sites', key)

    return this.sub(path)
  }

  sub(path = '') {
    return new Config(this._data, this.key(path))
  }

  key(...key) {
    return lodash.compact(lodash.concat(this._prefix, key)).join('.')
  }

  get(key, defaultValue) {
    key = this.key(key)

    return lodash.get(this._data, key, defaultValue)
  }

  getNumber(key, defaultValue) {
    const value = +this.get(key)

    return lodash.isNaN(value) ? defaultValue : value
  }

  getTime(key, unit, defaultValue) {
    return this.toTime(this.get(key), unit, defaultValue)
  }

  toTime(value, unit, defaultValue) {
    try {
      return toTime(value)[unit]()
    } catch (error) {
      return defaultValue ? toTime(defaultValue)[unit]() : null
    }
  }

}

module.exports = Config

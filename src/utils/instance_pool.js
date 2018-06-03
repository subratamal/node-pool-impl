const lodash = require('lodash')

class InstancePool {

  constructor() {
    this._pool = {}
  }

  all() {
    return this._pool
  }

  get(key) {
    return this._pool[key] || null
  }

  has(key) {
    return !!this._pool[key]
  }

  put(key, instance) {
    this._pool[key] = instance
  }

  del(key) {
    this._pool = lodash.omit(this._pool, key)
  }

  clear() {
    this._pool = {}
  }

}

module.exports = InstancePool

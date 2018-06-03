const lodash = require('lodash')
const Config = __src('config')
const DataManager = __src('managers/data')
const CacheManager = __src('managers/cache')
const LogManager = __src('managers/log')
const TaskQueue = __src('utils/task_queue')

const DEFAULT_FLUSH_THRESHOLD = 50
const DEFAULT_COUNTING_FIELD = 'links_found'

class StatsManager {

  async init(site) {
    this._site = site
    this._cache = CacheManager.for('stats')
    this._logger = LogManager.for('site').sub('manager.stats')

    this._flushThreshold = this._getFlushThreshold()
    this._countingField = this._getCountingField()

    this._pending = 0
    this._queue = new TaskQueue({ name: 'stats_manager' })
    this._processing = false
    this._flushing = false

    await this._initCache()
  }

  async _initCache() {
    this._data = {}
    this._pending = 0

    const list = await this._cache.all()

    list.forEach(item => {
      this._data[item.key] = item.value
      this._updatePending(item.key.split('.')[1], item.value)
    })
  }

  async _clearCache() {
    const keys = lodash.keys(this._data)

    await this._cache.delBatch(keys)

    this._data = {}
    this._pending = 0
  }

  increaseField(...args) {
    return this._queue.exec(() => this._increaseField(...args))
  }

  async _increaseField(runId, field, increase = 1) {
    const key = `${runId}.${field}`
    const value = (this._data[key] || 0) + increase

    this._updatePending(field, increase)

    this._data[key] = value
    await this._cache.put(key, value)

    await this._tryFlushData()
  }

  _updatePending(field, value) {
    const shouldUpdate = !this._countingField ||
      lodash.snakeCase(field) === this._countingField

    if (shouldUpdate) {
      this._pending += value
    }
  }

  async flush() {
    await this._tryFlushData(true)
  }

  async _tryFlushData(force) {
    if (this._flushing) return

    this._flushing = true

    try {
      await this._flushData(force)
    } catch (error) {
      this._logger.error(error, 'flush data error')
    }

    this._flushing = false
  }

  async _flushData(force = false) {
    if (!force && this._pending < this._flushThreshold) return

    this._logger.debug({ force, pending: this._pending, data: this._data }, 'flush data')

    await this._updateDatabase()

    await this._clearCache()

    this._pending = 0
  }

  async _updateDatabase() {
    const data = {}

    lodash.forEach(this._data, (value, key) => {
      lodash.set(data, key, value)
    })

    const histories = lodash.map(data, (value, key) => ({
      runId: +key,
      fields: value
    }))

    await DataManager.updateHistories(histories)
  }

  _getFlushThreshold() {
    return Config.site(this._site.key).getNumber('stats.flush_threshold')
      || Config.getNumber('stats.flush_threshold')
      || DEFAULT_FLUSH_THRESHOLD
  }

  _getCountingField() {
    return Config.site(this._site.key).get('stats.counting_field')
      || Config.get('stats.counting_field')
      || DEFAULT_COUNTING_FIELD
  }

}

module.exports = new StatsManager()

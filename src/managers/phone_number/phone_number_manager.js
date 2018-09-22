const lodash = require('lodash')
const Config = require('./../../config')
const DataManager = require('./../../managers/data')
const CacheManager = require('./../../managers/cache')
const LogManager = require('./../../managers/log')
const AddressManager = require('./../../managers/address')
const StatsManager = require('./../../managers/stats')
const TaskQueue = require('./../../utils/task_queue')
const redisClient = require('managers/data/redis')
const commonHelpers = require('helpers/common')

const DEFAULT_FLUSH_THRESHOLD = 50

class PhoneNumberManager {

  async init(site) {
    this._site = site
    this._cache = CacheManager.for('phone_numbers')

    this._uniqueCacheKey = 'phone_numbers'
    this._cacheKeys = {
      phoneNumbers: CacheManager.key(`${this._uniqueCacheKey}`)
    }

    this._logger = LogManager.for('site').sub('manager.phone_number')

    this._flushThreshold = this._getFlushThreshold()

    this._pending = 0
    this._queue = new TaskQueue({ name: 'phone_number_manager' })
    this._processing = false
    this._flushing = false

    await this._initCache()
  }

  async _initCache() {
    this._data = {}
    this._pending = 0

    // let list = await this._cache.all()
    let list = []
    let phoneNumbers = await redisClient.hgetallAsync(this._cacheKeys.phoneNumbers)
    if (phoneNumbers && lodash.isObject(phoneNumbers)) {
      list = Object.keys(phoneNumbers).map(phoneNumber => {
        return {
          key: phoneNumber,
          value: commonHelpers.tryJSONParse(phoneNumbers[phoneNumber])
        }
      })
    }

    list.forEach(item => {
      this._data[item.key] = item.value
      this._pending += 1
    })
  }

  async _clearCache() {
    const keys = lodash.keys(this._data)

    // await this._cache.delBatch(keys)
    if (keys.length > 0) {
      await redisClient.hdelAsync(this._cacheKeys.phoneNumbers, ...keys)
    }

    this._data = {}
    this._pending = 0
  }

  insertPhoneNumber(...args) {
    return this._queue.exec(() => this._insertPhoneNumber(...args))
  }

  async _insertPhoneNumber(runId, data) {
    const { phoneNumber, fields, result } = this._toPhoneData(data)

    this._pending += 1

    const key = `${runId}.${phoneNumber}`

    const value = { runId, phoneNumber, fields, result }
    this._data[key] = value

    // this._cache.put(key, value)
    await redisClient.hsetAsync(this._cacheKeys.phoneNumbers, key, JSON.stringify(value))

    await this._tryFlushData()

    return result
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

    this._clearCache()

    this._pending = 0
  }

  _toPhoneData(data) {
    const {
      countryCode,
      cityName,
      areaName,
      districtName,
      phoneNumber
    } = data

    let cityId = null
    let areaId = null
    let districtId = null

    const toResult = result => {
      const fields = {
        countryCode: countryCode.toUpperCase(),
        cityId,
        areaId,
        districtId
      }

      return { result, phoneNumber, fields }
    }

    if (cityName) {
      const city = AddressManager.getCity(countryCode, cityName)

      if (!city){
        if (areaName && districtName) return toResult('111')
        return toResult(areaName ? '110' : '100')
      }

      cityId = city.id
    }

    if (cityName && areaName) {
      const area = AddressManager.getArea(cityId, areaName)

      if (!area) return toResult(districtName ? '011' : '010')

      areaId = area.id
    }

    if (cityName && areaName && districtName) {
      const district = AddressManager.getDistrict(areaId, districtName)

      if (!district) return toResult('001')

      districtId = district.id
    }

    return toResult('000')
  }

  async _updateDatabase() {
    const items = lodash.values(this._data)

    const phoneNumbers = lodash.uniq(lodash.map(items, 'phoneNumber'))
    const existingPhoneNumbers = await DataManager.fetchPhoneNumbers(phoneNumbers)

    const updatingStats = await this._buildStats(items, existingPhoneNumbers)
    const updatingPhoneNumbers = this._buildPhoneNumbers(items, existingPhoneNumbers)

    if (!lodash.isEmpty(updatingPhoneNumbers)) {
      await DataManager.insertPhoneNumbers(updatingPhoneNumbers)
    }

    for (const item of updatingStats) {
      await StatsManager.increaseField(item.runId, item.field, item.value)
    }
  }

  _buildPhoneNumbers(items, existingPhoneNumbers) {
    let rows = items.map(item => lodash.assign({
      phoneNumber: item.phoneNumber
    }, item.fields))

    rows = rows.filter((row) => {
      const oldRow = existingPhoneNumbers[row.phoneNumber]

      if (!oldRow) return true
      if (!oldRow.cityId && row.cityId) return true
      if (+oldRow.cityId !== +row.cityId) return false

      if (!oldRow.areaId && row.areaId) return true
      if (+oldRow.areaId !== +row.areaId) return false

      if (!oldRow.districtId && row.districtId) return true
      return false
    })

    return rows
  }

  async _buildStats(items, existingPhoneNumbers) {
    items = lodash.uniqBy(items, 'phoneNumber')

    const uniqueCount = {}

    items.forEach((item) => {
      if (existingPhoneNumbers[item.phoneNumber]) return

      if (!uniqueCount[item.runId]) uniqueCount[item.runId] = 0
      uniqueCount[item.runId] += 1
    })

    const stats = lodash.map(uniqueCount, (value, runId) => ({
      runId: +runId,
      field: 'numbers_unique',
      value
    }))

    return stats
  }

  _getFlushThreshold() {
    return Config.site(this._site.key).getNumber('phone_number.flush_threshold')
      || Config.getNumber('phone_number.flush_threshold')
      || DEFAULT_FLUSH_THRESHOLD
  }

}

module.exports = new PhoneNumberManager()

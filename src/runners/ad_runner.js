const lodash = require('lodash')
const CacheManager = require('managers/cache')
const LogManager = require('managers/log')
const ProxyManager = require('managers/proxy')
const HistoryManager = require('managers/history')
const StatsManager = require('managers/stats')
const PhoneNumberManager = require('managers/phone_number')
const commonHelpers = require('helpers/common')

const MAX_RETRIES = 10

class AdRunner {

  constructor(options) {
    this._options = options

    this._ad = options.ad
    this._adId = commonHelpers.toId(options.ad)

    this._cache = CacheManager.for('ads')

    this._logger = LogManager.for('site').sub('runner.ad', {
      ad: this._ad
    })

    const logOptions = {
      fileOnly: true
    }

    this._phoneErrorLogger = LogManager.for('phone_error', logOptions)
    this._phoneNonMatchLogger = LogManager.for('phone_nonmatch', logOptions)
    this._phoneInsertedLogger = LogManager.for('phone_inserted', logOptions)
  }

  async run() {
    const runId = HistoryManager.runId
    const isDuplicate = await this._run()

    await StatsManager.increaseField(runId, 'links_found')

    if (isDuplicate === true) return

    await StatsManager.increaseField(runId, 'links_unique')
    await this._cache.put(this._adId, 1)
  }

  async _run() {
    this._logger.debug('fetching ad')

    const isDuplicate = await this._isDuplicateAd()

    if (isDuplicate) {
      this._logger.debug('duplicate')
      return true
    }

    const adInfo = await this._tryFetchAdInfo()

    if (!adInfo) {
      this._logger.debug('no ad info')
      return false
    }

    await this._insertPhoneNumbers(adInfo)
    return false
  }

  _tryFetchAdInfo() {
    return ProxyManager.pool('ad').session({
      run: proxy => this._fetchAdInfo(this._ad, proxy),
      retries: MAX_RETRIES,
      onError: (error) => {
        this._logger.error(error, 'fetch ad error -> retry')
      }
    })
  }

  _fetchAdInfo(ad, proxy) {
    return this._options.fetchAd({
      ad,
      proxy,
      logger: this._logger
    })
  }

  async _isDuplicateAd() {
    const ad = await this._cache.get(this._adId)
    return !!ad
  }

  async _insertPhoneNumbers(adInfo) {
    // NOTE:
    // - adInfo format: { phoneNumbers: [], address }

    let { address, phoneNumbers } = adInfo

    address = this._standardAddress(address)

    phoneNumbers = phoneNumbers
      .map(raw => {
        const phoneNumber = +this._standardPhoneNumber(raw)

        if (!phoneNumber) {
          this._logger.debug({ adInfo, phoneNumber: raw }, 'skip phone number')
        }

        return phoneNumber
      })
      .filter(phoneNumber => phoneNumber)


    if (lodash.isEmpty(address) || lodash.isEmpty(phoneNumbers)) {
      this._logger.debug({ adInfo }, 'skip ad')
      return
    }

    for (const phoneNumber of phoneNumbers) {
      await this._insertPhoneNumber(phoneNumber, address)
    }
  }

  async _insertPhoneNumber(phoneNumber, address) {
    const ad = this._ad
    const runId = HistoryManager.runId

    const addressResult = address.result || null
    address = lodash.omit(address, 'result')

    const data = lodash.assign({ phoneNumber }, address)

    try {
      await StatsManager.increaseField(runId, 'numbers_found')

      const insertResult = await PhoneNumberManager.insertPhoneNumber(runId, data)
      const matchResult = addressResult || insertResult

      const matcher = this._options.match

      let isUnmatch = matchResult !== '000'

      if (isUnmatch) {
        if (lodash.isArray(matcher)) {
          isUnmatch = !matcher.includes(matchResult)
        } else if (lodash.isFunction(matcher)) {
          isUnmatch = !matcher(matchResult, data)
        }
      }

      if (isUnmatch) {
        this._phoneNonMatchLogger.info({
          result: insertResult,
          match: matchResult,
          phoneNumber,
          address,
          ad
        })

        await StatsManager.increaseField(runId, 'numbers_non_matched')
      }

      this._phoneInsertedLogger.info({
        result: insertResult,
        match: matchResult,
        phoneNumber,
        address,
        ad
      }, 'phone number inserted')
    } catch (error) {
      this._logger.error({
        err: error,
        phoneNumber,
        address
      }, 'insert phone number error')

      this._phoneErrorLogger.error({
        err: error,
        phoneNumber,
        address,
        ad
      })
    }
  }

  _standardPhoneNumber(raw) {
    return this._options.standardPhoneNumber(raw)
  }

  _standardAddress(raw) {
    return this._options.standardAddress(raw)
  }

}

module.exports = AdRunner

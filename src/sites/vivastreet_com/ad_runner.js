const lodash = require('lodash')
const AdRunner = __src('runners/ad_runner')
const frHelpers = __src('helpers/fr')
const helpers = require('./helpers')

const IGNORE_CITY_NAMES = prepareIgnoreCityNames(require('./constants/ignore_city_names'))

module.exports = createAdRunner

function createAdRunner({ ad }) {
  const runner = new AdRunner({
    ad,
    fetchAd,
    standardPhoneNumber,
    standardAddress
  })

  return runner
}

async function fetchAd({ ad, proxy, logger }) {
  const html = await proxy.request({
    uri: ad.url
  })

  const adInfo = helpers.adInfo(html)
  if (!adInfo) return null

  let phoneNumber = adInfo.phoneNumber

  if (!phoneNumber && adInfo.phoneUrl) {
    await Promise.delay(2000)

    const phoneRaw = await proxy.request({
      uri: adInfo.phoneUrl
    })

    try {
      phoneNumber = phoneRaw.replace.replace(/(^\(|\)$)/g, '').trim()
      phoneNumber = JSON.parse(phoneNumber)
      phoneNumber = lodash.get(phoneNumber, 'call_data.premium_number')
    } catch (error) {
      // malformed phone raw
    }

    if (!phoneNumber) {
      logger.warn({ ad, raw: phoneRaw }, 'invalid phone number')
    }
  }

  if (!phoneNumber) return null

  return {
    address: adInfo.address,
    phoneNumbers: [phoneNumber]
  }
}

function standardPhoneNumber(raw) {
  return frHelpers.standardPhoneNumber(raw)
}

function standardAddress(raw) {
  const address = {
    raw,
    countryCode: frHelpers.COUNTRY_CODE,
    cityName: raw[0] || null,
    areaName: raw[1] || null,
    districtName: raw[3] || raw[2] || null
  }

  if (IGNORE_CITY_NAMES.includes(lodash.lowerCase(address.cityName))) {
    address.cityName = null
    address.result = '000'

    return address
  }

  if (address.districtName) {
    // split district name
    // e.g: Rennes - 35000 => [Rennes, 35000]
    const match = address.districtName.match(/^(.+?)\s+-\s+(\d{5})$/)

    if (match) {
      address.districtName = frHelpers.standardDistrictName(match[1], match[2])
    }
  }

  return address
}

function prepareIgnoreCityNames(cityNames) {
  return cityNames.map(lodash.lowerCase)
}

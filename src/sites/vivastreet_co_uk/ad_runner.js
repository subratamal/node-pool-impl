const lodash = require('lodash')
const AdRunner = __src('runners/ad_runner')
const helpers = require('./helpers')
const { standardPhoneNumber, standardAddress } = require('./helpers/standard')

module.exports = createAdRunner

function createAdRunner({ ad }) {
  const runner = new AdRunner({
    ad,
    match: ['001'],
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

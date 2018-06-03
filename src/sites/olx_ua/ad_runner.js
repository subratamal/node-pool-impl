const lodash = require('lodash')
const AdRunner = __src('runners/ad_runner')
const uaHelpers = __src('helpers/ua')
const helpers = require('./helpers')

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

async function fetchAd({ ad, proxy }) {
  const adInfo = await fetchAdInfo({ ad, proxy })
  if (!adInfo) return null

  const { address, phoneToken } = adInfo

  // delay fetch phone number
  await Promise.delay(5000)

  const phoneNumbers = await fetchPhoneNumbers({ ad, phoneToken, proxy })

  if (lodash.isEmpty(phoneNumbers)) return null

  return { address, phoneNumbers }
}

function standardPhoneNumber(raw) {
  return uaHelpers.standardPhoneNumber(raw)
}

function standardAddress(raw) {
  const address = [raw[1], raw[0], raw[2]]

  return uaHelpers.standardAddress(address)
}

async function fetchAdInfo({ ad, proxy }) {
  const html = await proxy.request({
    uri: ad.url
  })

  return helpers.adInfo(html)
}

async function fetchPhoneNumbers({ ad, phoneToken, proxy }) {
  const phoneUrl = `${helpers.BASE_URL}/ajax/misc/contact/phone/${ad.id}/`

  const data = await proxy.request({
    uri: phoneUrl,
    headers: {
      'Referer': ad.url,
      'X-Requested-With': 'XMLHttpRequest'
    },
    qs: {
      pt: phoneToken
    },
    json: true
  })

  const phoneNumbers = helpers.adPhoneNumbers(data)

  return phoneNumbers
}

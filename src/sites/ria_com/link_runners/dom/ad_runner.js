const lodash = require('lodash')
const AdRunner = __src('runners/ad_runner')
const uaHelpers = __src('helpers/ua')
const riaHelpers = require('../../helpers')
const helpers = require('./helpers')

module.exports = createAdRunner

function createAdRunner({ ad }) {
  const runner = new AdRunner({
    ad,
    match: ['001', '011'],
    fetchAd,
    standardPhoneNumber,
    standardAddress
  })

  return runner
}

async function fetchAd({ ad, proxy, logger }) {
  const url = await fetchAdUrl({ ad, proxy })

  if (!url) {
    logger.warn({ ad }, 'invalid ad url')
    return null
  }

  const adInfo = await fetchAdInfo({ ad, url, proxy })

  return adInfo
}

function standardPhoneNumber(raw) {
  return uaHelpers.standardPhoneNumber(raw)
}

function standardAddress(raw) {
  return riaHelpers.standardAddress(raw)
}

async function fetchAdUrl({ ad, proxy }) {
  const data = await proxy.request({
    baseUrl: helpers.BASE_URL,
    uri: '/node/searchEngine/v2/view/realty/' + ad.id,
    qs: {
      'lang_id': 2
    },
    json: true
  })

  let adUrl = lodash.get(data, 'beautiful_url') || null

  if (adUrl) {
    adUrl = `${helpers.BASE_URL}/ru/${adUrl}`
  }

  return adUrl
}

async function fetchAdInfo({ url, proxy }) {
  // delay fetch ad info
  await Promise.delay(2000)

  const html = await proxy.request({
    uri: url
  })

  const adInfo = helpers.adInfo(html)

  if (!adInfo) return null

  // delay fetch phone number
  await Promise.delay(3000)

  const phoneNumbers = await fetchPhoneNumbers({ adInfo, proxy })

  if (lodash.isEmpty(phoneNumbers)) return null

  return {
    address: adInfo.address,
    phoneNumbers
  }
}

async function fetchPhoneNumbers({ adInfo, proxy }) {
  const data = await proxy.request({
    baseUrl: helpers.BASE_URL,
    uri: '/node/api/getOwnerAndAgencyDataByIds',
    qs: {
      'userId': adInfo.userId,
      '_csrf': adInfo.csrfToken,
      'agencyId': 0,
      'langId': 2
    },
    json: true
  })

  return helpers.adPhoneNumbers(data)
}

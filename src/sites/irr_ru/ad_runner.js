const AdRunner = __src('runners/ad_runner')
const ruHelpers = __src('helpers/ru')
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
  const html = await proxy.request({
    uri: ad.url
  })

  return helpers.adInfo(html)
}

function standardPhoneNumber(raw) {
  return ruHelpers.standardPhoneNumber(raw)
}

function standardAddress(raw) {
  return {
    raw,
    countryCode: ruHelpers.COUNTRY_CODE,
    cityName: 'Московская область',
    areaName: 'Москва',
    districtName: raw.districtName || null
  }
}

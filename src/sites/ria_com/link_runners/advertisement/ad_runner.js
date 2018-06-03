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

async function fetchAd({ ad, proxy }) {
  const html = await proxy.request({
    uri: ad.url
  })

  return helpers.adInfo(html)
}

function standardPhoneNumber(raw) {
  return uaHelpers.standardPhoneNumber(raw)
}

function standardAddress(raw) {
  return riaHelpers.standardAddress(raw)
}

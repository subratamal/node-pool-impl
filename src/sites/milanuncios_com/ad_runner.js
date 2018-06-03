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

async function fetchAd({ ad, proxy }) {
  const html = await proxy.request({
    baseUrl: helpers.BASE_URL,
    uri: '/datos-contacto/',
    qs: {
      'id': ad.id,
      'usePhoneProxy': ad.usePhoneProxy
    }
  })

  const adInfo = helpers.adInfo(html)
  if (!adInfo) return null

  return {
    address: ad.address,
    phoneNumbers: adInfo.phoneNumbers
  }
}

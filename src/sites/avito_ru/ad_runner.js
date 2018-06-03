const lodash = require('lodash')
const AdRunner = __src('runners/ad_runner')
const tesseract = __src('utils/tesseract')
const helpers = require('./helpers')
const siteFns = require('./helpers/site_fns')
const { standardAddress, standardPhoneNumber } = require('./helpers/standard')

module.exports = createAdRunner

function createAdRunner({ ad }) {
  const runner = new AdRunner({
    ad,
    match: ['010', '001'],
    fetchAd,
    standardPhoneNumber,
    standardAddress
  })

  return runner
}

async function fetchAd({ ad, proxy }) {
  const adInfo = await fetchAdInfo({ ad, proxy })
  if (!adInfo) return null

  const { address, phoneToken, searchHash } = adInfo

  // delay fetch phone number
  await Promise.delay(5000)

  const phoneNumbers = await fetchPhoneNumbers({ ad, proxy, phoneToken, searchHash })

  if (lodash.isEmpty(phoneNumbers)) return null

  return { address, phoneNumbers }
}

async function fetchAdInfo({ ad, proxy }) {
  const html = await proxy.request({
    uri: ad.url
  })

  return helpers.adInfo(html)
}

async function fetchPhoneNumbers({ ad, proxy, phoneToken, searchHash }) {
  searchHash = searchHash || ''

  const pkey = siteFns.honeDemixer(ad.id, phoneToken)

  const data = await proxy.request({
    headers: {
      'Referer': ad.url
    },
    baseUrl: helpers.BASE_URL,
    uri: `/items/phone/${ad.id}`,
    qs: {
      'pkey': pkey,
      'searchHash': searchHash,
      'retina': 1,
      'vsrc': 't'
    },
    json: true
  })

  if (lodash.isString(data)) {
    helpers.checkBanned(data)
  }

  if (data.error) return null
  if (!data['image64']) return null

  const img = data['image64'].split(';base64,')[1]

  if (lodash.isEmpty(img)) return null

  const buffer = new Buffer(img, 'base64')

  const result = await tesseract.process(buffer)

  const phoneNumber = lodash.trim(result.stdout) || null

  return phoneNumber ? [phoneNumber] : null
}
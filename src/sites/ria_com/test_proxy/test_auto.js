const { createRequest } = __src('managers/proxy/helpers')
const helpers = require('../helpers')
const autoHelpers = require('../link_runners/auto/helpers')

module.exports = testAuto

async function testAuto(proxy) {
  const req = createRequest(proxy)

  const listUrl = autoHelpers.buildUrl({
    link: { categoryId: 1 },
    page: 1
  })

  const html = await req.get(listUrl)

  const ads = helpers.listAds(html)

  for (const ad of ads) {
    const ok = await testAd(req, ad.url)
    if (ok) return
  }

  throw new Error('All ads fetched but no phone number found')
}

async function testAd(req, adUrl) {
  const html = req.get(adUrl)

  const adInfo = helpers.adInfo(html)

  return !!adInfo
}

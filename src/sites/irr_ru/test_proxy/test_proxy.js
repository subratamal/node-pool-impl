const { createRequest } = __src('managers/proxy/helpers')
const helpers = require('../helpers')

module.exports = testProxy

async function testProxy(proxy) {
  const req = createRequest(proxy)

  const url = 'https://russia.irr.ru/real-estate/apartments-sale/search/tab=users/'

  const html = await req.get(url)

  helpers.listResults(html)
  helpers.listAds(html)
}

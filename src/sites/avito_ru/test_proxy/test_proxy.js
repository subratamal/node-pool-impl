const { createRequest } = __src('managers/proxy/helpers')
const helpers = require('../helpers')

module.exports = testProxy

async function testProxy(proxy) {
  const req = createRequest(proxy)

  const url = 'https://www.avito.ru/rossiya?user=1'

  const html = await req.get(url)

  helpers.checkBanned(html)
}

const { createRequest } = __src('managers/proxy/helpers')
const { MalformedResponseError } = __src('runners/errors')
const helpers = require('../helpers')

module.exports = async function(proxy) {
  const url = 'https://www.olx.ua/detskiy-mir/?search%5Bprivate_business%5D=private'
  const keyword = 'Сайт бесплатных объявлений OLX.ua'

  const req = createRequest(proxy)

  const html = await req.get(url)

  if (html.includes('</html>') && !html.includes(keyword)) {
    throw new MalformedResponseError(html, 'no keyword')
  }

  helpers.countListResults(html)
}

const lodash = require('lodash')
const ListRunner = __src('runners/list_runner')
const helpers = require('./helpers')

module.exports = createListRunner

async function createListRunner({ link, price, listInfo }) {
  const runner = new ListRunner({
    link: { link, price },
    pages: listInfo.pages,
    fetchPageAds
  })

  return runner
}

async function fetchPageAds({ link, page, proxy }) {
  const url = helpers.buildUrl({ link: link.link, price: link.price, page })
  const jar = proxy.jar(helpers.buildCookies())

  const data = await proxy.request(lodash.assign({
    jar,
    json: true
  }, url))

  return helpers.listAds(data)
}

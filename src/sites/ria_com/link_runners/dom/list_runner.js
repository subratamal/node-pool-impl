const lodash = require('lodash')
const ListRunner = __src('runners/list_runner')
const helpers = require('./helpers')

module.exports = createListRunner

async function createListRunner({ link }) {
  const runner = new ListRunner({
    link,
    fetchPages,
    fetchPageAds
  })

  return runner
}

async function fetchPages({ link, proxy }) {
  const url = helpers.buildUrl({ link })

  const data = await proxy.request(lodash.assign({
    json: true
  }, url))

  return helpers.countListPages(data)
}

async function fetchPageAds({ link, page, proxy }) {
  const url = helpers.buildUrl({ link, page })

  const data = await proxy.request(lodash.assign({
    json: true
  }, url))

  return helpers.listAds(data)
}

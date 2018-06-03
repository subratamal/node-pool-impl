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

  const html = await proxy.request(url)

  return helpers.countListPages(html)
}

async function fetchPageAds({ link, page, proxy }) {
  const url = helpers.buildUrl({ link, page })

  const html = await proxy.request(url)

  return helpers.listAds(html, { page })
}

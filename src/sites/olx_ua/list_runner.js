const ListRunner = require('../../runners/list_runner')
const helpers = require('./helpers')

module.exports = createListRunner

async function createListRunner({ link, price, listInfo }) {
  const runner = new ListRunner({
    link: { link, price },
    pages: listInfo ? listInfo.pages : null,
    fetchPages,
    fetchPageAds
  })

  return runner
}

async function fetchPages({ link, proxy }) {
  const url = helpers.buildUrl(link)

  const html = await proxy.request(url)

  return helpers.countListPages(html)
}

async function fetchPageAds({ link, pageIndex, proxy }) {
  const url = helpers.buildUrl({ link: link.link, price: link.price, pageIndex })

  const html = await proxy.request(url)

  return helpers.listAds(html, { pageIndex })
}

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
  const url = helpers.buildListUrl({ link: link.link, price: link.price, page })

  const html = await proxy.request(url)

  return helpers.listAds(html, { page })
}

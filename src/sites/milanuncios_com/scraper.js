const createPriceRangeRunner = require('./price_range_runner')
const createAdRunner = require('./ad_runner')

module.exports = {
  siteRunner: createSiteRunner,
  adRunner: createAdRunner,
  proxy: {
    delay: [20, 30]
  }
}

function createSiteRunner() {
  const link = {
    path: '/anuncios/',
    params: { vendedor: 'part' }
  }

  return createPriceRangeRunner({ link })
}

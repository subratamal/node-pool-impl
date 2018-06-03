const createListRunner = require('./list_runner')
const createAdRunner = require('./ad_runner')

module.exports = {
  siteRunner: createSiteRunner,
  adRunner: createAdRunner
}

function createSiteRunner() {
  const link = { path: '/classifieds/gb' }

  return createListRunner({ link })
}

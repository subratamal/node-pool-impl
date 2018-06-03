const lodash = require('lodash')
const LinksRunner = __src('runners/links_runner')
const createListRunner = require('./list_runner')
const createAdRunner = require('./ad_runner')

const LINKS = require('./constants/links')

module.exports = {
  siteRunner: createSiteRunner,
  adRunner: createAdRunner
}

function createSiteRunner() {
  const runner = new LinksRunner({
    links: getLinks(),
    linkRunner: createListRunner
  })

  return runner
}

function getLinks() {
  const links = []

  lodash.forEach(LINKS, link => {
    links.push({ path: link })
  })

  return links
}

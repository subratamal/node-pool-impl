const lodash = require('lodash')
const LinksRunner = __src('runners/links_runner')
const commonHelpers = __src('helpers/common')
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
    link = commonHelpers.parseLink(link)

    links.push({ category: link.path, params: link.params })
  })

  return links
}

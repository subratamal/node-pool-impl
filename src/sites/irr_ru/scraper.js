const LinksRunner = require('./../../runners/links_runner')
const createListRunner = require('./list_runner')
const createAdRunner = require('./ad_runner')

const LINKS = require('./constants/links')

module.exports = {
  siteRunner: createSiteRunner,
  adRunner: createAdRunner
}

function createSiteRunner(link) {
  const runner = new LinksRunner({
    link,
    links: getLinks(),
    linkRunner: createListRunner
  })

  return runner
}

function getLinks() {
  const links = []

  LINKS.map(link => {
    links.push({ path: link })
  })

  return links
}

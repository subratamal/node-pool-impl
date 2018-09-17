// const lodash = require('lodash')
const LinksRunner = require('./../../runners/links_runner')
const commonHelpers = require('./../../helpers/common')
const createPriceRangeRunner = require('./price_range_runner')
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
    linkRunner: createLinkRunner
  })

  return runner
}

function createLinkRunner({ link }) {
  const runner = link.single
    ? createListRunner({ link })
    : createPriceRangeRunner({ link })

  return runner
}

function getLinks() {
  const links = []

  LINKS.price_range.map(link => {
    links.push({ category: link })
  })

  LINKS.single.map(link => {
    link = commonHelpers.parseLink(link)

    links.push({ category: link.path, params: link.params, single: true })
  })

  return links
}

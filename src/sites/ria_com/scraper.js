const lodash = require('lodash')
const LinksRunner = require('./../../runners/links_runner')
const createAutoLinkRunner = require('./link_runners/auto')
const createDomLinkRunner = require('./link_runners/dom')
const createAdvertisementLinkRunner = require('./link_runners/advertisement')
const createAutoAdRunner = require('./link_runners/auto/ad_runner')
const createDomAdRunner = require('./link_runners/dom/ad_runner')
const createAdvertisementAdRunner = require('./link_runners/advertisement/ad_runner')

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
  let runner

  if (link.type === 'auto') {
    runner = createAutoLinkRunner({ link })
  } else if (link.type === 'dom') {
    runner = createDomLinkRunner({ link })
  } else if (link.type === 'advertisement') {
    runner = createAdvertisementLinkRunner({ link })
  }

  return runner
}

function createAdRunner({ ad }) {
  let runner

  if (ad.type === 'auto') {
    runner = createAutoAdRunner({ ad })
  } else if (ad.type === 'dom') {
    runner = createDomAdRunner({ ad })
  } else if (ad.type === 'advertisement') {
    runner = createAdvertisementAdRunner({ ad })
  }

  return runner
}

function getLinks() {
  const links = []

  lodash.forEach(LINKS.auto, link => {
    links.push({ categoryId: link, type: 'auto' })
  })

  lodash.forEach(LINKS.dom, link => {
    links.push({ categoryId: link, type: 'dom' })
  })

  lodash.forEach(LINKS.advertisement, link => {
    links.push({ categoryId: link, type: 'advertisement' })
  })

  return links
}

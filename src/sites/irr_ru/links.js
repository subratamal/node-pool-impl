const LINKS = require('./constants/links')
const commonHelpers = require('../../helpers/common')

module.exports = {
  tryFetchLinks: tryFetchLinks,
  links: getLinks(),
  addCategoryLinkLabel
}

async function tryFetchLinks(options, { logger }) {
  const { links, fetchLinks } = options

  if (Array.isArray(links)) {
    return links
  }

  if (!lodash.isFunction(fetchLinks)) {
    return []
  }

  do {
    try {
      return await fetchLinks({ logger })
    } catch (error) {
      logger.error(error, 'fetch links error -> retry')
      await Promise.delay(1000)
    }
  } while (true)
}

function getLinks() {
  const links = []

  LINKS.map(link => {
    links.push({ path: link })
  })

  return links
}

function addCategoryLinkLabel(links) {
  return links.map(link => {
    return {
      categoryLink: commonHelpers.standardName(link.path),
      ...link
    }
  })
}

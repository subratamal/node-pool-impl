const LINKS = require('./constants/links')

module.exports = {
  tryFetchLinks: tryFetchLinks,
  links: getLinks()
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

function addCategoryLinkLabel(links) {
  return links.map(link => {
    return {
      categoryLink: commonHelpers.standardName(`${link.categoryId}_${link.type}`),
      ...link
    }
  })
}

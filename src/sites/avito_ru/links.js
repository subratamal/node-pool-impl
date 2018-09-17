const lodash = require('lodash')
const ProxyManager = require('./../../managers/proxy')
const helpers = require('./helpers')
const commonHelpers = require('./../../helpers/common')

module.exports = {
  tryFetchLinks: tryFetchLinks,
  fetchLinks,
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

async function fetchLinks(...args) {
  const categories = await getCategoryLinks('/rossiya', ...args)

  const tasks = categories.map(link => getCategoryLinks(link, ...args))

  const subcategories = await Promise.all(tasks)

  const links = lodash.flatten(subcategories).map(link => ({
    url: link
  }))

  return links
}

function getCategoryLinks(url, {
  logger
}) {
  return ProxyManager.pool('list').session({
    async run(proxy) {
      const html = await proxy.request(helpers.buildCategoryUrl(url))

      return helpers.getCategoryLinks(html)
    },
    onError(error) {
      logger.error({
        err: error,
        url
      }, 'unable to get links')
    }
  })
}

function addCategoryLinkLabel(links) {
  return links.map(link => {
    return {
      categoryLink: commonHelpers.standardName(link.url),
      ...link
    }
  })
}

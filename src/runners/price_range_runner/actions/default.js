const lodash = require('lodash')

module.exports = function({
  listInfo,
  lastListInfo = null,
  price,
  minResults,
  maxResults
}) {
  // NOTE:
  // - listInfo is whatever returned from PriceRangeRunner({ listInfo }) function
  // - valid returns: gear_up, gear_down, scrape, skip

  const results = listInfo.results
  const lastResults = lodash.get(lastListInfo, 'results', 0)

  if (results < minResults) {
    if (lastResults && lastResults > maxResults) return 'scrape'
    // if this is the last gear so it should start the cycle even if results < minResults
    if (lastResults && !price.hasNextGear()) return 'scrape'

    return 'gear_up'
  }

  if (results > maxResults) {
    if (lastResults && lastResults < minResults) return 'scrape'
    if (price.level === 1) return 'scrape'

    return 'gear_down'
  }

  return 'scrape'
}

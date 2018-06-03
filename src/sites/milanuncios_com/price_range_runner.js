const PriceRangeRunner = __src('runners/price_range_runner')
const defaultAction = __src('runners/price_range_runner/actions/default')
const createListRunner = require('./list_runner')
const helpers = require('./helpers')

const PRICE_GEARS = require('./constants/price_gears')
const PRICE_MAX = 99000000
const RESULTS_MIN = 600
const RESULTS_MAX = 6000

module.exports = createPriceRangeRunner

function createPriceRangeRunner({ link }) {
  const price = {
    gears: PRICE_GEARS,
    max: PRICE_MAX
  }

  const runner = new PriceRangeRunner({
    link,
    price,
    fetchListInfo,
    listAction,
    listRunner
  })

  return runner
}

async function fetchListInfo({ link, price, proxy }) {
  const url = helpers.buildUrl({ link, price })

  const html = await proxy.request(url)

  const { error, results, pages } = helpers.listResults(html)

  return { error, results, pages, url }
}

async function listAction({ listInfo, lastListInfo = null, price }) {
  if (listInfo.error) {
    return { inc: { start: 1 }, keep: { start: true, end: true }  }
  }

  return defaultAction({
    listInfo,
    lastListInfo,
    price,
    minResults: RESULTS_MIN,
    maxResults: RESULTS_MAX
  })
}

async function listRunner({ link, price, listInfo }) {
  const runner = await createListRunner({
    link,
    price,
    listInfo
  })

  return runner
}

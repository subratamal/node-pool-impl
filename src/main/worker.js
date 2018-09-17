require('../utils/boot')

const lodash = require('lodash')
const Logger = __src('utils/logger')
const SiteRunner = require('./../runners/site_runner')

let logger

console.log(`Worker started with pid ${process.pid}`)

start()

async function start() {
  const args = getArgs()

  const { site, links_parallel_run } = args

  logger = new Logger(`sites/${site.key}/site`).sub('worker')

  if (lodash.isEmpty(site)) {
    logger.warn(args, 'invaid args')
    process.exit(1)
  }

  const onUncaughtError = (error) => {
    logger.error(error, 'uncaught error')
    process.exit(1)
  }

  process.on('uncaughtException', onUncaughtError)

  process.on('unhandledRejection', (reason, p) => {
    logger.error({ err: reason, p }, 'unhandledRejection worker')
  })

  try {
    await runWorker(args)

    process.exit(0)
  } catch (error) {
    onUncaughtError(error)
  }
}

async function runWorker(args) {
  const { site } = args

  // const options = __src('sites', site.key, 'scraper.js')
  const options = require(`./../sites/${site.key}/scraper`)

  const scraper = new SiteRunner(site, options)
  await scraper.run()
}

function getArgs() {
  try {
    return JSON.parse(process.argv[2])
  } catch (error) {
    return {}
  }
}

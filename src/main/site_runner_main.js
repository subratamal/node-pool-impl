require('../utils/boot')

const SiteRunner = require('runners/site_runner')
const Logger = require('./../utils/logger')
const lodash = require('lodash')

let logger

trySiteRunnerMain()

async function trySiteRunnerMain() {
  const args = getArgs()
  const {site, link = {}} = args

  logger = new Logger(`sites/${site.key}/site/${link.categoryLink}`).sub('worker')

  if (lodash.isEmpty(site) || lodash.isEmpty(link)) {
    logger.warn(args, 'invalid args')
    process.exit(1)
  }

  const onUncaughtError = (error) => {
    logger.error(error, 'uncaught error')
    process.exit(1)
  }

  process.on('uncaughtException', onUncaughtError)

  process.on('unhandledRejection', (reason, p) => {
    logger.error({
      err: reason,
      p
    }, 'unhandledRejection worker')
  })

  try {
    await siteRunnerMain(args)

    // Category scraping completed. Signal to the main process.
    process.send({
      message: 'WORKER_TASK_COMPLETED',
      pid: process.pid
    })
  } catch (error) {
    onUncaughtError(error)
  }
}

async function siteRunnerMain({site, link} = {}) {
  const options = require(`./../sites/${site.key}/scraper`)
  const scraper = new SiteRunner(site, link, options)
  await scraper.run()
}

function getArgs() {
  try {
    return JSON.parse(process.argv[2])
  } catch (error) {
    return {}
  }
}

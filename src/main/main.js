require('../utils/boot')

const path = require('path')
const fs = require('fs-extra')
const Config = __src('config')
const DataManager = __src('managers/data')
const Logger = __src('utils/logger')
const Monitor = require('./monitor')

const logger = new Logger('main')

tryStart()

async function tryStart() {
  logger.info('started')

  process.on('unhandledRejection', (reason, p) => {
    logger.error({ err: reason, p }, 'unhandledRejection main')
  })

  try {
    await start({ logger })

    logger.info('finished')
    process.exit(0)
  } catch (error) {
    logger.error(error, 'uncaught error')
    process.exit(1)
  }
}

async function start() {
  const sites = await DataManager.fetchSites()

  const tasks = sites.map(runWorker)

  await Promise.all(tasks)
}

async function runWorker(site) {
  const supported = await checkScraper(site)

  if (!supported) {
    logger.warn({ site: site.domain }, 'unsupported site')
    return
  }

  const monitor = new Monitor(site)

  await monitor.run()
}

async function checkScraper(site) {
  const disabled = Config.site(site.key).get('disabled', false)
  if (disabled) return false

  const file = path.join(__base, 'src/sites', site.key, 'scraper.js')

  return await fs.pathExists(file)
}

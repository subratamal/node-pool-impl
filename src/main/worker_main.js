require('../utils/boot')

const path = require('path')
const { hmsetAsync } = require('managers/data/redis')
const lodash = require('lodash')
const Logger = require('utils/logger')
const NodeWorkerPool = require('./worker_pool')
const ProxyPool = require('managers/proxy')
const LogManager = require('managers/log')
const { LINK_RUNNING_STATE } = require('runners/constants')

let logger
const SITE_RUNNER_WORKER = path.join(__dirname, './site_runner_main.js')

console.log(`Worker started with pid ${process.pid}`)

start()

async function start() {
  const args = getArgs()

  const { site } = args

  logger = new Logger(`sites/${site.key}/site`).sub('worker')

  if (lodash.isEmpty(site)) {
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
    await runWorker(args, logger)

    process.exit(0)
  } catch (error) {
    onUncaughtError(error)
  }
}

async function runWorker(args, logger) {
  const { site } = args

  await LogManager.init(site)
  await ProxyPool.init(site)

  // const options = __src('sites', site.key, 'scraper.js')
  const options = require(`./../sites/${site.key}/links`)
  let { links, fetchLinks, tryFetchLinks, addCategoryLinkLabel } = options
  links = await tryFetchLinks({ links, fetchLinks }, { logger })
  categoryLinks = addCategoryLinkLabel(links)

  const categoryHMLinks = []
  categoryLinks.map(link => {
    categoryHMLinks.push(link.categoryLink, LINK_RUNNING_STATE.NOT_PROCESSED)
  })

  const siteKey = `site:${site.key}`
  await hmsetAsync(siteKey, categoryHMLinks)

  await initSiteRunnerPool(site, categoryLinks, logger)
}

async function initSiteRunnerPool(site, categoryLinks, logger) {
  const args = process.env.NODE_ENV === 'production' ?
    ['--max-old-space-size=8196', '--nouse-idle-notification'] : []

  const nodeWorkerPool = new NodeWorkerPool(SITE_RUNNER_WORKER, args, {}, {
		size: categoryLinks.length,
		taskCompletedMsg: 'WORKER_TASK_COMPLETED',
		createClientWorkData: createClientWorkData(site, categoryLinks)
	})

  const siteKey = `site:${site.key}`

	nodeWorkerPool.on('task:started', async ({ taskId, workData }) => {
    logger.info(`TaskId: ${taskId}`)
    logger.info(workData)

    await hmsetAsync(siteKey, [workData.link.categoryLink, LINK_RUNNING_STATE.PROCESSING])
	})

	nodeWorkerPool.on('task:completed', async ({ taskId, workData, mainProcessSafeExit }) => {
    logger.info(`TaskId: ${taskId}`)
		logger.info(workData)
    logger.info(mainProcessSafeExit)

    await hmsetAsync(siteKey, [workData.link.categoryLink, LINK_RUNNING_STATE.PROCESSED])
	})

	let poolPromise
	categoryLinks.slice(0, site.parallelProcess).map(() => {
		poolPromise = nodeWorkerPool.enqueue()
	})

	try {
		await poolPromise
		logger.info('Site Runner pool promise resolved')
	} catch(err) {
		logger.info(err)
	}
}

function createClientWorkData(site, categoryLinks) {
  return () => {
    const link = categoryLinks.find((link) => {
      if (!link.processed) {
        link.processed = true
        return {site, link}
      }
    })

    return {site, link}
  }
}


function getArgs() {
  try {
    return JSON.parse(process.argv[2])
  } catch (error) {
    return {}
  }
}

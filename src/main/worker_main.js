require('../utils/boot')

const path = require('path')

const redisClient = require('managers/data/redis')
const lodash = require('lodash')
const Logger = require('utils/logger')
const NodeWorkerPool = require('./worker_pool')
const ProxyPool = require('managers/proxy')
const LogManager = require('managers/log')
const { LINK_RUNNING_STATE } = require('runners/constants')

let logger
let linksKey
let siteLinksStateKey
const SITE_RUNNER_WORKER = path.join(__dirname, './site_runner_main.js')

console.log(`Worker started with pid ${process.pid}`)

start()

async function start() {
  const args = getArgs()

  const { site } = args

  logger = new Logger(`sites/${site.key}/site`).sub('worker')
  linksKey = `config:${site.key}:links`
  siteLinksStateKey = `config:${site.key}:links:state`

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

  const categoryLinksCached = await redisClient.lrangeAsync(linksKey, 0, -1)
  let categoryLinks = categoryLinksCached.map(categoryLinkCached => JSON.parse(categoryLinkCached))

  const siteLinksState = await redisClient.hgetallAsync(siteLinksStateKey)
  categoryLinks = categoryLinks.filter(categoryLink => siteLinksState[categoryLink.categoryLink] !== LINK_RUNNING_STATE.PROCESSED)

  if (!siteLinksState && lodash.isEmpty(categoryLinks)) {
    const linkOptions = require(`./../sites/${site.key}/links`)
    let { links, fetchLinks, tryFetchLinks, addCategoryLinkLabel } = linkOptions
    links = await tryFetchLinks({ links, fetchLinks }, { logger })
    categoryLinks = addCategoryLinkLabel(links)

    const categoryLinksStringified = categoryLinks.map(categoryLink => JSON.stringify(categoryLink))
    await redisClient.rpushAsync(linksKey, ...categoryLinksStringified)

    const categoryHMLinks = []
    categoryLinks.map(link => {
      categoryHMLinks.push(link.categoryLink, LINK_RUNNING_STATE.NOT_PROCESSED)
    })

    logger.info('found %d links', categoryLinks.length)

    await redisClient.hmsetAsync(siteLinksStateKey, categoryHMLinks)
  }

  await initSiteRunnerPool(site, categoryLinks, logger)
}

async function initSiteRunnerPool(site, categoryLinks, logger) {
  return new Promise((resolve, reject) => {
    try {
      const args = process.env.NODE_ENV === 'production' ?
      ['--max-old-space-size=8196', '--nouse-idle-notification'] : []

      const nodeWorkerPool = new NodeWorkerPool(SITE_RUNNER_WORKER, args, {}, {
        size: categoryLinks.length,
        taskCompletedMsg: 'WORKER_TASK_COMPLETED',
        createClientWorkData: createClientWorkData(site, categoryLinks)
      })

      categoryLinks.slice(0, site.parallelProcess).map(() => {
        nodeWorkerPool.enqueue()
      })

      nodeWorkerPool.on('task:started', async ({ pid, workData }) => {
        logger.info(`TaskId: ${pid}`)
        logger.info(workData)

        await redisClient.hsetAsync(siteLinksStateKey, workData.link.categoryLink, LINK_RUNNING_STATE.PROCESSING)
      })

      nodeWorkerPool.on('task:completed', async ({ pid, workData, mainProcessSafeExit }) => {
        logger.info(`TaskId: ${pid}`)
        logger.info(workData)
        logger.info(mainProcessSafeExit)

        await redisClient.hsetAsync(siteLinksStateKey, workData.link.categoryLink, LINK_RUNNING_STATE.PROCESSED)
      })

      nodeWorkerPool.on('task:all:completed', async ({ pid, workData, mainProcessSafeExit }) => {
        // Cleanup links cache
        await redisClient.delAsync(linksKey)
        await redisClient.delAsync(siteLinksStateKey)

        logger.info('Site Runner pool promise resolved')
        console.log('Site Runner pool promise resolved') // for more easier view on the console
        resolve('Site Runner pool promise resolved')
      })
    } catch(err) {
      reject(err)
      logger.info(err)
    }
  })
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

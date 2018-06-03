const lodash = require('lodash')
const InstancePool = __src('utils/instance_pool')
const ProxyManager = require('./proxy_manager')

const POOL = new InstancePool()

module.exports = {
  init,
  pool,

  getAverageSleepTime,
  totalActiveProxies
}

function pool(name) {
  return POOL.get(name)
}

async function init(site, options) {
  const listPool = new ProxyManager()
  const adPool = new ProxyManager()

  await listPool.init(site, {
    countries: site.listProxyCountries,
    maxProxies: site.listMaxProxies,
    delay: [1000, 2000]
  })

  await adPool.init(site, lodash.assign({
    countries: site.adProxyCountries,
    maxProxies: site.adMaxProxies
  }, options))

  POOL.put('list', listPool)
  POOL.put('ad', adPool)
}

function getAverageSleepTime() {
  return POOL.get('ad').getAverageSleepTime()
}

function totalActiveProxies() {
  let activeProxies = 0

  activeProxies += POOL.get('list').totalActiveProxies()
  activeProxies += POOL.get('ad').totalActiveProxies()

  return activeProxies
}

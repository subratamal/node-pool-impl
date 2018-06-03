const path = require('path')
const fs = require('fs-extra')
const { MalformedResponseError } = __src('runners/errors')
const helpers = require('./helpers')

module.exports = {
  checkProxy,
  hasTester
}

async function checkProxy(site, proxy) {
  await testAlive(proxy)
  await testSite(site, proxy)
}

async function testAlive(proxy) {
  const req = helpers.createRequest(proxy)

  const html = await req.get('http://api.ipify.org')

  if (!html || !helpers.isIP(html)) {
    throw new MalformedResponseError(html, 'not an IP')
  }
}

async function testSite(site, proxy) {
  const tester = await loadTester(site)
  if (!tester) return

  await tester(proxy)
}

async function loadTester(site) {
  const script = await testerScript(site)
  return script ? require(script) : null
}

async function hasTester(site) {
  const script = await testerScript(site)
  return !!script
}

async function testerScript(site) {
  const dir = path.join(__base, 'src/sites', site.key)

  const file1 = path.join(dir, 'test_proxy.js')
  const file2 = path.join(dir, 'test_proxy/index.js')

  if (await fs.pathExists(file1)) return file1
  if (await fs.pathExists(file2)) return file2

  return null
}

const testAuto = require('./test_auto')

module.exports = testProxy

async function testProxy(...args) {
  await testAuto(...args)
}

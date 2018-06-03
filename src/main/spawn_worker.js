const path = require('path')
const { spawn } = require('child_process')

const WORKER = path.join(__dirname, 'worker.js')
const RESPAWN_DELAY = 1000

module.exports = spawnWorker

async function spawnWorker(args) {
  args = JSON.stringify(args)

  const deferred = Promise.pending()

  trySpawn(deferred, args)

  return deferred.promise
}

function trySpawn(deferred, args) {
  const proc = spawn('node', [
    WORKER,
    args
  ], {
    stdio: ['ignore', process.stdout, process.stderr]
  })

  proc.on('close', async (code) => {
    if (code === 0) {
      deferred.resolve()
      return
    }

    await Promise.delay(RESPAWN_DELAY)
    trySpawn(deferred, args)
  })
}

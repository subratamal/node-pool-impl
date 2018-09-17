const path = require('path')
const {
	spawn
} = require('child_process')

const WORKER = path.join(__dirname, 'worker_main.js')
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
    // `--inspect-brk=${9229 + JSON.parse(args).site.id}`,
    WORKER,
		args
	], {
		stdio: ['ignore', process.stdout, process.stderr, 'ipc']
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

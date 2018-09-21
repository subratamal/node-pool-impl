const childProcess = require('child_process')
const generic = require('generic-pool')
const uuidv4 = require('uuid/v4')
const {EventEmitter} = require('events')

const RESPAWN_DELAY = 1000

class NodeWorkerPool extends EventEmitter {

	constructor(worker, args, options, settings) {
		super()
		this.worker = worker
		this.args = args
		this.childProcesses = []

		this.options = {
			...{
				stdio: ['inherit', 'inherit', 'inherit', 'ipc']
			},
			...options
		}

		this.settings = {
			...{
				name: 'dynamic-node-pool',
				size: 10,
				timeout: 30000
			},
			...settings
		}

		if (!this.settings.createClientWorkData) {
			this.settings.createClientWorkData = this.createClientWorkData()
		}

		this.pool = generic.createPool({
			create: () => {
				const workData = this.settings.createClientWorkData()
				return workData
			},
			destroy: function () {
				// workData
			}
		}, {
			settings: this.settings,
			name: this.settings.name,
			min: 0,
			max: this.settings.size,
			idleTimeoutMillis: this.settings.timeout,
			log: this.settings.log
		})
	}

	async enqueue() {
		const instance = this.pool
		const workData = await instance.acquire()
    console.log('#$#$#$#$#$#$')
    console.log(workData)
		if (!workData.link) {
			await this.drain()
		}

		const poolPromise = new Promise((resolve) => {
			let mainProcessSafeExit = false

			if (instance._draining) {
				mainProcessSafeExit = this.checkMainProcessShutdown()
			} else {
				const childNode = childProcess.spawn('node', [
          this.worker,
          JSON.stringify(workData),
          ...this.args,
        ], this.options)

				this.emit('task:started', { pid: childNode.pid, workData, mainProcessSafeExit })

				this.childProcesses.push(childNode.pid)

				childNode.on('message', ({
					message,
					pid
				}) => {
					if (message == this.settings.taskCompletedMsg) {
						console.log(`Worker ${pid} completed!`)
						instance.destroy(workData)

						mainProcessSafeExit = this.checkMainProcessShutdown(pid)
						if (mainProcessSafeExit) {
              this.emit('task:all:completed', { pid: pid, workData, mainProcessSafeExit })
              resolve({pid, workData, mainProcessSafeExit})
						}

						this.emit('task:completed', { pid: pid, workData, mainProcessSafeExit })
						this.tryAutoEnqueue()
					}
				})

				childNode.on('close', async (code) => {
					if (code !== 0) {
						await Promise.delay(RESPAWN_DELAY)
						this.tryAutoEnqueue()
					}
				})
			}
		})

		return poolPromise
	}

	tryAutoEnqueue() {
		const instance = this.pool
		if (!instance._draining) {
			this.enqueue()
		}
	}

	async drain() {
		const instance = this.pool
		instance.drain()
		await instance.clear()
	}

	createClientWorkData() {
		const taskData = [...Array(this.settings.size).keys()].map(() => {
			return {
				pid: uuidv4(),
				processed: false
			}
		})

		return () => taskData.find((taskItem) => {
			if (taskItem.processed === false) {
				taskItem.processed = true
				return taskItem
      }
      return {}
		})
	}

	checkMainProcessShutdown(pid = '') {
		let flag = false
		if (this.childProcesses.length === 0) flag = true
		if (this.childProcesses.includes(pid)) {
			this.childProcesses = this.childProcesses.filter(p => p !== pid)
			if (this.childProcesses.length === 0) {
				flag = true
			}
		}

		if (flag) {
			console.log('\nPool exhausted. Process can be exited.')
		}

		return flag
  }

}

module.exports = NodeWorkerPool

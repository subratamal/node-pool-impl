const lodash = require('lodash')

class TaskQueue {

  constructor(options) {
    this._options = lodash.merge({
      threads: 1
    }, options)

    this._queue = []
    this._threads = 0
    this._processing = false
  }

  get size() {
    return this._queue.length
  }

  get threads() {
    return this._threads
  }

  async enqueue(fn) {
    this._queue.push({ fn })
    this._process()
  }

  async exec(fn) {
    const deferred = Promise.pending()

    this._queue.push({ deferred, fn })
    this._process()

    return await deferred.promise
  }

  get _threshold() {
    const { threads } = this._options

    if (lodash.isFunction(threads)) return threads()
    return +threads || 1
  }

  async _process() {
    if (this._processing || lodash.isEmpty(this._queue)) return

    this._processing = true

    if (this._options.concurrent || this._threshold > 1) {
      await this._processMultiple()
    } else {
      await this._processSingle()
    }

    this._processing = false

    this._process()
  }

  async _processMultiple() {
    while (this._queue.length) {
      if (this._threads < this._threshold) {
        this._exec(this._queue.shift())
      } else {
        await Promise.delay(100)
      }
    }
  }

  async _processSingle() {
    while (this._queue.length) {
      const task = this._queue.shift()

      await this._exec(task)
    }
  }

  async _exec({ deferred, fn }) {
    this._threads += 1

    try {
      const result = await fn()

      if (deferred) deferred.resolve(result)
    } catch (error) {
      if (deferred) deferred.reject(error)
    }

    this._threads -= 1
  }

}

module.exports = TaskQueue

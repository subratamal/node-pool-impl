const path = require('path')
const fs = require('fs-extra')
const levelup = require('levelup')
const leveldown = require('leveldown')
const { sanitizePath } = __src('utils/misc')
const InstancePool = __src('utils/instance_pool')

const CACHE_DIR = path.resolve(__base, 'data/cache')
const POOL = new InstancePool()

fs.ensureDirSync(CACHE_DIR)

class Cache {

  constructor(name) {
    name = sanitizePath(name)

    const dir = path.join(CACHE_DIR, name)

    if (POOL.has(dir)) {
      return POOL.get(dir)
    }

    fs.ensureDirSync(dir)

    this.db = levelup(leveldown(dir))
    this.dir = dir

    POOL.put(dir, this)
  }

  async put(key, value) {
    await this.ensureOpen()

    value = JSON.stringify(value)

    return await this.db.put(key, value)
  }

  async get(key, defaultValue = null) {
    await this.ensureOpen()

    try {
      const value = await this.db.get(key)

      return JSON.parse(value)
    } catch (error) {
      return defaultValue
    }
  }

  async del(key) {
    await this.ensureOpen()

    return await this.db.del(key)
  }

  async delBatch(keys) {
    await this.ensureOpen()

    const ops = keys.map(key => ({ type: 'del', key }))

    return await this.db.batch(ops)
  }

  async all() {
    await this.ensureOpen()

    const deferred = Promise.pending()
    const list = []

    this.db.createReadStream()
      .on('data', function (data) {
        let { key, value } = data

        try {
          if (Buffer.isBuffer(key)) key = key.toString('utf8')
          if (Buffer.isBuffer(value)) value = value.toString('utf8')

          value = JSON.parse(value)

          list.push({ key, value })
        } catch (error) {
          // malformed json value -> skip
        }
      })
      .on('error', function (error) {
        deferred.reject(error)
      })
      .on('close', function () {
        deferred.resolve()
      })

    await deferred.promise

    return list
  }

  async ensureOpen() {
    if (this.db.isClosed()) {
      await this.db.open()
    }
  }

  async destroy() {
    await this.db.close()
    await fs.remove(this.dir)

    POOL.del(this.dir)
  }

}

module.exports = Cache

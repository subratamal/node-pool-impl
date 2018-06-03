const fs = require('fs-extra')
const lodash = require('lodash')

class File {

  constructor(file) {
    this._file = file
  }

  async read(defaultValue = null) {
    try {
      const value = await fs.readFile(this._file, 'utf8')

      return lodash.trim(value) || defaultValue
    } catch (error) {
      return defaultValue
    }
  }

  async readJson(defaultValue = {}) {
    try {
      return await fs.readJson(this._file)
    } catch (error) {
      return defaultValue
    }
  }

  async write(value) {
    await fs.outputFile(this._file, value)
  }

  async writeJson(value) {
    await fs.writeJson(this._file, value)
  }

  async remove() {
    await fs.remove(this._file)
  }

}

module.exports = File

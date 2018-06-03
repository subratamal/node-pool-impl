const lodash = require('lodash')

class GearedPrice {

  constructor(options) {
    this._gears = options.gears
    this._max = options.max

    this.reset()
  }

  options(value) {
    const fields = ['level', 'start', 'end', 'keepStart']

    if (!lodash.isPlainObject(value)) {
      return lodash.pick(this, fields)
    }

    return lodash.assign(this, lodash.pick(value, fields))
  }

  reset() {
    this.level = 1
    this.start = 0
    this.end = 0

    this.keepStart = false
    this.keepEnd = false
  }

  gearUp() {
    this.update({ inc: { level: 1 }, keep: { start: true } })
  }

  gearDown() {
    this.update({ inc: { level: -1 }, keep: { start: true } })
  }

  update(options = {}) {
    const { inc = {}, set = {}, keep = {} } = options

    const updateField = (field) => {
      if (lodash.isNumber(set[field])) {
        this[field] = set[field]
      } else if (lodash.isNumber(inc[field])) {
        this[field] += inc[field]
      }
    }

    updateField('start')
    updateField('end')
    updateField('level')

    this.keepStart = keep.start || false
    this.keepEnd = keep.end || false
  }

  hasNextGear() {
    return this.level < this._gears.length
  }

  hasNext() {
    return this.end < this._max
  }

  next() {
    if (this.keepStart) {
      this.keepStart = false
    } else {
      this.start = this.end + 1
    }

    if (this.keepEnd) {
      this.keepEnd = false
    } else {
      this.end = this.start + this._gears[this.level - 1]
      this.end = Math.min(this.end, this._max)
    }

    return [this.start, this.end]
  }

  toJSON() {
    return {
      start: this.start,
      end: this.end,
      gear: this.level
    }
  }

}

module.exports = GearedPrice

const path = require('path')
const fs = require('fs-extra')
const lodash = require('lodash')
const moment = require('moment')
const toTime = require('to-time')
const Config = __src('config')
const File = __src('utils/file')

const SCHEDULE_DIR = path.resolve(__base, 'data/schedule')

const DEFAULT_DURATION = '7d'
const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss Z'

fs.ensureDirSync(SCHEDULE_DIR)

class ScheduleManager {

  constructor(site) {
    this._site = site
    this._file = new File(path.join(SCHEDULE_DIR, this._site.key, 'schedule'))
  }

  async info() {
    const data = await this._getData()

    const duration = this._getDuration()
    const last = this._getLast(data)

    if (!last) {
      return this._toInfo({ wait: 0, duration, last: null })
    }

    const diff = Math.max(moment().unix() - last.unix(), 0)
    const left = Math.max(duration - diff, 0)


    return this._toInfo({ wait: left, duration, last: last.unix() })
  }

  async wait() {
    const info = await this.info()
    if (!info.wait) return

    const wait = lodash.round(info.wait / 10)

    await Promise.delay(wait)
    await this.wait()
  }

  async save() {
    const last = moment().format(TIME_FORMAT)

    const data = { last }

    await this._file.writeJson(data)
  }

  async _getData() {
    return await this._file.readJson()
  }

  _getDuration() {
    const unit = 'seconds'

    const duration = Config.site(this._site.key).getTime('schedule.sleep_time', unit) ||
      Config.getTime('schedule.sleep_time', unit) ||
      Config.toTime(DEFAULT_DURATION, unit)

    return duration
  }

  _getLast(data) {
    const last = moment.parseZone(lodash.get(data, 'last'), TIME_FORMAT, true)

    return last.isValid() ? last : null
  }

  _toInfo(info) {
    const humanize = seconds => {
      if (!seconds) return seconds
      return toTime.fromSeconds(seconds).humanize().toLowerCase()
        .replace(/ years?/g, 'y')
        .replace(/ weeks?/g, 'w')
        .replace(/ days?/g, 'd')
        .replace(/ hours?/g, 'h')
        .replace(/ minutes?/g, 'm')
        .replace(/ seconds?/g, 's')
        .replace(/,/g, '')
        .replace(/\s+/g, '-')
    }

    info.pretty = {
      wait: humanize(info.wait),
      duration: humanize(info.duration),
      last: info.last && moment.unix(info.last).format(TIME_FORMAT)
    }

    return info
  }

}

module.exports = ScheduleManager

const ScheduleManager = __src('managers/schedule')
const Logger = __src('utils/logger')
const spawnWorker = require('./spawn_worker')
const LINKS_PARALLEL_RUN = 2

class Monitor {

  constructor(site) {
    this._site = site

    this._scheduler = new ScheduleManager(site)
    this._logger = new Logger(`sites/${site.key}/monitor`)
  }

  async run() {
    while (true) {
      await this._runCycle()
    }
  }

  async _runCycle() {
    const schedule = await this._scheduler.info()

    this._logger.info(schedule.pretty, 'schedule info')

    if (schedule.wait) {
      this._logger.info(schedule.pretty, 'wait for next run')
      await this._scheduler.wait()
    }

    this._logger.info('cycle started')

    await spawnWorker({ site: this._site, linksParallelRun: LINKS_PARALLEL_RUN })

    this._logger.info('cycle finished')

    await this._scheduler.save()
  }

}

module.exports = Monitor

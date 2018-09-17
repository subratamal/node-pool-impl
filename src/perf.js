const async_hooks = require('async_hooks')
const {
  performance,
  PerformanceObserver
} = require('perf_hooks')
const scraperContext = new Set()

const hook = async_hooks.createHook({
    init(id, type, triggerId, resource) {
      if (type === 'Timeout') {
        performance.mark(`Timeout-${id}-Init`)
        scraperContext.add(id)
      }
    },
    destroy(id) {
      if (scraperContext.has(id)) {
        scraperContext.delete(id)
        performance.mark(`Timeout-${id}-Destroy`)
        performance.measure(`Timeout-${id}`,
          `Timeout-${id}-Init`,
          `Timeout-${id}-Destroy`)
      }
    }
  })

  hook.enable()

  const obs = new PerformanceObserver((list, observer) => {
    console.log(list.getEntries()[0])
    performance.clearMarks()
    performance.clearMeasures()
    observer.disconnect()
  })
  obs.observe({
    entryTypes: ['measure'],
    buffered: true
  })
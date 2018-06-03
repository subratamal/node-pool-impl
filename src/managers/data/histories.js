const lodash = require('lodash')
const knex = require('./knex')
const helpers = require('./helpers')

const TABLE = 'scraping_history'

exports.addHistory = async function(data) {
  data = {
    scraper: data.scraper,
    sleep_time: data.sleepTime,
    active_proxies: JSON.stringify(data.activeProxies),
    links_found: 0,
    links_unique: 0,
    numbers_found: 0,
    numbers_unique: 0,
    numbers_non_matched: 0,
    created_at: helpers.CURRENT_TIMESTAMP,
    updated_at: helpers.CURRENT_TIMESTAMP
  }

  const result = await knex
    .table(TABLE)
    .insert(data)

  return { runId: lodash.first(result) }
}

exports.updateActiveProxies = async function(runId, activeProxies) {
  await knex
    .table(TABLE)
    .where('run_id', runId)
    .update('active_proxies', JSON.stringify(activeProxies))
}

exports.updateHistories = async function(histories) {
  await helpers.transaction(async (transaction) => {
    for (const history of histories) {
      await exports.updateHistory(history.runId, history.fields, transaction)
    }
  })
}

exports.updateHistory = async function(historyId, fields, transaction) {
  const updateFields = {
    updated_at: helpers.CURRENT_TIMESTAMP
  }

  lodash.forEach(fields, (value, field) => {
    updateFields[field] = knex.raw('?? + ?', [field, value])
  })

  let query = knex.table(TABLE)
    .where('run_id', historyId)
    .update(updateFields)

  if (transaction) {
    query = query.transacting(transaction)
  }

  await query
}

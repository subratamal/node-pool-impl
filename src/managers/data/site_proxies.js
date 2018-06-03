const lodash = require('lodash')
const knex = require('./knex')
const helpers = require('./helpers')

const TABLE = 'classified_websites_proxies'
const FIELDS = ['classified_id', 'proxy_id', 'status', 'suspended_level']

exports.fetchSiteProxies = async function(siteId) {
  const rows = await knex
    .table(TABLE)
    .select(FIELDS)
    .where('classified_id', siteId)

  return rows.map(row => toSiteProxy(row))
}

exports.addSiteProxies = async function(siteId, proxyIds = []) {
  if (lodash.isEmpty(proxyIds)) return

  const rows = proxyIds.map(proxyId => ({
    classified_id: siteId,
    proxy_id: proxyId,
    status: 'online',
    suspended_level: 0,
    created_at: helpers.CURRENT_TIMESTAMP,
    updated_at: helpers.CURRENT_TIMESTAMP
  }))

  await knex.batchInsert(TABLE, rows)
}

exports.deleteSiteProxies = async function(siteId, proxyIds = []) {
  let query = knex
    .table(TABLE)
    .where(`classified_id`, siteId)

  if (!lodash.isEmpty(proxyIds) && lodash.isArray(proxyIds)) {
    query = query.andWhere('proxy_id', 'in', proxyIds)
  }

  await query.del()
}

// proxy suspension

exports.fetchSuspendedProxies = async function(siteId, options = {}) {
  const { threshold = 0, countries = null } = options

  const fields = {
    siteId: `${TABLE}.classified_id`,
    proxyId: `${TABLE}.proxy_id`,
    suspendedLevel: `${TABLE}.suspended_level`,
    host: 'proxies.ip',
    port: 'proxies.port',
    username: 'proxies.username',
    password: 'proxies.password'
  }

  let query = knex
    .table(TABLE)
    .innerJoin('proxies', 'proxies.id', '=', `${TABLE}.proxy_id`)
    .where({
      [`${TABLE}.classified_id`]: siteId,
      [`${TABLE}.status`]: 'suspended'
    })

  if (threshold) {
    query = query.andWhere(`${TABLE}.suspended_level`, '<', threshold)
  }

  if (!lodash.isEmpty(countries) && lodash.isArray(countries)) {
    query = query.andWhere('proxies.country_code', 'in', countries)
  }

  const rows = await query.select(fields)
  const picks = lodash.keys(fields)

  return rows.map(row => lodash.pick(row, picks))
}

exports.suspendSiteProxies = async function(siteId, proxyIds = []) {
  let query = knex
    .table(TABLE)
    .where('classified_id', siteId)

  proxyIds = lodash.concat(proxyIds)

  if (!lodash.isEmpty(proxyIds)) {
    query = query.andWhere('proxy_id', 'in', proxyIds)
  }

  await query.update({
    status: 'suspended',
    suspended_level: 1,
    updated_at: helpers.CURRENT_TIMESTAMP
  })
}

exports.suspendSiteProxy = async function(siteId, proxyId) {
  await knex
    .table(TABLE)
    .where({
      classified_id: siteId,
      proxy_id: proxyId
    })
    .update({
      status: 'suspended',
      suspended_level: knex.raw('?? + ?', ['suspended_level', 1]),
      updated_at: helpers.CURRENT_TIMESTAMP
    })
}

exports.resetSuspendedSiteProxy = async function(siteId, proxyId) {
  await knex
    .table(TABLE)
    .where({
      classified_id: siteId,
      proxy_id: proxyId,
      status: 'suspended'
    })
    .update({
      status: 'online',
      suspended_level: 0,
      updated_at: helpers.CURRENT_TIMESTAMP
    })
}

exports.resetSuspendedSiteProxies = async function(siteId, options = {}) {
  const { countries = null } = options

  let query = knex
    .table(TABLE)
    .innerJoin('proxies', 'proxies.id', '=', `${TABLE}.proxy_id`)
    .where({
      [`${TABLE}.classified_id`]: siteId,
      [`${TABLE}.status`]: 'suspended'
    })

  if (!lodash.isEmpty(countries) && lodash.isArray(countries)) {
    query = query.andWhere('proxies.country_code', 'in', countries)
  }

  await query.update({
    [`${TABLE}.status`]: 'online',
    [`${TABLE}.suspended_level`]: 0,
    [`${TABLE}.updated_at`]: helpers.CURRENT_TIMESTAMP
  })
}

function toSiteProxy(row) {
  if (!row) return null

  return {
    siteId: row.classified_id,
    proxyId: row.proxy_id,
    status: row.status,
    suspendedLevel: row.suspended_level
  }
}

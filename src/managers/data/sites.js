const knex = require('./knex')
const helpers = require('./helpers')

const TABLE = 'classified_websites'
const FIELDS = [
  'id', 'domain',
  'list_proxy_countries', 'list_max_proxies',
  'ad_proxy_countries', 'ad_max_proxies'
]

exports.fetchSites = async function() {
  const rows = await knex
    .table(TABLE)
    .select(FIELDS)

  return rows.map(row => toSite(row))
}

exports.fetchSiteById = async function(id) {
  const row = await knex
    .table(TABLE)
    .first(FIELDS)
    .where('id', id)

  return row && toSite(row)
}

function toSite(row) {
  if (!row) return null

  return {
    id: row.id,
    key: helpers.toKey(row.domain),
    domain: row.domain,
    listProxyCountries: helpers.fromJson(row.list_proxy_countries, []),
    listMaxProxies: +row.list_max_proxies || 0,
    adProxyCountries: helpers.fromJson(row.ad_proxy_countries, []),
    adMaxProxies: +row.ad_max_proxies || 0
  }
}

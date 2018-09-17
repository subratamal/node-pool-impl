const lodash = require('lodash')
const knex = require('./knex')

const TABLE = 'proxies'
const FIELDS = ['id', 'country_code', 'ip', 'port', 'username', 'password', 'provider']

exports.fetchProxies = async function(countryCodes) {
  const rows = await knex
    .table(TABLE)
    .select(FIELDS)

  let proxies = rows.map(row => toProxy(row))

  if (!lodash.isEmpty(countryCodes)) {
    countryCodes = lodash.concat(countryCodes)

    proxies = proxies.filter(proxy => countryCodes.includes(proxy.countryCode))
      .filter(proxy => proxy.provider === 'BP')
  }

  return proxies
}

function toProxy(row) {
  if (!row) return null

  return {
    id: row.id,
    countryCode: row.country_code,
    host: row.ip,
    port: row.port,
    username: row.username,
    password: row.password,
    provider: row.provider
  }
}

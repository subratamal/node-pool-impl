const knex = require('./knex')

const TABLE = 'cities'
const FIELDS = ['id', 'name', 'display_name', 'country_code']

exports.fetchCities = async function() {
  const rows = await knex
    .table(TABLE)
    .select(FIELDS)

  return rows.map(row => toCity(row))
}

function toCity(row) {
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    countryCode: row.country_code
  }
}

const knex = require('./knex')

const TABLE = 'areas'
const FIELDS = ['id', 'name', 'display_name', 'city_id']

exports.fetchAreas = async function() {
  const rows = await knex
    .table(TABLE)
    .select(FIELDS)

  return rows.map(row => toArea(row))
}

function toArea(row) {
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    cityId: row.city_id
  }
}

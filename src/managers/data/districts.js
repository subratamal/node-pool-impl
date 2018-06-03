const knex = require('./knex')

const TABLE = 'districts'
const FIELDS = ['id', 'name', 'display_name', 'area_id']

exports.fetchDistricts = async function() {
  const rows = await knex
    .table(TABLE)
    .select(FIELDS)

  return rows.map(row => toDistrict(row))
}

function toDistrict(row) {
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    areaId: row.area_id
  }
}

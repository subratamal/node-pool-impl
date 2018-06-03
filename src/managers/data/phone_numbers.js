const lodash = require('lodash')
const knex = require('./knex')
const helpers = require('./helpers')

const TABLE = 'mobile_numbers'
const FIELDS = ['number', 'city_id', 'area_id', 'district_id']

exports.fetchPhoneNumbers = async function(phoneNumbers) {
  const rows = await knex
    .table(TABLE)
    .select(FIELDS)
    .whereIn('number', phoneNumbers)

  const results = rows.map(row => toPhoneNumber(row))

  return lodash.keyBy(results, 'number')
}

exports.insertPhoneNumbers = async function(phoneNumbers) {
  const values = []
  const params = []

  phoneNumbers.forEach(item => {
    values.push(`(?, ?, ?, ?, 0, ?, ?, ?)`)

    params.push(
      item.countryCode,
      item.cityId,
      item.areaId,
      item.districtId,
      item.phoneNumber,
      helpers.CURRENT_TIMESTAMP,
      helpers.CURRENT_TIMESTAMP
    )
  })

  const sql = `
    INSERT INTO mobile_numbers (
      country_code,
      city_id,
      area_id,
      district_id,
      postal_code_id,
      number,
      created_at,
      updated_at
    )
    VALUES ${values.join(', ')}
    ON DUPLICATE KEY UPDATE
      country_code = VALUES(country_code),
      city_id = VALUES(city_id),
      area_id = VALUES(area_id),
      district_id = VALUES(district_id),
      postal_code_id = VALUES(postal_code_id),
      number = VALUES(number),
      created_at = VALUES(created_at),
      updated_at = VALUES(updated_at)
  `

  await knex.raw(sql, params)
}

function toPhoneNumber(row) {
  if (!row) return null

  return {
    number: row.number,
    cityId: row.city_id,
    areaId: row.area_id,
    districtId: row.district_id
  }
}

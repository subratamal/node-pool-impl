const lodash = require('lodash')
const knex = require('./knex')

exports.toKey = function(value) {
  return lodash.snakeCase(value).toLowerCase()
}

exports.fromJson = function(json, defaultValue) {
  try {
    return JSON.parse(json)
  } catch (error) {
    return defaultValue
  }
}

exports.transaction = function(fn) {
  return knex.transaction(async (transaction) => {
    try {
      await fn(transaction)

      await transaction.commit()
    } catch (error) {
      await transaction.rollback(error)
    }
  })
}

exports.CURRENT_TIMESTAMP = knex.raw(`CURRENT_TIMESTAMP()`)

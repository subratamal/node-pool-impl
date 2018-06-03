module.exports = load()

function load() {
  const db = __load({
    dir: __dirname,
    excludes: ['knex.js', 'helpers.js']
  })

  db.knex = require('./knex')
  db.transaction = (...args) => db.knex.transaction(...args)

  return db
}

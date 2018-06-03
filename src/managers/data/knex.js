const knex = require('knex')
const Config = __src('config')

const DEFAULT_POOL_SIZE = 10

module.exports = createKnex()

function createKnex() {
  const dbConfig = Config.sub('db')

  const knexConfig = {
    client: 'mysql2',
    connection: {
      host: dbConfig.get('host'),
      port: dbConfig.get('port'),
      user: dbConfig.get('username'),
      password: dbConfig.get('password'),
      database: dbConfig.get('db_name'),
      multipleStatements: true,
      charset: 'UTF8_UNICODE_CI'
    },
    useNullAsDefault: false,
    pool: {
      min: 0,
      max: dbConfig.get('pool_size', DEFAULT_POOL_SIZE)
    },
    debug: false
  }

  return knex(knexConfig)
}

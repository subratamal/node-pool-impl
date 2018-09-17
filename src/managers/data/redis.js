const { promisify } = require('util')
const redis = require('redis')
const Config = require('config')

function redisClient() {
  const redisConfig = Config.get('redis')
  console.log(redisConfig)
  client = redis.createClient(
    redisConfig.port,
    redisConfig.host,
    {
      password: redisConfig.password
    }
  )
  return client
}

const _redisClient = redisClient()
const hmsetAsync = promisify(_redisClient.hmset).bind(_redisClient)

module.exports = {
  redisClient: _redisClient,
  hmsetAsync
}

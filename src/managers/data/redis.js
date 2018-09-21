const redis = require('redis')
var bluebirdPromise = require('bluebird')
const { promisify } = require('util')
const Config = require('config')

bluebirdPromise.promisifyAll(redis.RedisClient.prototype)

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
module.exports = _redisClient

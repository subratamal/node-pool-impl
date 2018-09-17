const { promisify } = require('util')
const redis = require("redis")
const Config = require('./../../config')

function redisClient() {
  const redisConfig = {}
  client = redis.createClient()
  return client
}

const _redisClient = redisClient()
const hmsetAsync = promisify(_redisClient.hmset).bind(_redisClient)

module.exports = {
  redisClient: redisClient(),
  hmsetAsync
}

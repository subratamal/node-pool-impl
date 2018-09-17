const path = require('path')
const fs = require('fs-extra')
const lodash = require('lodash')
const bunyan = require('bunyan')
const InstancePool = require('./../../utils/instance_pool')
const { sanitizePath } = require('./../../utils/misc')
const errors = require('./../../runners/errors')

const PRODUCTION = (process.env.NODE_ENV === 'production')
const STDOUT_LOG_LEVEL = process.env.DEBUG ? 'debug' : 'info'

const LOGS_DIR = path.resolve(__base, 'data/logs')
const POOL = new InstancePool()

fs.ensureDirSync(LOGS_DIR)

module.exports = createLogger

function createLogger(name, options = {}) {
  const { fileOnly = false, data } = options

  if (POOL.has(name)) {
    return POOL.get(name)
  }

  const logger = bunyan.createLogger(lodash.assign({
    name,
    serializers: {
      err: errorSerializer
    },
    streams: []
  }, data))

  if (!fileOnly && !PRODUCTION) {
    logger.addStream({
      name: 'stdout',
      level: STDOUT_LOG_LEVEL,
      stream: process.stdout
    })
  }

  const file = path.join(LOGS_DIR, sanitizePath(name) + '.log')

  fs.ensureDirSync(path.dirname(file))

  logger.addStream({
    name: 'file',
    level: 'info',
    type: 'rotating-file',
    path: file,
    period: '1d',
    count: 15
  })

  logger.sub = (...args) => createSubLogger(logger, ...args)

  POOL.put(name, logger)

  return logger
}

function createSubLogger(logger, sub, data) {
  return logger.child(lodash.assign({ sub }, data))
}

function errorSerializer(error) {
  if (!error || !error.stack) return error

  const data = {
    message: error.message,
    name: error.name,
    stack: getFullErrorStack(error),
    code: error.code,
    signal: error.signal
  }

  if (errors.isError(error, errors.ProxyError)) {
    data.proxy = error.proxy
    error = error.cause
  }

  if (errors.isError(error, errors.RequestTimeoutError)) {
    data.timeout = error.timeout
    data.extras = error.extras
  } else if (errors.isError(error, errors.MalformedResponseError)) {
    data.reason = error.reason
    data.response = error.response
  } else if (errors.isError(error, errors.CustomError)) {
    data.extras = error.extras
  }

  return data
}

function getFullErrorStack(error) {
  let stack = error.stack || error.toString()

  let cause = error.cause
  if (lodash.isFunction(cause)) cause = cause()

  if (cause) {
    if (errors.isError(cause, errors.RequestError)) {
      // RequestError is wrapper of native request error
      // so use ".cause" to get its original error
      // and skip unnecessary error stack
      cause = cause.cause
    }

    stack += '\nCaused by: ' + getFullErrorStack(cause)
  }

  return stack
}

/* eslint-disable padded-blocks */

class ProxyError extends Error {
  constructor(proxy = null, cause = null) {
    super('PROXY_REQUEST_ERROR')

    this.proxy = proxy
    this.cause = cause

    Error.captureStackTrace(this, ProxyError)
  }
}

class RequestError extends Error {
  constructor(cause) {
    super('REQUEST_ERROR')

    this.cause = cause

    Error.captureStackTrace(this, RequestError)
  }
}

class RequestTimeoutError extends Error {
  constructor(timeout = null, extras = null) {
    super('REQUEST_TIMEOUT_ERROR')

    this.timeout = timeout
    this.extras = extras

    Error.captureStackTrace(this, RequestTimeoutError)
  }
}

class MalformedResponseError extends Error {
  constructor(response = null, reason = null) {
    super('MALFORMED_RESPONSE_ERROR')

    this.response = response
    this.reason = reason

    Error.captureStackTrace(this, MalformedResponseError)
  }
}

class IPBannedError extends Error {
  constructor() {
    super('IP_BANNED_ERROR')

    Error.captureStackTrace(this, IPBannedError)
  }
}

class CustomError extends Error {
  constructor(code = 'RUNNER_ERROR', extras = null) {
    super(code)

    this.extras = extras

    Error.captureStackTrace(this, CustomError)
  }
}

function isError(error, Type) {
  return (error instanceof Type)
}

function isRunnerError(error) {
  return isProxyRelatedError(error) ||
    isError(error, CustomError)
}

function isProxyRelatedError(error) {
  return isError(error, ProxyError) ||
    isError(error, RequestError) ||
    isError(error, RequestTimeoutError) ||
    isError(error, MalformedResponseError) ||
    isError(error, IPBannedError)
}

async function handleProxyRelatedError(error, proxy) {
  if (isProxyRelatedError(error)) {
    await proxy.release(error)
    return
  }

  await proxy.release()

  if (isError(error, ProxyError)) throw error

  throw new ProxyError(proxy, error)
}

function toProxyError(proxy, error) {
  if (isError(error, ProxyError)) return error
  if (isProxyRelatedError(error)) return new ProxyError(proxy, error)

  return error
}

module.exports = {
  ProxyError,
  RequestError,
  RequestTimeoutError,
  MalformedResponseError,
  IPBannedError,
  CustomError,
  isError,
  isProxyRelatedError,
  isRunnerError,
  toProxyError,
  handleProxyRelatedError
}

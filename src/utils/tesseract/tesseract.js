const { spawn } = require('child_process')
const { CustomError } = __src('runners/errors')

module.exports = {
  process
}

function process(buffer) {
  const proc = spawn('tesseract', ['stdin', 'stdout'], {
    stdio: 'pipe'
  })

  const deferred = Promise.pending()
  let stdout = ''
  let stderr = ''

  proc.stdout.on('data', (data) => {
    stdout += data.toString()
  })

  proc.stderr.on('data', (data) => {
    stderr += data.toString()
  })

  proc.stdin.end(buffer)

  proc.on('close', (code, signal) => {
    const result = { code, signal, stdout, stderr }

    if (code === 0 || (code === null && !signal)) {
      deferred.resolve(result)
    } else {
      deferred.reject(new CustomError('TESSERACT_ERROR', result))
    }
  })

  proc.on('error', (error) => {
    deferred.reject(error)
  })

  return deferred.promise
}

Promise.isPromise = function(p) {
  return p && ((p instanceof Promise) || (p.then && p.catch))
}

Promise.prototype.finally = function(cb) {
  const res = () => this
  const fin = () => Promise.resolve(cb()).then(res)

  return this.then(fin, fin)
}

Promise.delay = function(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

Promise.pending = function() {
  let resolve, reject

  const promise = new Promise(function() {
    resolve = arguments[0]
    reject = arguments[1]
  })

  return { resolve, reject, promise }
}

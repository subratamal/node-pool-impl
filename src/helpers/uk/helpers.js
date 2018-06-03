const commonHelpers = __src('helpers/common')

const PHONE_PREFIXES = require('./constants/phone_prefixes')

const COUNTRY_CODE = 'UK'
const PHONE_CODE = '44'
const PHONE_LENGTH = 10

module.exports = {
  COUNTRY_CODE,
  PHONE_CODE,
  standardPhoneNumber
}

function standardPhoneNumber(raw) {
  return commonHelpers.standardPhoneNumber(raw, {
    code: PHONE_CODE,
    prefixes: PHONE_PREFIXES,
    length: PHONE_LENGTH
  })
}

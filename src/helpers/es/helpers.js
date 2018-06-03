const commonHelpers = __src('helpers/common')

const COUNTRY_CODE = 'ES'
const PHONE_CODE = '34'
const PHONE_PREFIXES = ['6', '7']
const PHONE_LENGTH = 9

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

const commonHelpers = __src('helpers/common')

const COUNTRY_CODE = 'RU'
const PHONE_CODE = '7'
const PHONE_PREFIXES = ['9']

module.exports = {
  COUNTRY_CODE,
  PHONE_CODE,
  standardPhoneNumber
}

function standardPhoneNumber(raw) {
  if (raw.startsWith('8 9')) {
    raw = raw.slice(2)
  }

  return commonHelpers.standardPhoneNumber(raw, {
    code: PHONE_CODE,
    prefixes: PHONE_PREFIXES
  })
}

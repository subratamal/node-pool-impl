const commonHelpers = __src('helpers/common')

const PHONE_PREFIXES = require('./constants/phone_prefixes')

const COUNTRY_CODE = 'FR'
const PHONE_CODE = '33'
const PHONE_LENGTH = 9

module.exports = {
  COUNTRY_CODE,
  PHONE_CODE,
  standardPhoneNumber,
  standardDistrictName
}

function standardPhoneNumber(raw) {
  return commonHelpers.standardPhoneNumber(raw, {
    code: PHONE_CODE,
    prefixes: PHONE_PREFIXES,
    length: PHONE_LENGTH
  })
}

function standardDistrictName(districtName, postalCode) {
  if (!postalCode || !postalCode.startsWith('75')) return districtName

  // Paris postal code
  const prefix = +postalCode.slice(3)

  if (prefix === 0) return null

  return prefix + 'e Arrondissement De Paris'
}

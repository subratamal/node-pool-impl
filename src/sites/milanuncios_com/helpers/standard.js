const lodash = require('lodash')
const AddressManager = __src('managers/address')
const esHelpers = __src('helpers/es')

exports.standardPhoneNumber = function(raw) {
  return esHelpers.standardPhoneNumber(raw)
}

exports.standardAddress = function(raw) {
  const result = {
    raw,
    countryCode: esHelpers.COUNTRY_CODE,
    cityName: null,
    areaName: null,
    districtName: null
  }

  if (!raw.areaName) return result

  const areas = AddressManager.getAreasByCountry(esHelpers.COUNTRY_CODE, raw.areaName)

  if (lodash.isEmpty(areas)) {
    result.result = '010'
    return result
  }

  const area = lodash.first(areas)

  result.areaName = area.displayName

  const city = AddressManager.getCityById(area.cityId)

  if (!city) {
    result.result = '100'
    return result
  }

  result.cityName = city.displayName

  return result
}

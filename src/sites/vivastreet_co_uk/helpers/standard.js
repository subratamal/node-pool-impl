const lodash = require('lodash')
const AddressManager = __src('managers/address')
const ukHelpers = __src('helpers/uk')

exports.standardPhoneNumber = function(raw) {
  return ukHelpers.standardPhoneNumber(raw)
}

exports.standardAddress = function(raw) {
  raw = raw.map(lodash.trim)

  const address = {
    raw,
    countryCode: ukHelpers.COUNTRY_CODE,
    cityName: null,
    areaName: null,
    districtName: null
  }

  let city
  let area

  lodash.forEach(raw, (cityName, i) => {
    const foundCity = AddressManager.getCity(ukHelpers.COUNTRY_CODE, cityName)

    if (!foundCity) return true

    city = foundCity

    const areaName = raw[i + 1]

    if (!areaName) return false

    const foundArea = AddressManager.getArea(foundCity.id, areaName)

    if (!foundArea) return true

    area = foundArea
    return false
  })

  if (!city) {
    address.result = '100'
    return address
  }

  address.cityName = city.cityName

  if (!area) {
    address.result = '010'
    return address
  }

  address.areaName = area.areaName

  return address
}

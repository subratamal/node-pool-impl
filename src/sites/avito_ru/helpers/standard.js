const lodash = require('lodash')
const AddressManager = __src('managers/address')
const ruHelpers = __src('helpers/ru')
const NAME_PREFIXES = require('../constants/name_prefixes')

exports.standardPhoneNumber = function(raw) {
  return ruHelpers.standardPhoneNumber(raw)
}

exports.standardAddress = function(raw) {
  raw = raw.map(word => trimPrefixes(word))

  const address = {
    raw,
    countryCode: ruHelpers.COUNTRY_CODE,
    cityName: null,
    areaName: null,
    districtName: null
  }

  const city = AddressManager.getCity(ruHelpers.COUNTRY_CODE, raw[0])

  if (!city) {
    address.result = '100'
    return address
  }

  address.cityName = city.displayName

  let area
  let districtIndex

  lodash.forEach(raw.slice(1), (areaName, i) => {
    area = AddressManager.getArea(city.id, areaName)

    if (area) {
      districtIndex = i + 2
    }

    return !area
  })

  if (!area) {
    address.result = '010'
    return address
  }

  address.areaName = area.displayName

  const districtsCount = AddressManager.countDistrictsByAreaId(area.id)

  if (!districtsCount) {
    address.result = '000'
    return address
  }

  const districtPrefix = 'район'
  const districtName = trimPrefix(raw[districtIndex], districtPrefix) || null

  address.districtName = districtName

  return address
}

function trimPrefixes(name, prefixes = NAME_PREFIXES) {
  if (!name) return name

  prefixes.forEach((prefix) => {
    name = trimPrefix(name, prefix)
  })

  return name
}

function trimPrefix(name, prefix) {
  if (!name) return name

  if (name.toLowerCase().startsWith(prefix)) {
    name = name.slice(prefix.length).trim()
  }

  return name
}
const lodash = require('lodash')
const AddressManager = __src('managers/address')
const commonHelpers = __src('helpers/common')

const PHONE_PREFIXES = require('./constants/phone_prefixes')
const NO_DISTRICTS_AREAS = prepareNoDistrictsAreas(require('./constants/no_districts_areas'))

const COUNTRY_CODE = 'UA'
const PHONE_CODE = '380'
const PHONE_LENGTH = 9

module.exports = {
  COUNTRY_CODE,
  PHONE_CODE,
  standardPhoneNumber,
  standardAddress
}

function standardPhoneNumber(raw) {
  return commonHelpers.standardPhoneNumber(raw, {
    code: PHONE_CODE,
    prefixes: PHONE_PREFIXES,
    length: PHONE_LENGTH
  })
}

function standardAddress(raw) {
  // NOTE:
  // - "raw" format: [cityName, areaName, districtName]

  raw = lodash.map(raw, trimAddressText)

  const cityName = lodash.trim(raw[0])
  let areaName = lodash.trim(raw[1])
  let districtName = lodash.trim(raw[2])

  const city = getCity(cityName)

  const result = {
    raw,
    countryCode: COUNTRY_CODE
  }

  if (!cityName) {
    result.cityName = areaName || null
    result.areaName = null
    result.districtName = null

    return result
  }

  if (!city) {
    result.cityName = cityName
    result.areaName = areaName
    result.districtName = districtName

    return result
  }

  let area = getArea(city.id, areaName)

  if (!area) {
    // use district name as area name
    // in case area name is not matched
    areaName = districtName
    // and set district name to NULL
    districtName = null

    area = getArea(city.id, areaName)
  }

  if (!area) {
    // if district name is still not a matched area name
    // return 011 as a result
    result.cityName = city.displayName
    result.areaName = null
    result.districtName = null
    result.result = '011'

    return result
  }

  if (!NO_DISTRICTS_AREAS[area.name]) {
    // if area name is NOT in whitelist areas
    // meaning these areas has no district
    // set district name to NULL
    // and return 001 as a result
    result.cityName = city.displayName
    result.areaName = area.displayName
    result.districtName = null
    result.result = '001'

    return result
  }

  // insert with city name, area name, district name
  // with no custom result
  result.cityName = city.displayName
  result.areaName = area.displayName
  result.districtName = districtName

  return result

}

function getCity(cityName) {
  const citySuffix = ' область'

  cityName = lodash.trim(cityName)
  if (!cityName) return null

  let city = AddressManager.getCity(COUNTRY_CODE, cityName)

  if (city) return city
  if (cityName.endsWith(citySuffix)) return null

  cityName = `${cityName}${citySuffix}`
  city = AddressManager.getCity(COUNTRY_CODE, cityName)

  return city
}

function getArea(cityId, areaName) {
  const areaSuffix = areaName.endsWith('ский') ? ' район' : 'ский район'

  areaName = lodash.trim(areaName)
  if (!areaName) return null

  let area = AddressManager.getArea(cityId, areaName)

  if (area) return area
  if (areaName.endsWith(areaSuffix)) return null

  area = AddressManager.getArea(cityId, `${areaName}${areaSuffix}`)

  if (area) return area

  cityId = +cityId
  areaName = commonHelpers.standardName(areaName)

  area = lodash.find(AddressManager.areas, area => {
    if (+area.cityId !== cityId) return false

    return area.name.startsWith(areaName)
  })

  if (area) return area

  // if all previous cases fail
  // take first 5 letters of area name and try to find match
  areaName = areaName.slice(0, 5)

  area = lodash.find(AddressManager.areas, area => {
    if (+area.cityId !== cityId) return false

    return area.name.startsWith(areaName)
  })

  return area || null
}

function trimAddressText(text) {
  if (!text) return text

  // trim parenthesis, e.g: text (subtext)
  return text.trim().replace(/\s*\(.+?\)/g, '')
}

function prepareNoDistrictsAreas(areas) {
  const noDistrictsAreas = lodash.chain(areas)
    .map(area => commonHelpers.standardName(area))
    .keyBy()
    .value()

  return noDistrictsAreas
}

const lodash = require('lodash')
const commonHelpers = __src('helpers/common')
const uaHelpers = __src('helpers/ua')

const AREA_MAPPINGS = prepareAreaMappings(require('./constants/area_mappings'))

exports.standardAddress = function(address) {
  const areaName = stripAreaName(address.areaName)

  const mappingKey = commonHelpers.standardName(areaName)
  const mapping = AREA_MAPPINGS[mappingKey]

  if (mapping) {
    address = [mapping[0], mapping[1], '']
  } else {
    address = [address.cityName, areaName, '']
  }

  return uaHelpers.standardAddress(address)
}

function stripAreaName(areaName) {
  if (!areaName) return areaName

  // "Яворов (Львовская обл.)" => "Яворов"
  return areaName.replace(/\s*\(.+?\)$/, '')
}

function prepareAreaMappings(areaMappings) {
  return lodash.chain(areaMappings)
    .mapKeys((_, key) => commonHelpers.standardName(key))
    .value()
}

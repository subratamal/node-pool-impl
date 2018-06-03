const lodash = require('lodash')
const DataManager = __src('managers/data')
const commonHelpers = __src('helpers/common')

class AddressManager {

  async init(site, options) {
    this._site = site
    this._options = options

    this.cities = {}
    this.areas = {}
    this.districts = {}

    this.citiesById = {}
    this.areasByCountry = {}
    this.areaDistrictsCount = {}

    const cities = await DataManager.fetchCities()
    const areas = await DataManager.fetchAreas()
    const districts = await DataManager.fetchDistricts()

    cities.forEach(city => {
      city.name = commonHelpers.standardName(city.displayName)
    })

    areas.forEach(area => {
      area.name = commonHelpers.standardName(area.displayName)
    })

    districts.forEach(district => {
      district.name = commonHelpers.standardName(district.displayName)
    })

    lodash.forEach(cities, city => {
      const key = this._compositeKey(city.countryCode, city.name)
      this.cities[key] = city

      this.citiesById[city.id] = city
    })

    lodash.forEach(areas, area => {
      const key = this._compositeKey(area.cityId, area.name)
      this.areas[key] = area

      let country = lodash.get(this.citiesById[area.cityId], 'countryCode')

      if (!country) return

      country = country.toLowerCase()

      if (!this.areasByCountry[country]) {
        this.areasByCountry[country] = {}
      }

      if (!this.areasByCountry[country][area.name]) {
        this.areasByCountry[country][area.name] = []
      }

      this.areasByCountry[country][area.name].push(area)
    })

    lodash.forEach(districts, district => {
      const key = this._compositeKey(district.areaId, district.name)
      this.districts[key] = district

      if (!this.areaDistrictsCount[district.areaId]) {
        this.areaDistrictsCount[district.areaId] = 0
      }

      this.areaDistrictsCount[district.areaId] += 1
    })
  }

  getCity(countryCode, cityName) {
    const key = this._compositeKey(countryCode, commonHelpers.standardName(cityName))

    return this.cities[key.toLowerCase()] || null
  }

  getArea(cityId, areaName) {
    const key = this._compositeKey(cityId, commonHelpers.standardName(areaName))

    return this.areas[key.toLowerCase()] || null
  }

  getDistrict(areaId, districtName) {
    const key = this._compositeKey(areaId, commonHelpers.standardName(districtName))

    return this.districts[key.toLowerCase()] || null
  }

  getCityById(cityId) {
    return this.citiesById[cityId] || null
  }

  getAreasByCountry(countryCode, areaName) {
    areaName = commonHelpers.standardName(areaName)

    return this.areasByCountry[countryCode.toLowerCase()][areaName] || []
  }

  countDistrictsByAreaId(areaId) {
    return this.areaDistrictsCount[areaId] || 0
  }

  _compositeKey(...args) {
    return args.join(':').toLowerCase()
  }

}

module.exports = new AddressManager()

const lodash = require('lodash')
const cheerio = require('cheerio')
const { MalformedResponseError } = __src('runners/errors')

const BASE_URL = exports.BASE_URL = 'https://dom.ria.com'
const PAGE_SIZE = 50

exports.buildUrl = function({ link, page = 1 }) {
  const url = {
    baseUrl: BASE_URL,
    uri: '/node/searchEngine/v2/',
    qs: {
      'page': page - 1,
      'limit': PAGE_SIZE,
      'category': link.categoryId,
      'sort': 'inspected_sort',
      'realty_type': 0,
      'operation_type': 0,
      'state_id': 0,
      'exclude_agencies': 1,
      'period': 0
    }
  }

  return url
}

exports.countListPages = function(data) {
  if (!lodash.has(data, 'count')) {
    throw new MalformedResponseError(data, 'no .count')
  }

  const results = +lodash.get(data, 'count') || 0
  return lodash.ceil(results / PAGE_SIZE)
}

exports.listAds = function(data) {
  if (!lodash.has(data, 'items')) {
    throw new MalformedResponseError(data, 'no .items')
  }

  const ads = lodash.map(data.items, id => ({
    type: 'dom', id
  }))

  return ads
}

exports.adInfo = function(html) {
  const $doc = cheerio.load(html)

  const $breadcrumbs = $doc('.breadcrumbs .item')
  if (!$breadcrumbs.length) throw new MalformedResponseError(html, 'no $breadcrumbs')

  const cityName = $breadcrumbs.eq(4).find('> a > span').text()
  const areaName = $breadcrumbs.eq(5).find('> a > span').text()

  const address = {
    cityName: lodash.trim(cityName) || null,
    areaName: lodash.trim(areaName) || null
  }

  const $csrfToken = $doc('[data-csrf]')
  if (!$csrfToken.length) throw new MalformedResponseError(html, 'no $csrf')

  const csrfToken = $csrfToken.eq(0).attr('data-csrf') || null

  if (!csrfToken) return null

  const matchUserId = html.match(/"user_id":(\d+),/)
  if (!matchUserId) throw new MalformedResponseError(html, 'no #user_id')

  const userId = matchUserId[1]

  return {
    address,
    userId,
    csrfToken
  }
}

exports.adPhoneNumbers = function(data) {
  if (!lodash.has(data, 'owner')) {
    throw new MalformedResponseError(data, 'no .owner')
  }

  let phoneNumbers = lodash.get(data, 'owner.owner_phones') || []

  phoneNumbers = phoneNumbers
    .map(phoneNumber => phoneNumber.phone_formatted)
    .filter(lodash.trim)

  return phoneNumbers
}

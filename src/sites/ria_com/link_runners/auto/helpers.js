const lodash = require('lodash')
const cheerio = require('cheerio')
const { MalformedResponseError } = __src('runners/errors')

const BASE_URL = 'https://auto.ria.com'
const PAGE_SIZE = 50

exports.buildUrl = function({ link, page = 1 }) {
  const url = {
    baseUrl: BASE_URL,
    uri: '/search/',
    qs: {
      'categories.main.id': link.categoryId,
      'price.currency': 1,
      'abroad.not': 0,
      'custom.not': 1,
      'sellerType': 1,
      'page': page - 1,
      size: PAGE_SIZE
    }
  }

  return url
}

exports.countListPages = function(html) {
  const count = html.match(/\.resultsCount = Number\((\d+)\);/)

  if (!count) {
    throw new MalformedResponseError(html, 'no #resultsCount')
  }

  return +count[1] || 0
}

exports.listAds = function(html) {
  const $doc = cheerio.load(html)

  const $searchResults = $doc('#searchResults')

  if (!$searchResults.length) {
    throw new MalformedResponseError(html, 'no $searchResults')
  }

  const ads = $searchResults.find('.item.ticket-title > a')
    .map(function() {
      const url = $doc(this).attr('href')
      const match = url.match(/(\d+)\.html$/)

      return match && { type: 'auto', url }
    })
    .toArray()

  return ads
}

exports.adInfo = function(html) {
  const $doc = cheerio.load(html)

  const $breadcrumbs = $doc('.breadcrumbs .item')
  if (!$breadcrumbs.length) throw new MalformedResponseError(html, 'no $breadcrumbs')

  const cityName = $breadcrumbs.eq(1).find('> a > span').text()
  const areaName = $breadcrumbs.eq(2).find('> a > span').text()

  const address = {
    cityName: lodash.trim(cityName) || null,
    areaName: lodash.trim(areaName) || null
  }

  const $leftBarView = $doc('#showLeftBarView')
  if (!$leftBarView.length) throw new MalformedResponseError(html, 'no $leftBarView')

  const phoneNumbers = $leftBarView.find('.contact-user [data-phone-number]')
    .map(function() {
      const phoneNumber = $doc(this).attr('data-phone-number')

      return lodash.trim(phoneNumber) || null
    })
    .toArray()

  if (lodash.isEmpty(phoneNumbers)) return null

  return {
    address,
    phoneNumbers
  }
}

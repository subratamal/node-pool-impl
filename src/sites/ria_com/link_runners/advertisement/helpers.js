const lodash = require('lodash')
const cheerio = require('cheerio')
const Crypto = __src('utils/crypto')
const { MalformedResponseError } = __src('runners/errors')

const BASE_URL = 'https://www.ria.com'
const PAGE_SIZE = 50

exports.buildCookies = function() {
  return {
    cookies: {
      items_per_page: PAGE_SIZE
    },
    url: BASE_URL
  }
}

exports.buildUrl = function({ link, price, page }) {
  const url = {
    baseUrl: BASE_URL,
    uri: '/html/search/ajax.php',
    qs: {
      category_id: link.categoryId,
      subcategory_id: 0,
      'price[price_from]': price.start,
      'price[price_till]': price.end
    }
  }

  if (page && page > 1) {
    url.qs.page = page
  }

  return url
}

exports.countListResults = function(data) {
  if (!lodash.has(data, 'count_ads')) {
    throw new MalformedResponseError(data, 'no .count_ads')
  }

  const results = +lodash.get(data, 'count_ads') || 0
  const pages = lodash.ceil(results / PAGE_SIZE)

  return { results, pages }
}

exports.listAds = function(data) {
  if (!lodash.has(data, 'ads')) {
    throw new MalformedResponseError(data, 'no .ads')
  }

  const $doc = cheerio.load(data.ads)

  const ads = $doc('.ticket-item .ticket-title > a')
    .map(function() {
      const url = $doc(this).attr('href')
      const match = url.match(/(\d+)\.html$/)

      return match && { type: 'advertisement', url }
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

  const $userData = $doc('#user_data')
  if (!$userData.length) throw new MalformedResponseError(html, 'no $userData')

  let userData = $userData.html()

  try {
    userData = JSON.parse(lodash.trim(userData))
  } catch (error) {
    throw new MalformedResponseError(html, 'malformed $userData')
  }

  let phoneNumbers = lodash.get(userData, 'phones.checked') || []

  lodash.values(userData.shops).forEach(shop => {
    const shopPhoneNumbers = lodash.get(shop, 'phones.checked')

    if (lodash.isArray(shopPhoneNumbers)) {
      phoneNumbers = phoneNumbers.concat(shopPhoneNumbers)
    }
  })

  phoneNumbers = phoneNumbers
    .filter(phoneNumber => phoneNumber.full)
    .map(phoneNumber => Crypto.decodeBase64(phoneNumber.full))
    .filter(phoneNumber => phoneNumber)

  if (lodash.isEmpty(phoneNumbers)) return null

  phoneNumbers = lodash.uniq(phoneNumbers)

  return {
    address,
    phoneNumbers
  }
}

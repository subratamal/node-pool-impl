const urlparser = require('url')
const lodash = require('lodash')
const cheerio = require('cheerio')
const {
  MalformedResponseError,
  IPBannedError
} = __src('runners/errors')
const CITY_MAPPINGS = require('../constants/city_mappings')

const BASE_URL = exports.BASE_URL = 'https://www.avito.ru'
const PAGE_SIZE = 50
const MAX_PAGES = 100

exports.buildCategoryUrl = function (url) {
  if (!url.startsWith('/')) url = '/' + url

  return {
    baseUrl: BASE_URL,
    uri: url,
    qs: {
      user: 1
    }
  }
}

exports.buildListUrl = function ({
  link,
  price,
  page = 1
}) {
  const url = {
    baseUrl: BASE_URL,
    uri: link.url,
    qs: {
      pmin: price.start,
      pmax: price.end,
      i: 1,
      user: 1
    }
  }

  if (page && page > 1) {
    url.qs.page = page
  }

  return url
}

exports.checkBanned = function (html) {
  const keyword = 'IP-адреса временно ограничен'
  const isBanned = lodash.isString(html) && html.includes(keyword)

  if (isBanned) throw new IPBannedError()
}

exports.isEmptyListResults = function (html) {
  const keyword = 'По вашему запросу ничего не найдено'
  return html && html.includes(keyword)
}

exports.getCategoryLinks = function (html) {
  exports.checkBanned(html)

  const $doc = cheerio.load(html)

  const $catalog = $doc('.catalog-counts')
  if (!$catalog.length) throw new MalformedResponseError(html, 'no $catalog')

  const links = $catalog.find('.catalog-counts__section').eq(0)
    .find('.js-catalog-counts__link')
    .map(function () {
      const href = $doc(this).attr('href')
      const link = urlparser.parse(href).pathname

      return link
    })
    .toArray()

  return links
}

exports.listResults = function (html) {
  exports.checkBanned(html)

  if (exports.isEmptyListResults(html)) {
    return {
      results: 0,
      pages: 0
    }
  }

  const $doc = cheerio.load(html)

  const $breadcrumbs = $doc('.breadcrumbs-link-count')
  if (!$breadcrumbs.length) throw new MalformedResponseError(html, 'no $breadcrumbs')

  let results = $breadcrumbs.text() || ''
  results = +results.replace(/[^0-9]/g, '') || 0

  const pages = Math.min(lodash.ceil(results / PAGE_SIZE), MAX_PAGES)

  return {
    results,
    pages
  }
}

exports.listAds = function (html) {
  exports.checkBanned()

  if (exports.isEmptyListResults(html)) {
    return []
  }

  const $doc = cheerio.load(html)

  const $content = $doc('.catalog-content')
  if (!$content) throw new MalformedResponseError(html, 'no $content')

  const ads = $content.find('.js-catalog-item-enum')
    .map(function () {
      const href = $doc(this).find('.item-description-title-link').attr('href')
      if (!href || !href.startsWith('/')) return null

      const matchId = href.match(/_(\d+?)$/)
      if (!matchId) return null

      const adId = matchId[1]
      const url = BASE_URL + href

      const ad = {
        id: adId,
        url
      }

      return ad
    })
    .toArray()

  return ads
}

exports.adInfo = function (html) {
  exports.checkBanned(html)

  let $doc
  let $locationId
  let cityName

  if (process.env.OPTIMIZED_HTML_PARSE) {
    const locationIdGroups = html.match(/<select id="region"/)
    const groupLength = locationIdGroups && locationIdGroups.length ? locationIdGroups.length : 0
    $locationId = {
      length: groupLength
    }
  } else {
    $doc = cheerio.load(html)
    $locationId = $doc('select[name="location_id"]')
  }

  if (!$locationId.length) throw new MalformedResponseError(html, 'no $locationId')

  if (process.env.OPTIMIZED_HTML_PARSE) {
    const cityNameGroups = html.match(/<select id="region"[^>]*>\s*<option[^>]*>.*<\/option>\s*<option[^>]*>\s*(.*)<\/option><option class="opt-group"/)
    cityName = cityNameGroups && cityNameGroups.length ? cityNameGroups[1] : ''
  } else {
    cityName = $locationId.find('option').eq(1).text() || ''
  }

  if (CITY_MAPPINGS[cityName]) {
    cityName = CITY_MAPPINGS[cityName]
  }

  const textAddress = getAddress($doc, html)

  const address = textAddress.trim()
    .replace(/\s+/, ' ')
    .split(/\s*,\s*/)

  const matchPhoneToken = html.match(/item\.phone\s*=\s*'(.+?)'/)
  const phoneToken = matchPhoneToken && matchPhoneToken[1]

  const matchSearchHash = html.match(/item\.searchHash\s*=\s*'(.+?)'/)
  const searchHash = matchSearchHash && matchSearchHash[1]

  if (cityName && address[0] !== cityName) {
    address.unshift(cityName)
  }

  return {
    address,
    phoneToken,
    searchHash
  }
}

function getAddress($doc, html) {
  let $address

  if (process.env.OPTIMIZED_HTML_PARSE) {
    const addressHTMLGroups = html.match(/(<div class="item-map-location".*)<div class="b-search-map item-map-wrapper js-item-map-wrapper"/s)
    const addressHTML = addressHTMLGroups && addressHTMLGroups.length ? addressHTMLGroups[1] : ''
    $address = cheerio.load(addressHTML)
  } else {
    $address = $doc('.item-map-location')
  }

  if ($address.length) {
    const text = $address.text()
    const keyword = 'Адрес:'

    if (text.includes(keyword)) {
      return text
        .replace(keyword, '').trim()
        .replace('Посмотреть карту', '').trim()
    }
  }

  let address = ''

  if (process.env.OPTIMIZED_HTML_PARSE) {
    const addressGroups = html.match(/<div class="seller-info-value">(.*)<\/div>/s)
    address = addressGroups && addressGroups.length ? addressGroups[1] : ''
    address = address.trim()
  } else {
    $doc('.item-view-seller-info .seller-info-label').each(function () {
      const $label = $doc(this)
      const text = ($label.text() || '').trim()
      const keyword = 'Адрес'

      if (text !== keyword) return true

      $address = $label
        .closest('.seller-info-prop')
        .find('.seller-info-value')

      if ($address.length) {
        address = ($address.text() || '').trim()
      }

      return false
    })
  }

  return address
}

const lodash = require('lodash')
const cheerio = require('cheerio')
const { MalformedResponseError } = __src('runners/errors')
const Crypto = __src('utils/crypto')

const BASE_URL = exports.BASE_URL = 'http://russia.irr.ru'

exports.buildUrl = function({ link, page = 1 }) {
  let path = link.path

  if (!path.endsWith('/')) {
    path = path + '/'
  }

  if (page && page > 1) {
    path += 'page' + page + '/'
  }

  const url = {
    baseUrl: BASE_URL,
    uri: path
  }

  return url
}

exports.countListPages = function(html) {
  const $doc = cheerio.load(html)

  const $pager = $doc('.pagination__pagesItem')
  if (!$pager.length) throw new MalformedResponseError(html, 'no $pager')

  const pages = $pager.last().text()

  return +lodash.trim(pages) || 0
}

exports.listAds = function(html) {
  const $doc = cheerio.load(html)

  const $listing = $doc('#listing')
  if (!$listing.length) throw new MalformedResponseError(html, 'no $listing')

  const ads = $listing.find('.listing__item a.listing__itemTitle')
    .map(function() {
      const href = $doc(this).attr('href')
      if (!href) return null

      const matchId = href.match(/-advert(\d+?)\.html$/)
      if (!matchId) return null

      return { id: matchId[1], url: href }
    })
    .toArray()

  return ads
}

exports.adInfo = function (html) {
  const $doc = cheerio.load(html)

  const $sidebar = $doc('.siteBody__sidebar')
  if (!$sidebar.length) throw new MalformedResponseError(html, 'no $sidebar')

  const phoneBase64 = $sidebar.find('input[name="phoneBase64"]').val()

  if (lodash.isEmpty(phoneBase64)) return null

  const phoneNumber = Crypto.decodeBase64(phoneBase64)

  if (!phoneNumber) return null

  let textAddress = $sidebar.find('.productPage__infoTextBold.js-scrollToMap').text()

  textAddress = (textAddress || '').trim().split(/\s*,\s*/)

  const address = {
    districtName: textAddress[1] || ''
  }

  const phoneNumbers = [phoneNumber]

  return { address, phoneNumbers }
}

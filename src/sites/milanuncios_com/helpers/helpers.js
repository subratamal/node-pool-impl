const lodash = require('lodash')
const cheerio = require('cheerio')
const { MalformedResponseError } = __src('runners/errors')

const BASE_URL = exports.BASE_URL = 'https://www.milanuncios.com'

const PAGE_SIZE = 30
const MAX_PAGES = 199

exports.buildUrl = function({ link, price, page }) {
  const url = {
    baseUrl: BASE_URL,
    uri: link.path,
    qs: {
      'desde': price.start,
      'hasta': price.end
    }
  }

  lodash.assign(url.qs, link.params)

  if (page && page > 1) {
    url.qs['pagina'] = page
  }

  return url
}

exports.hasListError = function(html) {
  const keyword = 'Se ha producido un error a la hora de recuperar los anuncios'

  return lodash.isString(html) && html.includes(keyword)
}

exports.checkCaptcha = function(html) {
  if (!lodash.isString(html)) return

  const keyword = [
    'Tras completar el siguiente captcha',
    'distil_r_captcha.html'
  ]

  const isCaptcha = html.includes(keyword[0]) ||
    html.includes(keyword[1])

  if (isCaptcha) {
    throw new MalformedResponseError(null, 'captcha required')
  }
}

exports.listResults = function(html) {
  exports.checkCaptcha(html)

  if (exports.hasListError(html)) return { error: true }

  const match = html.match(/Encontrados((.|\n)+?)anuncios/)
  if (!match) throw new MalformedResponseError(html, 'no #counter')

  const results = +match[0].replace(/[^\d]/g, '')

  if (lodash.isNaN(results)) throw new MalformedResponseError(html, 'malformed #counter')

  const pages = Math.min(lodash.ceil(results, PAGE_SIZE), MAX_PAGES)

  return { results, pages }
}

exports.listAds = function(html) {
  exports.checkCaptcha(html)

  const $doc = cheerio.load(html)

  // not found page will be redirected to home page
  // so checking for ".cabHome"
  if ($doc('.cabHome').length) return []

  const $container = $doc('#cuerpo')
  if (!$container.length) throw new MalformedResponseError(html, 'no $container')

  const ads = $container.find('.aditem')
    .map(function() {
      const $item = $doc(this)

      // check if has phone numbers

      const $phoneIcon = $item.find('.icon-white-phone')
      if (!$phoneIcon.length) return null

      // id

      let textId = $item.find('.aditem-footer a.highlighted-button').attr('href') || ''
      textId = textId.match(/od\((\d+?),\s*(\d)\)/)

      if (!textId) return null

      const id = textId[1]
      const usePhoneProxy = textId[2]

      // location

      let textLocation = $item.find('.aditem-header .x4').text()
      textLocation = textLocation.match(/\(\s*(.+?)\s*\)$/)

      const areaName = lodash.get(textLocation, '1') || null

      return {
        id,
        usePhoneProxy,
        address: { areaName }
      }
    })
    .toArray()

  return ads
}

exports.adInfo = function(html) {
  exports.checkCaptcha(html)

  const matches = html.match(/document.write\('(.+?)'\)/g)

  if (lodash.isEmpty(matches)) throw new MalformedResponseError(html, 'no #document.write')

  const phoneNumbers = matches
    .map(match => match.replace(/(document\.write\('|'\))/g, ''))
    .map(unescape)
    .map(html => html.replace(/[^\d]/g, ''))
    .filter(lodash.trim)

  if (lodash.isEmpty(phoneNumbers)) return null

  return { phoneNumbers }
}

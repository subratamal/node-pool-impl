const lodash = require('lodash')
const cheerio = require('cheerio')
const htmlToText = require('html-to-text')
const { MalformedResponseError } = __src('runners/errors')

const AD_BASE_URL = 'http://www.vivastreet.co.uk'
const SEARCH_BASE_URL = 'http://search.vivastreet.co.uk'

const PAGE_SIZE = 35

exports.buildUrl = function({ link, page }) {
  let path = link.path

  if (page && page > 1) {
    path += '/t+' + page
  }

  const url = {
    baseUrl: SEARCH_BASE_URL,
    uri: path,
    qs: {
      'lb': 'new',
      'search': 1,
      'searchGeoId': 0,
      'start_field': 1,
      'end_field': '',
      'select-this': '',
      'offer_type': 'offer'
    }
  }

  return url
}

exports.countListPages = function(html) {
  const $doc = cheerio.load(html)

  const $toolbar = $doc('#toolbar')
  if (!$toolbar.length) throw new MalformedResponseError(html, 'no $toolbar')

  const $results = $toolbar.find('.toolbar_tab_selected')

  const results = +lodash.trim($results.text()).replace(/[^\d]/g, '') || 0

  const pages = lodash.ceil(results / PAGE_SIZE)

  return pages
}

exports.listAds = function(html) {
  const $doc = cheerio.load(html)

  const $container = $doc('#classified_table')
  if (!$container.length) throw new MalformedResponseError(html, 'no $container')

  const ads = $container.find('.kiwii-clad-row')
    .map(function() {
      const $item = $doc(this)

      let url = $item.find('.classified-link').eq(0).attr('href') || ''
      const match = url.match(/\/(\d+)?$/)

      const id = match && match[1]
      if (!id) return null

      if (url.startsWith('/')) {
        url = AD_BASE_URL + url
      }

      return { id, url }
    })
    .toArray()

  return ads
}

exports.adInfo = function(html) {
  const $doc = cheerio.load(html)

  const $info = $doc('#classified-detail-block')
  if (!$info.length) throw new MalformedResponseError(html, 'no $info')

  let textAddress = null

  $info.find('table tr').each(function() {
    const $item = $doc(this)

    const label = lodash.trim($item.find('td').eq(0).text())

    if (label.toLowerCase() === 'postcode') {
      textAddress = lodash.trim($item.find('td').eq(1).html())
      textAddress = htmlToText.fromString(textAddress)

      return false
    }

    return true
  })

  // skip ad that has no address
  if (lodash.isEmpty(textAddress)) return null

  const address = lodash.uniq(textAddress.split(/\s*\n\s*/))

  const $contact = $info.find('#contact_form_mini_bottom')
  const textSecuredNumber = $contact.find('.vs-phone-button .safe-to-call').text() || ''

  const isSecuredNumber = textSecuredNumber.includes('Vivastreet Secured Number')

  // skip ad that has secured number
  if (isSecuredNumber) return null

  const phoneNumber = $contact.find('[data-phone-number]').attr('data-phone-number')
  const phoneUrl = $contact.find('[data-vivaphone-request-url]').attr('data-vivaphone-request-url')

  // skip ad that has no phone url
  if (!phoneNumber && !phoneUrl) return null

  return {
    address,
    phoneNumber,
    phoneUrl
  }
}

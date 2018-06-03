const lodash = require('lodash')
const cheerio = require('cheerio')
const { MalformedResponseError } = __src('runners/errors')

const BASE_URL = exports.BASE_URL = 'https://www.olx.ua'

exports.buildUrl = function({ link, price, page }) {
  const url = {
    baseUrl: BASE_URL,
    url: '/' + link.category,
    qs: {
      'search[private_business]': 'private'
    }
  }

  if (link.single) {
    url.qs['search[filter_float_price:from]'] = link.params['price_from']
  } else {
    url.qs['search[filter_float_price:from]'] = price.start
    url.qs['search[filter_float_price:to]'] = price.end
  }

  if (page && page > 1) {
    url.qs['page'] = page
  }

  return url
}

exports.isNotFound = function(html) {
  if (!lodash.isString(html)) return false

  const keywords = [
    'Простите, но данное объявление больше не доступно',
    'Извините, страница не найдена'
  ]

  for (const keyword of keywords) {
    if (html.includes(keyword)) return true
  }

  return false
}

exports.isEmptyListRestuls = function(html) {
  if (!lodash.isString(html)) return false

  const keywords = [
    'Ничего не найдено',
    'попробуйте изменить критерии поиска'
  ]

  return html.includes(keywords[0]) && html.includes(keywords[1])
}

exports.countListResults = function(html) {
  if (exports.isEmptyListRestuls(html)) return 0

  const $doc = cheerio.load(html)
  const $counters = $doc('#topLink .inner ul li.visible .counter')

  if (!$counters.length) {
    throw new MalformedResponseError(html, 'no $counters')
  }

  const results = lodash.sum($counters.map(function() {
    const text = ($doc(this).text() || '').replace(/[^0-9]/g, '')

    return (+text) || 0
  }))

  return results
}

exports.countListPages = function(html) {
  if (exports.isEmptyListRestuls(html)) return 0

  const $doc = cheerio.load(html)
  const $item = $doc('.pager .item').last()
  const $list = $doc('.listHandler')

  if (!$item.length) {
    // NOTE: olx.ua doesn't show pager in case search results has only 1 page
    // so use $list exsistance for checking malformed HTML instead
    // if $list exists, return 1 page as the result.
    if ($list.length > 0) return 1

    throw new MalformedResponseError(html, 'no $pager nor $list')
  }

  const page = ($item.text() || '').replace(/[^0-9]/g, '')

  return (+page) || 0
}

exports.listAds = function(html, { page }) {
  const $doc = cheerio.load(html)
  const $ads = $doc('.offers .offer a.thumb.detailsLink')

  if (!$ads.length) {
    throw new MalformedResponseError(html, 'no $offers')
  }

  const ads = $ads
    .map(function() {
      const paid = $doc(this).find('span.paid').length > 0
      const url = lodash.trim($doc(this).attr('href')).replace(/#.+?$/, '')
      const id = lodash.get(url.match(/-ID([a-zA-Z0-9]+?)\.html/), 1)

      return { id, url, paid }
    })
    .toArray()
    // paid ads are repeated every page
    // so only scrape paid ads for the first page
    .filter(ad => !ad.paid || page === 1)

  return ads
}

exports.adInfo = function(html) {
  if (exports.isNotFound(html)) return null

  const match = html.match(/var\s+phoneToken\s*=\s*'(.+?)';/)

  const phoneToken = match && match[1]
  if (!phoneToken) return null

  const $doc = cheerio.load(html)

  const hasPhoneNumber = $doc('.contact-button.link-phone').length > 0

  if (!hasPhoneNumber) return null

  const info = {
    phoneToken
  }

  const textAddress = lodash.trim($doc('.show-map-link strong').text())

  if (textAddress) {
    info.address = textAddress.split(/\s*,\s*/)
  } else {
    info.address = []
  }

  return info
}

exports.adPhoneNumbers = function(data) {
  if (exports.isNotFound(data)) return null

  const phoneRaw = lodash.get(data, 'value') || ''

  /* supported phone number matches:
    phone number in HTML: <span class="ba()">(0612) 521-243</span><span class="ba()">0612-521-243</span><span class="ba()">0612 521243</span><span class="ba()">(0612) 521 243</span><span class="ba()">0612521243</span>
    comma separated phone number: (0612) 521-243, 0612-521-243, ...
    single phone number: (0612) 521-243
    single phone number: (0612) 521 243
    single phone number: (0612) 521243
    single phone number: 0612-521-243
    single phone number: 0612 521-243
    single phone number: 0612 521 243
    single phone number: 0612521243
  */
  const phoneNumbers = phoneRaw.match(/(\b|\()([0-9 \-)]{7,})\b/g)

  if (lodash.isEmpty(phoneNumbers)) {
    throw new MalformedResponseError(data, 'empty phone numbers')
  }

  return phoneNumbers
}

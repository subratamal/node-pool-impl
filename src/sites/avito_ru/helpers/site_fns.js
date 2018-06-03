exports.honeDemixer = function(e, t) {
	if(!t) return ''
	var o = t.match(/[0-9a-f]+/g)
	var i = (e % 2 == 0 ? o.reverse() : o).join('')
	var r = i.length
	var a = ''
	for(var n = 0; n < r; ++n) {
		if (n % 3 == 0) {
			a += i.substring(n, n + 1)
		}
	}
	return a
}

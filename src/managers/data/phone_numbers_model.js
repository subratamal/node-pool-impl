const mongoose = require('mongoose')

const phoneNumbersSchema = new mongoose.Schema({
	number: Number,
	city_id: Number,
	area_id: Number,
	district_id: Number,
	country_code: String,
	postal_code_id: Number,
	deleted_at: Date,
	created_at: Date,
	updated_at: Date
})

module.exports = mongoose.model('PhoneNumbers', phoneNumbersSchema)

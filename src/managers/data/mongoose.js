const mongoose = require('mongoose')
const Config = __src('config')

class Database {

	constructor() {
		// this._connect()
	}

	_connect() {
		const connectionStr = this._getConnectionString()
		mongoose.connect(connectionStr)
	}

	_getConnectionString() {
		const dbConfig = Config.sub('mongo_db')
		// mongodb://${dbConfig.get('username')}:${dbConfig.get('password')}@${dbConfig.get('host')}:${dbConfig.get('port')}/${dbConfig.get('name')}?authSource=${dbConfig.get('authenticationDatabase')}

		const username = dbConfig.get('username')
		const password = dbConfig.get('password')
		const authSource = dbConfig.get('authenticationDatabase')
		const host = dbConfig.get('host')
		const port = dbConfig.get('port')
		const name = dbConfig.get('name')

		const placeholderBasicConnectionStr = `${host}:${port}/${name}`
		let placeholderUserPass = ''
		let placeholderAuthSource = ''

		if (username) {
			placeholderUserPass = `${username}:${password}@`
		}

		if (authSource) {
			placeholderAuthSource += `?authSource=${authSource}`
		}

		return `mongodb://${placeholderUserPass}${placeholderBasicConnectionStr}${placeholderAuthSource}`
	}

}

module.exports = new Database()

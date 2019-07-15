// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('Version', new Schema({
	version: { type: String, required: true, uppercase: true },
	description: { type: String, required: false, uppercase: false },
	releaseDate: { type: Number, required: true, default: Date.now() }
}));
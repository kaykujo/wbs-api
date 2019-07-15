// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('Dun', new Schema({
	dunCode: { type: String, required: true, uppercase: true },
	dunName: { type: String, required: true, uppercase: false },
	parCode: { type: String, required: true, uppercase: true },
	stateCode: { type: String, required: true, uppercase: true },
	isActive: { type: Boolean, required: true, default: true }
}));
// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('Par', new Schema({
	parCode: { type: String, required: true, uppercase: true },
	parName: { type: String, required: true, uppercase: false },
	stateCode: { type: String, required: true, uppercase: true },
	isActive: { type: Boolean, required: true, default: true }
}));
// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('Dm', new Schema({
	dmCode: { type: String, required: true, uppercase: true },
	dmName: { type: String, required: true, uppercase: false },
	dunCode: { type: String, required: true, uppercase: true },
	parCode: { type: String, required: true, uppercase: true },
	stateCode: { type: String, required: true, uppercase: true },
	isActive: { type: Boolean, required: true, default: true }
}));
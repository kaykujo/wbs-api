// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('State', new Schema({
	stateCode: { type: String, required: true, uppercase: true },
	stateName: { type: String, required: true, uppercase: false },
	isActive: { type: Boolean, required: true, default: true }
}));
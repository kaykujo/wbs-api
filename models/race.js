// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('Race', new Schema({
	raceCode: { type: String, required: true, uppercase: true },
	raceName: { type: String, required: true, uppercase: false },
	isActive: { type: Boolean, required: true, default: true }
}));
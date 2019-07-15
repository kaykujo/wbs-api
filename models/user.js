// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('User', new Schema({
	userName: { type: String, required: true, uppercase: false },
	passwordHash: { type: String, required: true, uppercase: false },
	dateLastLogin: { type: Number, required: true, default: Date.now() },
	dateCreated: { type: Number, required: true, default: Date.now() },
	dateUpdated: { type: Number, required: true, default: Date.now() },
	isActive: { type: Boolean, required: true, default: false }
}));
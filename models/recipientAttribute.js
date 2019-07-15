// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('RecipientAttribute', new Schema({
	attributeName: { type: String, required: true, uppercase: true },
	createdDate: { type: Number, required: true, default: Date.now() },
	updatedDate: { type: Number, required: true, default: Date.now() },
	isActive: { type: Boolean, required: true }
}));
// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('ControlList', new Schema({
	phoneNumber: { type: String, required: true, uppercase: false },
	status: { type: String, required: true, uppercase: false },
	createdDate: { type: Number, required: true, default: Date.now() },
	updatedDate: { type: Number, required: true, default: Date.now() }
}));

// Control List Status Codes
// ===============================
// === Active                  ===
// === Inactive                ===
// ===============================
// END
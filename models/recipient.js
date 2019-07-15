// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('Recipient', new Schema({
	phoneNumber: { type: String, required: true, uppercase: false },
	stateCode: { type: String, required: true, uppercase: false },
	parCode: { type: String, required: true, uppercase: false },
	dunCode: { type: String, required: true, uppercase: false },
	dmCode: { type: String, required: true, uppercase: false },
	raceCode: { type: String, required: true, uppercase: false },
	attributes: { type: Schema.Types.Mixed, required: false },
	dob: { type: String, required: false, uppercase: false },
	gender: { type: String, required: false, uppercase: false },
	status: { type: String, required: true, uppercase: false },
	createdDate: { type: Number, required: true, default: Date.now() },
	updatedDate: { type: Number, required: true, default: Date.now() }
}));

// Recipient Status Codes
// ===============================
// === Active                  ===
// === Inactive                ===
// ===============================
// END
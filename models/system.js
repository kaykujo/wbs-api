// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('System', new Schema({
	status: { type: String, required: true, uppercase: false },
	updatedBy: { type: String, required: true, uppercase: false },
	updatedDate: { type: Number, required: true, default: Date.now() }
}));

// System Status Codes
// ===============================
// === Start                   ===
// === Stop			               ===
// === Off			               ===
// ===============================
// END
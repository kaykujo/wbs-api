// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('CampaignHeader', new Schema({
	campaignName: { type: String, required: true, uppercase: false },
	campaignId: { type: Number, required: true, unique: true, maxlength: 7 },
	startDate: { type: Number, required: true },
	completedDate: { type: Number, required: false },
	status: { type: String, required: true, uppercase: false },
	createdDate: { type: Number, required: true, default: Date.now() },
	updatedDate: { type: Number, required: false, default: Date.now() },
	createdBy: { type: String, required: true, uppercase: false },
	updatedBy: { type: String, required: false, uppercase: false }
}));

// Campaign Header Status Codes
// ===============================
// === Draft                   ===
// === Published               ===
// === Completed							 ===
// === Cancelled               ===
// === Deleted                 ===
// ===============================
// END
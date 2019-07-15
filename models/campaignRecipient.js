// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('CampaignRecipient', new Schema({
	headerId: { type: Schema.Types.ObjectId, required: true, ref: 'CampaignHeader' },
	settingId: { type: Schema.Types.ObjectId, required: true, ref: 'CampaignSetting' },
	phoneNumber: { type: String, required: true, uppercase: false },
	stateCode: { type: String, required: true, uppercase: false },
	parCode: { type: String, required: true, uppercase: false },
	dunCode: { type: String, required: true, uppercase: false },
	dmCode: { type: String, required: true, uppercase: false },
	raceCode: { type: String, required: true, uppercase: false },
	attributes: { type: Schema.Types.Array, required: false },
	dob: { type: String, required: false, uppercase: false },
	gender: { type: String, required: false, uppercase: false },
	status: { type: String, required: true, uppercase: false },
	attemptDate: { type: Number, required: false },
	downloadedBy: { type: String, required: false, uppercase: true },
	createdDate: { type: Number, required: true, default: Date.now() }
}));

// Campaign Recipient Status Codes
// ===============================
// === Waiting                 ===
// === Downloaded              ===
// === Sent                    ===
// === Failed                  ===
// === Deleted                 ===
// ===============================
// END
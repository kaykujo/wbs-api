// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('CurrentProcess', new Schema({
	machine: { type: String, required: true, uppercase: true },
	process: { type: String, required: true, uppercase: false },
	createdDate: { type: Number, required: true, default: Date.now() },
	headerId: { type: Schema.Types.ObjectId, required: false, ref: 'CampaignHeader' },
	settingId: { type: Schema.Types.ObjectId, required: false, ref: 'CampaignSetting' },
	updatedDate: { type: Number, required: true, default: Date.now() },
	status: { type: String, required: true, uppercase: false }
}));

// Machine Process Codes
// ===============================
// === StandBy                 ===
// === Downloading             ===
// === Created                 ===
// === Sending                 ===
// === Resting								 ===
// ===============================
// END

// Machine Status Codes
// ===============================
// === Active                  ===
// === Inactive                ===
// ===============================
// END
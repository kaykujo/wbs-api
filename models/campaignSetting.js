// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('CampaignSetting', new Schema({
	settingName: { type: String, required: true, uppercase: false },
	headerId: { type: Schema.Types.ObjectId, required: true, ref: 'CampaignHeader' },
	machine: { type: Schema.Types.Mixed, required: true },
	target: [{
		type: { type: String, required: true, uppercase: false },
		data: { type: Schema.Types.Mixed, required: true }
	}],
	contents: [{
		type: { type: String, required: true, uppercase: false },
		data: { type: String, required: true, uppercase: false }
	}],
	limit: { type: Number, required: true, default: 0 },
	recordStart: { type: Number, required: true, default: 0 },
	downloaded: { type: Number, required: true, default: 0 },
	status: { type: String, required: true, uppercase: false },
	startDate: { type: Number, required: true },
	completedDate: { type: Number, required: false },
	createdDate: { type: Number, required: true, default: Date.now() },
	updatedDate: { type: Number, required: true, default: Date.now() },
	createdBy: { type: String, required: true, uppercase: false },
	updatedBy: { type: String, required: false, uppercase: false }
}));

// Campaign Setting Status Codes
// ===============================
// === Draft                   ===
// === Ready                   ===
// === Downloaded              ===
// === Running                 ===
// === Cancelled               ===
// === Deleted                 ===
// === Completed               ===
// ===============================
// END

// Campaign Setting Content Types
// ===============================
// === media                   ===
// === file                    ===
// === text                    ===
// ===============================
// END

// Campaign Target Types
// =================================
// === state                     ===
// === par                       ===
// === dun                       ===
// === dm                        ===
// === race                      ===
// === attribute                 ===
// =================================
// END

// Campaign Target Sample #1
// ======================================================
// === Condition: Parliament P001, P002 and P004 only ===
// ...
// ...
// [
// 	{ type: 'par', data: ['P001','P002','P044'] }
// ]
// ...
// ======================================================
// END

// Campaign Target Sample #2
// =====================================================
// === Condition: DUN N01 under Parliament P122 only ===
// ...
// ...
// [
//	{ type: 'par', data: ['P122'] },
//	{ type: 'dun', data: ['N01'] }
// ]
// ...
// =====================================================
// END

// Campaign Target Sample #3
// =========================================================
// === Condition: Malay in Parliament P001 and P004 only ===
// ...
// ...
// [
//	{ type: 'par', data: ['P001','P004'] },
//	{ type: 'race', data: ['M'] }
// ]
// ...
// =========================================================
// END
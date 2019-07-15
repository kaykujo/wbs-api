// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model('CampaignTargetType', new Schema({
	type: { type: String, required: true, uppercase: true },
	isActive: { type: Boolean, required: true, default: true }
}));

// Campaign Target Types
// =================================
// === STATE                     ===
// === PAR                       ===
// === DUN                       ===
// === DM                        ===
// === RACE                      ===
// === ATTRIBUTE                 ===
// =================================
// END
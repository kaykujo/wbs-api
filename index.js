// Include the cluster module
const cluster = require('cluster');

// Code to run if we're in the master process
if (cluster.isMaster) {
	// Count the machine's CPUs
	const cpuCount = require('os').cpus().length;

	// Create a worker for each CPU
	for (var i = 0; i < cpuCount; i += 1) {
		cluster.fork();
	}
	// Code to run if we're in a worker process
} else {
	const express = require('express');
	const bodyParser = require('body-parser');
	const logger = require('morgan');
	const dotenv = require('dotenv');
	const mongoose = require('mongoose');
	const morgan = require('morgan');
	const cors = require('cors');
	const jwt = require('jsonwebtoken');
	const bcrypt = require('bcrypt');
	const saltRounds = 5;
	const fs = require('fs');
	const request = require('request');
	const path = require('path');
	const fileUpload = require('express-fileupload');
	const app = express();

	var CampaignHeader = require('./models/campaignHeader');
	var CampaignRecipient = require('./models/campaignRecipient');
	var CampaignSetting = require('./models/campaignSetting');
	var CurrentProcess = require('./models/currentProcess');
	var Dm = require('./models/dm');
	var Dun = require('./models/dun');
	var Par = require('./models/par');
	var Race = require('./models/race');
	var ControlList = require('./models/controlList');
	var Recipient = require('./models/recipient');
	var RecipientAttribute = require('./models/recipientAttribute');
	var State = require('./models/state');
	var System = require('./models/system');
	var Version = require('./models/version');
	var TargetType = require('./models/targetType');
	var User = require('./models/user');

	app.use(fileUpload());
	app.use(cors());

	//# ========================
	//# Configuration ==========
	//# ========================
	dotenv.load({ path: path.join(__dirname, '.env') });
	mongoose.connect(process.env.MONGODB_URI).then(function () {
		console.log(new Date().toLocaleString() + ': Connect to DB success');
	}).catch(function (err) {
		console.error(new Date().toLocaleString() + ': Error connecting to DB : ' + err);
		throw err;
	});

	const assetFolderPath = path.join(__dirname, '/assets');
	if (fs.existsSync(assetFolderPath)) { console.log(new Date().toLocaleString() + ': Assets folder already exists'); }
	else {
		fs.mkdirSync(assetFolderPath);
		console.log(new Date().toLocaleString() + ': Assets folder created');
	}

	System.findOne({

	}, function (err, systemData) {
		if (err) {
			console.error(new Date().toLocaleString() + ': Error inititiating system (find)');
			throw err;
		}
		else if (!systemData) {
			var newSystem = new System({
				status: 'Off',
				updatedBy: 'kujo',
				updatedDate: Date.now()
			});

			newSystem.save().then(function (systemSave) {
				console.log(new Date().toLocaleString() + ': System initiated');
			});
		}
		else {
			console.log(new Date().toLocaleString() + ': System already initiated');
		}
	});

	app.set('superSecret', process.env.TOKEN_SECRET);
	app.use(bodyParser.json({ limit: '50mb' }));
	app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
	app.use(express.static(path.join(__dirname, '/static')));
	// app.use(morgan('dev'));

	app.get('/', function (req, res) { res.send('Request error.'); });

	var apiRoutes = express.Router();

	//# =======================
	//# Auth Routes ===========
	//# =======================

	// Web: Create user
	apiRoutes.post('/createuser', function (req, res) {
		var prmToken = req.headers['x-access-token'] || '';
		var prmUserName = req.body.username || '';
		var prmUserPassword = req.body.password || '';

		if (prmToken != process.env.APP_TOKEN || prmUserPassword == '' || prmUserName == '') {
			res.status(400).json({ success: false, message: 'Bad Request' });
		}
		else {
			User.findOne({
				userName: prmUserName
			}, function (err, userData) {
				if (err) { res.status(500).json({ success: false, message: 'Internal Error', error: err }); }
				else if (userData) {
					res.status(409).json({ success: false, message: 'User already exist' });
				}
				else {
					bcrypt.hash(prmUserPassword, saltRounds, function (err, hash) {
						if (err) { res.status(500).json({ success: false, message: 'Internal Error', error: err }); }
						else {
							var newUser = new User({
								userName: prmUserName,
								passwordHash: hash,
								dateLastLogin: Date.now(),
								dateCreated: Date.now(),
								dateUpdated: Date.now(),
								isActive: true
							});
							newUser.save(function (err) {
								if (err) { res.status(500).json({ success: false, message: 'Internal Error', error: err }); }
								else {
									res.json({ success: true, message: 'User created' });
								}
							});
						}
					});
				}
			});
		}
	});

	// Web: Login
	apiRoutes.post('/authuser', function (req, res) {
		var prmToken = req.headers['x-access-token'] || '';
		var prmUserName = req.body.username;
		var prmUserPassword = req.body.password;

		if (prmToken != process.env.APP_TOKEN || prmUserPassword == '' || prmUserName == '') {
			res.status(400).json({ success: false, message: 'Invalid parameters' });
		}
		else {
			User.findOne({
				userName: prmUserName,
				isActive: true
			}, function (err, userData) {
				if (err) { res.status(500).json({ success: false, message: 'Internal error', error: err }); }
				else if (!userData) { res.status(404).json({ success: false, message: 'Invalid username/password' }); }
				else if (userData) {
					// Check if password matches
					bcrypt.compare(prmUserPassword, userData.passwordHash, function (err, retVal) {
						if (retVal == true) {
							// If user is found and password is right, create a token
							var token = jwt.sign(userData.toJSON(), app.get('superSecret'), {
								expiresIn: 86400 // expires in 24 hours
							});
							userData.dateLastLogin = Date.now();
							userData.save();
							var decoded = jwt.decode(token);

							// Return the information including token as JSON
							res.json({
								success: true,
								token: token,
								expiry: decoded.exp
							});
						}
						else {
							res.status(400).json({ success: false, message: 'Invalid email/password' });
						}
					});
				}
			});
		}
	});

	//# =======================
	//# Auth Middleware =======
	//# =======================
	apiRoutes.use(function (req, res, next) {
		// Check header or url parameters or post parameters for token
		var token = req.headers['x-access-token'] || req.query.token;
		var origin = req.body.origin || req.query.origin;

		if (!token || !origin) {
			console.error(new Date().toLocaleString() + ': ERROR : ' + req.ip + ' : ' + req.url + ' : ' + 'Unauthorized Request, Invalid Token/Origin');
			return res.status(400).json({ success: false, message: 'Unauthorized Request' });
		}
		else {
			if (origin == 'Phone' || origin == 'Node' || origin == 'Dashboard') {
				// verify token
				if (token != process.env.APP_TOKEN) {
					console.error(new Date().toLocaleString() + ': ERROR : ' + req.ip + ' : ' + req.url + ' : ' + 'Unauthorized Request, Phone/Node/Dashboard Invalid Token');
					return res.status(400).json({ success: false, message: 'Unauthorized Request' });
				}
				else { next(); }
			}
			else if (origin == 'Web') {
				// Verifies secret and checks expiry
				jwt.verify(token, app.get('superSecret'), function (err, decoded) {
					if (err) {
						console.error(new Date().toLocaleString() + ': ERROR : ' + req.ip + ' : ' + req.url + ' : ' + 'Unauthorized Request, Web Token Error');
						return res.status(400).json({ success: false, message: 'Unauthorized Request', error: err });
					}
					else {
						req.decoded = decoded;
						if (decoded.isActive) {
							next();
						}
						else {
							console.error(new Date().toLocaleString() + ': ERROR : ' + req.ip + ' : ' + req.url + ' : ' + 'Unauthorized Request, Web User Inactive');
							return res.status(400).json({ success: false, message: 'Unauthorized Request' });
						}
					}
				});
			}
			else {
				console.error(new Date().toLocaleString() + ': ERROR : ' + req.ip + ' : ' + req.url + ' : ' + 'Unauthorized Request, Origin Error');
				return res.status(400).json({ success: false, message: 'Unauthorized Request' });
			}
		}
	});

	//# =======================
	//# Start Routes ==========
	//# =======================

	// Node: Check system status
	apiRoutes.post('/systemstatus', function (req, res) {
		System.findOne({

		}, function (err, systemData) {
			if (err) { res.json({ statusCode: 500, success: false, message: 'Server error', error: err }); }
			else {
				if (!systemData) {
					res.json({ statusCode: 404, success: false, message: 'No status found' });
				}
				else {
					res.json({
						statusCode: 200,
						success: true,
						message: 'System status returned',
						status: systemData.status
					});
				}
			}
		});
	});

	// Node: Check runnning campaign
	apiRoutes.post('/checkcampaign', function (req, res) {
		var prmMachineNo = req.body.machineNo || '';

		if (prmMachineNo == '') {
			res.json({ statusCode: 400, success: false, message: 'Invalid parameters' });
		}
		else {
			CurrentProcess.findOne({
				machine: prmMachineNo
			}, function (err, currentProcessData) {
				if (err) { res.json({ statusCode: 500, success: false, message: 'Server error', error: err }); }
				else {
					if (!currentProcessData) {
						console.error(new Date().toLocaleString() + ': ERROR : No process found (check)');
						res.json({ statusCode: 404, success: false, message: 'No process found' });
					}
					else {
						var message = 'Current process error';
						switch (currentProcessData.process) {
							case 'StandBy':
								message = 'Machine is in standby'
								break;
							case 'Downloading':
								message = 'Machine is currently downloading recipients'
								break;
							case 'Created':
								message = 'Machine is ready to send messages'
								break;
							case 'Sending':
								message = 'Machine is currently sending messages'
								break;
							case 'Resting':
								message = 'Machine is currently resting'
								break;
							default:
								break;
						}

						if (currentProcessData.process != 'Created') {
							res.json({
								statusCode: 400,
								success: false,
								message: message,
								lastUpdate: currentProcessData.updatedDate
							});
						}
						else {
							res.json({
								statusCode: 200,
								success: true,
								message: 'Ready to send messages',
								lastUpdate: currentProcessData.updatedDate,
								headerId: currentProcessData.headerId,
								settingId: currentProcessData.settingId
							});
						}
					}
				}
			});
		}
	});

	// Node: Get runnning campaign
	apiRoutes.post('/getcampaign', function (req, res) {
		var prmMachineNo = req.body.machineNo || '';
		var prmHeaderId = req.body.headerId || '';
		var prmSettingId = req.body.settingId || '';

		if (prmMachineNo == '' || prmHeaderId == '' || prmSettingId == '') {
			console.error(new Date().toLocaleString() + ': ERROR : Invalid parameters');
			res.status(400).json({ success: false, message: 'Invalid parameters' });
		}
		else {
			CurrentProcess.findOne({
				machine: prmMachineNo,
				process: 'Created'
			}, function (err, currentProcessData) {
				if (err) { res.json({ statusCode: 500, success: false, message: 'Server error', error: err }); }
				else {
					if (!currentProcessData) {
						console.error(new Date().toLocaleString() + ': ERROR : No process found (get)');
						res.json({ statusCode: 404, success: false, message: 'No process found' });
					}
					else {
						CampaignSetting.findOne({
							_id: currentProcessData.settingId,
							headerId: currentProcessData.headerId,
							machine: prmMachineNo
						}, function (err, campaignSettingData) {
							if (err) { res.json({ statusCode: 500, success: false, message: 'Server error', error: err }); }
							else {
								if (!campaignSettingData) {
									res.json({ statusCode: 404, success: false, message: 'No campaign found' });
								}
								else {
									media = [];
									contents = campaignSettingData.contents

									CampaignRecipient.find({
										headerId: campaignSettingData.headerId,
										settingId: campaignSettingData._id,
										status: 'Downloaded',
										downloadedBy: prmMachineNo
									}, function (err, campaignRecipientData) {
										if (err) { res.json({ statusCode: 500, success: false, message: 'Server error', error: err }); }
										else {
											if (campaignRecipientData.length <= 0) {
												res.json({ statusCode: 404, success: false, message: 'No recipient found' });
											}
											else {
												recipients = [];
												campaignRecipientData.forEach(rcp => {
													recipients.push(rcp.phoneNumber);
												});
												res.json({
													statusCode: 200,
													success: true,
													message: 'Campaign returned',
													headerId: prmHeaderId,
													settingId: prmSettingId,
													contents: contents,
													recipients: recipients
												});
											}
										}
									});
								}
							}
						});
					}
				}
			});
		}
	});

	// Node: Download campaign media
	apiRoutes.get('/downloadmedia', function (req, res) {
		var prmMachineNo = req.query.machineNo || '';
		var prmSettingId = req.query.settingId || '';
		var prmFileName = req.query.fileName || '';

		if (prmMachineNo == '' || prmFileName == '' || prmSettingId == '') {
			res.json({ statusCode: 400, success: false, message: 'Invalid parameters' });
		}
		else {
			res.download(path.join(__dirname, '/assets/') + prmSettingId + '-' + prmFileName, prmSettingId + '-' + prmFileName);
		}
	});

	// Node: Get system version
	apiRoutes.post('/getversion', function (req, res) {
		Version.findOne({

		}).sort('-releaseDate').exec(function (err, versionData) {
			if (err) { res.json({ statusCode: 500, success: false, message: 'Server error', error: err }); }
			else {
				if (!versionData) {
					res.json({ statusCode: 404, success: false, message: 'No version found' });
				}
				else {
					res.json({
						statusCode: 200,
						success: true,
						message: 'Latest version found',
						version: versionData.version,
						releaseDate: versionData.releaseDate,
						description: versionData.description
					});
				}
			}
		});
	});

	// Node: Download new wbs version
	apiRoutes.get('/downloadwbs', function (req, res) {
		var version = req.query.version || '';

		if (version == '') {
			res.json({ statusCode: 400, success: false, message: 'Invalid parameters' });
		}
		else {
			res.download(path.join(__dirname, '/versions/') + 'wbs-main' + version + '.py', 'wbs-main' + version + '.py');
		}
	});

	// Phone: Check current process
	apiRoutes.post('/currentprocess', function (req, res) {
		var prmMachineNo = req.body.machineNo || '';

		if (prmMachineNo == '') {
			res.status(400).json({ success: false, message: 'Invalid parameters' });
		}
		else {
			CurrentProcess.findOne({
				machine: prmMachineNo
			}, function (err, currentProcessData) {
				if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
				else {
					if (!currentProcessData) {
						res.status(404).json({ success: false, message: 'No process found' });
					}
					else {
						res.json({
							success: true,
							message: 'Current process returned',
							process: currentProcessData.process,
							lastUpdate: currentProcessData.updatedDate
						});
					}
				}
			});
		}
	});

	// Phone & Node: Update process
	apiRoutes.post('/updateprocess', function (req, res) {
		var prmMachineNo = req.body.machineNo || '';
		var prmProcess = req.body.process || '';
		var prmOrigin = req.body.origin || '';
		var prmHeaderId = req.body.headerId || '';
		var prmSettingId = req.body.settingId || '';

		if (prmMachineNo == '' || prmProcess == '' || prmOrigin == '') {
			res.status(400).json({ success: false, message: 'Invalid parameters' });
		}
		else {
			CurrentProcess.update({
				machine: prmMachineNo
			}, {
					$set: {
						process: prmProcess,
						updatedDate: Date.now()
					}
				}, function (err, updateProcessData) {
					if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
					else {
						if (!updateProcessData) {
							res.status(404).json({ success: false, message: 'No process found' });
						}
						else {
							if (prmOrigin == 'Node' && prmProcess == 'Resting') {
								if (prmHeaderId == '' || prmSettingId == '') {
									res.status(400).json({ success: false, message: 'Invalid parameters' });
								}
								else {
									CampaignRecipient.count({
										headerId: prmHeaderId,
										settingId: prmSettingId,
										status: { $ne: 'Deleted' }
									}, function (err, campaignRecipientCountAll) {
										if (err) { res.json({ statusCode: 500, success: false, message: 'Server error', error: err }); }
										else {
											if (!campaignRecipientCountAll) {
												res.json({ statusCode: 404, success: false, message: 'No recipient found' });
											}
											else {
												CampaignRecipient.count({
													headerId: prmHeaderId,
													settingId: prmSettingId,
													status: { $in: ['Sent', 'Failed'] }
												}, function (err, campaignRecipientCountSent) {
													if (err) { res.json({ statusCode: 500, success: false, message: 'Server error', error: err }); }
													else {
														if (!campaignRecipientCountSent) {
															res.json({ statusCode: 404, success: false, message: 'No recipient found' });
														}
														else {
															if (campaignRecipientCountSent >= campaignRecipientCountAll) {
																CampaignSetting.update(
																	{
																		headerId: prmHeaderId,
																		_id: prmSettingId
																	},
																	{
																		$set: {
																			status: 'Completed',
																			completedDate: Date.now()
																		}
																	},
																	function (err, campaignSettingUpdate) {
																		CampaignSetting.count({
																			headerId: prmHeaderId
																		}, function (err, campaignSettingCountAll) {
																			CampaignSetting.count({
																				headerId: prmHeaderId,
																				status: 'Completed'
																			}, function (err, campaignSettingCountCompleted) {
																				if (campaignSettingCountCompleted >= campaignSettingCountAll) {
																					CampaignHeader.update(
																						{
																							_id: prmHeaderId
																						}, {
																							$set: {
																								status: 'Completed',
																								completedDate: Date.now()
																							}
																						},
																						function (err, campaignHeaderUpdate) {
																							res.json({
																								success: true,
																								message: 'Current process updated',
																								machine: prmMachineNo,
																								process: prmProcess
																							});
																						}
																					);
																				}
																				else {
																					res.json({
																						success: true,
																						message: 'Current process updated',
																						machine: prmMachineNo,
																						process: prmProcess
																					});
																				}
																			});
																		});
																	}
																);
															}
															else {
																res.json({
																	success: true,
																	message: 'Current process updated',
																	machine: prmMachineNo,
																	process: prmProcess
																});
															}
														}
													}
												});
											}
										}
									});
								}
							}
							else {
								res.json({
									success: true,
									message: 'Current process updated',
									machine: prmMachineNo,
									process: prmProcess
								});
							}
						}
					}
				});
		}
	});

	// Phone: Download recipients
	apiRoutes.post('/recipients', function (req, res) {
		var prmMachineNo = req.body.machineNo || '';
		if (prmMachineNo == '') {
			res.status(400).json({ success: false, message: 'Invalid parameters' });
		}
		else {
			CampaignSetting.findOne(
				{
					machine: prmMachineNo,
					startDate: { $lte: Date.parse(new Date()) },
					status: 'Ready'
				},
				null,
				{
					sort: { createdDate: 1 }
				},
				function (err, campaignSettingData) {
					if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
					else {
						if (!campaignSettingData) {
							console.error(new Date().toLocaleString() + ': Error: Setting not found');
							res.status(404).json({
								success: true, message: 'No campaign to run now'
							});
						}
						else {
							CampaignHeader.findOne({
								_id: campaignSettingData.headerId
							}, function (err, campaignHeaderData) {
								if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
								else {
									if (!campaignHeaderData) {
										console.error(new Date().toLocaleString() + ': Error: Header not found');
										res.status(404).json({ success: true, message: 'No campaign to run now' });
									}
									else {
										var machineCount = campaignSettingData.machine.length;
										var perMachine = Math.floor(campaignSettingData.limit / machineCount);
										var rBalance = campaignSettingData.limit - campaignSettingData.downloaded;
										if (rBalance <= 0) {
											res.status(404).json({ success: true, message: 'All recipients have been downloaded' });
										}
										else {
											var maxLimit = perMachine >= 250 ? 250 : perMachine;
											if (rBalance <= maxLimit) {
												maxLimit = rBalance
											}
											var rCount = maxLimit;
											var rDownloaded = campaignSettingData.downloaded + rCount;
											campaignSettingData.downloaded = rDownloaded;
											if (rDownloaded >= campaignSettingData.limit) {
												campaignSettingData.status = 'Downloaded';
											}
											campaignSettingData.save();
											CampaignRecipient.find(
												{
													headerId: campaignHeaderData._id,
													settingId: campaignSettingData._id,
													status: 'Waiting',
													downloadedBy: ''
												},
												null,
												{
													limit: rCount
												},
												function (err, campaignRecipientData) {
													if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
													else {
														if (!campaignRecipientData) {
															res.status(404).json({ success: true, message: 'No campaign recipient found' });
														}
														else {
															var cr = [];
															campaignRecipientData.forEach(element => {
																cr.push(element.phoneNumber);
															});
															CampaignRecipient.updateMany({
																phoneNumber: { $in: cr },
																headerId: campaignHeaderData._id,
																settingId: campaignSettingData._id
															}, {
																	$set: { downloadedBy: prmMachineNo }
																}, function (err, campaignRecipientSave) {
																	if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
																	else {
																		CurrentProcess.update({
																			machine: prmMachineNo
																		}, {
																				$set: {
																					process: 'Downloading',
																					headerId: campaignHeaderData._id,
																					settingId: campaignSettingData._id,
																					updatedDate: Date.now()
																				}
																			}, function (err, currentProcessUpdate) {
																				if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
																				else {
																					res.json({
																						status: true,
																						message: 'Recipients returned',
																						headerId: campaignHeaderData._id,
																						settingId: campaignSettingData._id,
																						recipients: cr
																					});
																				}
																			}
																		);
																	}
																}
															);
														}
													}
												}
											);
										}
									}
								}
							});
						}
					}
				}
			);
		}
	});

	// Phone & Node: Update recipient status
	apiRoutes.post('/recipientstatus', function (req, res) {
		var prmMachineNo = req.body.machineNo || '';
		var prmStatus = req.body.status || '';
		var prmHeaderId = req.body.headerId || '';
		var prmSettingId = req.body.settingId || '';
		var prmPhoneNumber = req.body.phoneNumber || '';

		if (prmMachineNo == '' || prmStatus == '' || prmHeaderId == '' || prmSettingId == '' || prmPhoneNumber == '') {
			res.status(400).json({ success: false, message: 'Invalid parameters' });
		}
		else {
			CampaignRecipient.update({
				headerId: prmHeaderId,
				settingId: prmSettingId,
				phoneNumber: prmPhoneNumber
			}, {
					$set: {
						downloadedBy: prmMachineNo,
						status: prmStatus,
						attemptDate: Date.now()
					}
				}, function (err, campaignRecipientSave) {
					if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
					else {
						res.json({ success: true, message: 'Campaign recipient updated' });
					}
				});
		}
	});

	// Web: Create campaign header
	apiRoutes.post('/createheader', function (req, res) {
		var prmUserName = req.decoded.userName;
		var prmCampaignName = req.body.campaignName || '';
		var prmStartDate = req.body.startDate || 0;

		if (prmCampaignName == '' || prmStartDate == 0) {
			res.status(400).json({ success: false, message: 'Invalid parameters' });
		}
		else {
			if (prmStartDate <= (Date.now() + 600000)) {
				res.status(400).json({ success: false, message: 'Invalid start date/time' });
			}
			else {
				CampaignHeader.count({

				}, function (err, CampaignHeaderCount) {
					if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
					else {
						var newCampaignId = CampaignHeaderCount + 1;
						var newCampaignHeader = new CampaignHeader({
							campaignName: prmCampaignName,
							campaignId: newCampaignId,
							startDate: prmStartDate,
							completedDate: null,
							status: 'Draft',
							createdDate: Date.now(),
							updatedDate: Date.now(),
							createdBy: prmUserName,
							updatedBy: prmUserName
						});

						newCampaignHeader.save(function (err) {
							if (err) { res.status(500).json({ success: false, message: 'Internal Error', error: err }); }
							else {
								res.json({
									success: true,
									message: 'Campaign header created',
									campaignName: prmCampaignName,
									campaignId: newCampaignHeader.campaignId,
									headerId: newCampaignHeader._id
								});
							}
						});
					}
				});
			}
		}
	});

	// Web: Create campaign setting
	apiRoutes.post('/createsetting', function (req, res) {
		var prmUserName = req.decoded.userName;
		var prmSettingName = req.body.settingName || '';
		var prmHeaderId = req.body.headerId || '';
		var prmMachine = req.body.machine || '';
		var prmTarget = req.body.target || '';
		var prmContents = req.body.contents || '';
		var prmLimit = req.body.limit || 0;
		var prmRecordStart = req.body.recordStart;
		var prmFiles = req.files || '';
		var prmIncludeCtrlList = req.body.includeCtrlList || '';

		var currentDate = new Date();
		var currentYear = currentDate.getFullYear();

		if (prmSettingName == '' || prmHeaderId == '' || prmMachine == '' || prmContents == '' || prmLimit == 0 || !prmRecordStart || prmIncludeCtrlList == '') {
			res.status(400).json({ success: false, message: 'Invalid parameters' });
		}
		else {
			CampaignHeader.findOne({
				_id: prmHeaderId
			}, function (err, campaignHeaderData) {
				if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
				else {
					if (!campaignHeaderData) {
						res.status(404).json({ success: false, message: 'No campaign found' });
					}
					else {
						var prmMachineArray = prmMachine.split(',');
						var prmContentsArray = JSON.parse(prmContents);
						var prmTargetArray = JSON.parse(prmTarget);
						var prmLimitInt = parseInt(prmLimit);
						var prmRecordStartInt = parseInt(prmRecordStart);

						var fileCount = 0;
						prmContentsArray.forEach(content => {
							if (content.type == 'media' || content.type == 'file') {
								fileCount++;
							}
						});

						if (fileCount > 0 && prmFiles == '') {
							res.status(400).json({ success: false, message: 'Invalid parameters (no media/file)' });
						}
						else {
							newCampaignSetting = new CampaignSetting({
								settingName: prmSettingName,
								headerId: prmHeaderId,
								machine: prmMachineArray,
								target: prmTargetArray,
								contents: prmContentsArray,
								limit: prmLimitInt,
								recordStart: prmRecordStart,
								downloaded: 0,
								status: 'Draft',
								startDate: campaignHeaderData.startDate,
								createdDate: Date.now(),
								completedDate: null,
								updatedDate: Date.now(),
								createdBy: prmUserName,
								updatedBy: prmUserName
							});

							var findCondition = [];
							prmTargetArray.forEach(element => {
								var target = {};
								if (element.type == 'attributes' || element.type == 'gender') {
									target[element.type] = { $in: element.data };
								}
								else if (element.type == 'ageMin') {
									var calcDob = currentYear - element.data;
									target['dob'] = { $lte: calcDob };
								}
								else if (element.type == 'ageMax') {
									var calcDob = currentYear - element.data;
									target['dob'] = { $gte: calcDob };
								}
								else {
									target[element.type + 'Code'] = { $in: element.data };
								}
								findCondition.push(target);
							});

							var find = {};
							if (findCondition.length > 0) {
								find = { $and: findCondition };
							}

							Recipient.find(find).limit(prmLimitInt).skip(prmRecordStartInt).exec(
								function (err, recipientData) {
									if (err) { res.status(500).json({ success: false, message: 'Internal Error', error: err }); }
									else {
										if (recipientData.length <= 0) {
											res.status(404).json({ success: false, message: 'No recipient found' });
										}
										else {
											newCampaignSetting.limit = recipientData.length;
											newCampaignSetting.save(function (err) {
												if (err) { res.status(500).json({ success: false, message: 'Internal Error', error: err }); }
												else {
													var campaignRecipient = [];

													ControlList.find({
														status: 'Active'
													}, function (err, controlListData) {
														if (err) { res.status(500).json({ success: false, message: 'Internal Error', error: err }); }
														else {
															if (prmIncludeCtrlList == 'true') {
																controlListData.forEach(element => {
																	var ctlList = {
																		headerId: prmHeaderId,
																		settingId: newCampaignSetting._id,
																		phoneNumber: element.phoneNumber,
																		stateCode: 'CTLLIST',
																		parCode: 'CTLLIST',
																		dunCode: 'CTLLIST',
																		dmCode: 'CTLLIST',
																		raceCode: 'CTLLIST',
																		attributes: ['CTLLIST'],
																		dob: 'CTLLIST',
																		gender: 'CTLLIST',
																		status: 'Waiting',
																		downloadedBy: '',
																		createdDate: Date.now()
																	}
																	campaignRecipient.push(ctlList);
																});
																newCampaignSetting.limit = recipientData.length + campaignRecipient.length;
																newCampaignSetting.save(function (err) { });
															}

															recipientData.forEach(element => {
																var recipient = {
																	headerId: prmHeaderId,
																	settingId: newCampaignSetting._id,
																	phoneNumber: element.phoneNumber,
																	stateCode: element.stateCode,
																	parCode: element.parCode,
																	dunCode: element.dunCode,
																	dmCode: element.dmCode,
																	raceCode: element.raceCode,
																	attributes: element.attributes,
																	dob: element.dob,
																	gender: element.gender,
																	status: 'Waiting',
																	downloadedBy: '',
																	createdDate: Date.now()
																};
																campaignRecipient.push(recipient);
															});
															CampaignRecipient.insertMany(campaignRecipient, function (err, campaignRecipientData) {
																if (err) { res.status(500).json({ success: false, message: 'Internal Error', error: err }); }
																else {
																	for (var x = 1; x <= fileCount; x++) {
																		file = prmFiles['file' + x];
																		file.mv(path.join(assetFolderPath + '/' + newCampaignSetting._id + '-' + file.name), function (err) { });
																	}
																	res.json({
																		success: true,
																		message: 'Campaign setting created',
																		campaignName: campaignHeaderData.campaignName,
																		campaignId: prmHeaderId,
																		settingName: newCampaignSetting.settingName,
																		settingId: newCampaignSetting._id,
																		recipientCount: campaignRecipient.length
																	});
																}
															});
														}
													});
												}
											});
										}
									}
								}
							);
						}
					}
				}
			});
		}
	});

	// Web: Publish campaign
	apiRoutes.post('/publishcampaign', function (req, res) {
		var prmId = req.body.id || '';
		var prmType = req.body.type || '';
		var prmStatus = req.body.status || '';

		if (prmId == '' || prmStatus == '') {
			res.status(400).json({ success: false, message: 'Invalid parameters' });
		}
		else {
			if (prmType == 'Header') {
				CampaignHeader.findOne({
					_id: prmId
				}, function (err, campaignHeaderData) {
					if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
					else {
						if (!campaignHeaderData) {
							res.status(404).json({ success: true, message: 'No campaign found' });
						}
						else {
							campaignHeaderData.status = prmStatus;
							campaignHeaderData.save();
							res.json({ status: true, message: 'Header status updated' });
						}
					}
				});
			}
			else if (prmType == 'Setting') {
				CampaignSetting.findOne({
					_id: prmId
				}, function (err, campaignSettingData) {
					if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
					else {
						if (!campaignSettingData) {
							res.status(404).json({ success: true, message: 'No campaign found' });
						}
						else {
							campaignSettingData.status = prmStatus;
							campaignSettingData.save();
							res.json({ status: true, message: 'Setting status updated' });
						}
					}
				});
			}
			else {
				res.status(400).json({ success: false, message: 'Invalid parameters' });
			}
		}
	});

	// Web: get data
	apiRoutes.post('/getdata', function (req, res) {
		var prmType = req.body.type || '';

		if (prmType == '') {
			res.status(400).json({ success: false, message: 'Invalid parameters' });
		}
		else {
			var retVal;
			switch (prmType) {
				case 'dm':
					Dm.find({
						isActive: true
					}, function (err, dmData) {
						if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
						else {
							if (dmData.length <= 0) {
								res.status(404).json({ success: true, message: 'No data found' });
							}
							else {
								retVal = dmData;
								res.json({ status: true, message: 'Data returned', type: prmType, data: retVal });
							}
						}
					});
					break;
				case 'dun':
					Dun.find({
						isActive: true
					}, function (err, dunData) {
						if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
						else {
							if (dunData.length <= 0) {
								res.status(404).json({ success: true, message: 'No data found' });
							}
							else {
								retVal = dunData;
								res.json({ status: true, message: 'Data returned', type: prmType, data: retVal });
							}
						}
					});
					break;
				case 'par':
					Par.find({
						isActive: true
					}, function (err, parData) {
						if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
						else {
							if (parData.length <= 0) {
								res.status(404).json({ success: true, message: 'No data found' });
							}
							else {
								retVal = parData;
								res.json({ status: true, message: 'Data returned', type: prmType, data: retVal });
							}
						}
					});
					break;
				case 'race':
					Race.find({
						isActive: true
					}, function (err, raceData) {
						if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
						else {
							if (raceData.length <= 0) {
								res.status(404).json({ success: true, message: 'No data found' });
							}
							else {
								retVal = raceData;
								res.json({ status: true, message: 'Data returned', type: prmType, data: retVal });
							}
						}
					});
					break;
				case 'state':
					State.find({
						isActive: true
					}, function (err, stateData) {
						if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
						else {
							if (stateData.length <= 0) {
								res.status(404).json({ success: true, message: 'No data found' });
							}
							else {
								retVal = stateData;
								res.json({ status: true, message: 'Data returned', type: prmType, data: retVal });
							}
						}
					});
					break;
				case 'gender':
					res.json({ status: true, message: 'Data returned', type: prmType, data: ['M', 'F'] });
					break;
				case 'machine':
					CurrentProcess.find({
						status: 'Active'
					}).select({
						machine: 1,
						process: 1,
						status: 1,
						headerId: 1,
						settingId: 1
					}).exec(function (err, machineData) {
						if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
						else {
							if (machineData.length <= 0) {
								res.status(404).json({ success: true, message: 'No data found' });
							}
							else {
								retVal = machineData;
								res.json({ status: true, message: 'Data returned', type: prmType, data: retVal });
							}
						}
					});
					break;
				case 'attribute':
					RecipientAttribute.find({
						isActive: true
					}, function (err, attributeData) {
						if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
						else {
							if (attributeData.length <= 0) {
								res.status(404).json({ success: true, message: 'No data found' });
							}
							else {
								retVal = attributeData;
								res.json({ status: true, message: 'Data returned', type: prmType, data: retVal });
							}
						}
					});
					break;
				default:
					res.status(400).json({ success: false, message: 'Invalid parameters' });
					break;
			}
		}
	});

	// Web: get campaigns list
	apiRoutes.post('/getcampaigns', function (req, res) {
		var prmType = req.body.type || '';

		if (prmType == '') {
			res.status(400).json({ success: false, message: 'Invalid parameters' });
		}
		else {
			if (prmType == 'Header') {
				CampaignHeader.find({
					status: {
						$in: ['Draft', 'Published', 'Completed']
					}
				}, function (err, campaignHeaderData) {
					if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
					else {
						if (campaignHeaderData.length <= 0) {
							res.status(404).json({ success: true, message: 'No data found' });
						}
						else {
							res.json({ status: true, message: 'Data returned', list: campaignHeaderData });
						}
					}
				});
			}
			else if (prmType == 'Setting') {
				CampaignSetting.find({
					status: {
						$in: ['Draft', 'Ready', 'Downloaded', 'Completed']
					}
				}, function (err, campaignSettingData) {
					if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
					else {
						if (campaignSettingData.length <= 0) {
							res.status(404).json({ success: true, message: 'No data found' });
						}
						else {
							res.json({ status: true, message: 'Data returned', list: campaignSettingData });
						}
					}
				});
			}
		}
	});

	// WEB: Get One campaign header
	apiRoutes.post('/header', function (req, res) {
		prmHeaderId = req.body.headerId;
		CampaignHeader.findOne({
			_id: prmHeaderId
		}).exec(function (err, campaignHeaderData) {
			if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
			else {
				if (!campaignHeaderData) {
					res.status(404).json({ success: false, message: 'Header ' + prmHeaderId + ' not found' });
				}
				else {
					res.json({
						success: true,
						message: 'Header ' + prmHeaderId + ' returned',
						header: campaignHeaderData
					});
				}
			}
		});
	});

	// WEB: Get campaign settings for a header
	apiRoutes.post('/headersetting', function (req, res) {
		prmHeaderId = req.body.headerId;
		CampaignSetting.find({
			headerId: prmHeaderId
		}).exec(function (err, campaignSettingData) {
			if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
			else {
				res.json({
					success: true,
					message: 'Setting for header ' + prmHeaderId + ' returned',
					setting: campaignSettingData
				});
			}
		});
	});

	// WEB: Get a campaign setting
	apiRoutes.post('/setting', function (req, res) {
		prmHeaderId = req.body.headerId;
		prmSettingId = req.body.settingId;
		CampaignSetting.findOne({
			headerId: prmHeaderId,
			_id: prmSettingId
		}).exec(function (err, campaignSettingData) {
			if (err) {
				res.status(500).json({
					success: false, message: 'Server error', error: err
				});
			}
			else {
				res.json({
					success: true,
					message: 'Setting ' + prmSettingId + ' returned',
					setting: campaignSettingData
				});
			}
		});
	});

	// Web: Get recipient count/download
	apiRoutes.post('/getrecipient', function (req, res) {
		var prmType = req.body.type || '';
		var prmTarget = req.body.target || [];
		var prmRecordStart = req.body.recordStart || 0;
		var prmLimit = req.body.limit || 0;
		var prmIncludeCtrlList = req.body.includeCtrlList || false;

		var currentDate = new Date();
		var currentYear = currentDate.getFullYear();

		var prmLimitInt = parseInt(prmLimit);
		var prmRecordStartInt = parseInt(prmRecordStart);

		var findCondition = [];
		prmTarget.forEach(element => {
			var target = {};
			if (element.type == 'attributes' || element.type == 'gender') {
				target[element.type] = { $in: element.data };
			}
			else if (element.type == 'ageMin') {
				var calcDob = currentYear - element.data;
				target['dob'] = { $lte: calcDob };
			}
			else if (element.type == 'ageMax') {
				var calcDob = currentYear - element.data;
				target['dob'] = { $gte: calcDob };
			}
			else {
				target[element.type + 'Code'] = { $in: element.data };
			}
			findCondition.push(target);
		});

		var find = {};
		if (findCondition.length > 0) {
			find = { $and: findCondition };
		}

		if (prmType == 'count') {
			Recipient.count(find).exec(function (err, recipientData) {
				if (err) { res.status(500).json({ success: false, message: 'Internal Error', error: err }); }
				else {
					res.json({ status: true, message: 'Recipient count returned', recipientCount: recipientData });
				}
			});
		}
		else if (prmType == 'download') {
			var rcp = [];
			Recipient.find(find).skip(prmRecordStartInt).limit(prmLimitInt).exec(function (err, recipientData) {
				if (err) {
					console.log('Error download recipient: ' + err);
					res.status(500).json({ success: false, message: 'Internal Error', error: err });
				}
				else {
					ControlList.find({
						status: 'Active'
					}, function (err, controlListData) {
						if (err) { res.status(500).json({ success: false, message: 'Internal Error', error: err }); }
						else {
							if (prmIncludeCtrlList == 'true') {
								controlListData.forEach(element => {
									var ctlList = element.phoneNumber;
									rcp.push(ctlList);
								});
							}
							recipientData.forEach(element => {
								var recipient = element.phoneNumber;
								rcp.push(recipient);
							});
							res.json({ status: true, message: 'Recipient data returned', recipientData: rcp });
						}
					});
				}
			});
		}
	});

	// WEB: Get campaigns statistics
	apiRoutes.post('/campaignstatistics', function (req, res) {
		prmHeaderId = req.body.headerId;
		CampaignRecipient.count({
			headerId: prmHeaderId
		}).exec(function (err, campaignRecipientTotalCount) {
			if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
			else {
				CampaignRecipient.count({
					headerId: prmHeaderId,
					status: { $in: ['Sent', 'Failed'] }
				}).exec(function (err, campaignSettingOutCount) {
					if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
					else {
						res.json({
							success: true,
							message: 'Statistics for campaign ' + prmHeaderId + ' returned',
							total: campaignRecipientTotalCount,
							out: campaignSettingOutCount,
							balance: campaignRecipientTotalCount - campaignSettingOutCount
						});
					}
				});
			}
		});
	});

	// WEB: Get machine statistics
	apiRoutes.post('/machinestatistics', function (req, res) {
		CurrentProcess.find({
			status: 'Active',
			process: 'Sending'
		}).exec(function (err, machineData) {
			if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
			else {
				var machines = [];
				var machineCount = machineData.length;
				getCount(0);
				function getCount(cnt) {
					if (cnt < machineCount) {
						CampaignRecipient.count({
							headerId: machineData[cnt].headerId,
							settingId: machineData[cnt].settingId,
							downloadedBy: machineData[cnt].machine
						}).exec(function (err, machineTotalCount) {
							if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
							else {
								CampaignRecipient.count({
									headerId: machineData[cnt].headerId,
									settingId: machineData[cnt].settingId,
									status: { $in: ['Sent', 'Failed'] },
									downloadedBy: machineData[cnt].machine
								}).exec(function (err, machineOutCount) {
									if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
									else {
										machines.push({
											machine: machineData[cnt].machine,
											total: machineTotalCount,
											out: machineOutCount,
											balance: machineTotalCount - machineOutCount
										});
										getCount(cnt + 1);
									}
								});
							}
						});
					}
					else {
						res.json({
							success: true,
							message: 'Statistics for all machines returned',
							machines: machines
						});
					}
				};
			}
		});
	});

	// WEB: Reset machine status
	apiRoutes.post('/resetmachine', function (req, res) {
		prmMachine = req.body.machine;

		CurrentProcess.findOne({
			machine: prmMachine,
			process: 'Downloading',
			status: 'Active'
		}).exec(function (err, currentProcessData) {
			if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
			else {
				if (!currentProcessData) {
					res.status(404).json({ success: false, message: 'Machine ' + prmMachine + ' is not in downloading mode.' });
				}
				else {
					currentProcessData.process = 'StandBy';
					currentProcessData.save();
					CampaignRecipient.updateMany({
						headerId: currentProcessData.headerId,
						settingId: currentProcessData.settingId,
						status: {
							$nin: ['Sent', 'Failed']
						},
						downloadedBy: prmMachine
					}, {
							$set: {
								status: 'Waiting',
								downloadedBy: ''
							}
						}, function (err, campaignRecipientUpdate) {
							if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
							else {
								CampaignSetting.findOne({
									_id: currentProcessData.settingId,
									headerId: currentProcessData.headerId
								}).exec(function (err, campaignSettingUpdate) {
									if (err) { res.status(500).json({ success: false, message: 'Server error', error: err }); }
									else {
										if (!campaignSettingUpdate) {
											res.status(404).json({ success: false, message: 'Campaign not found' });
										}
										else {
											var newDownloadedCount = campaignSettingUpdate.downloaded - campaignRecipientUpdate.nModified;
											campaignSettingUpdate.downloaded = newDownloadedCount;
											campaignSettingUpdate.status = 'Ready';
											campaignSettingUpdate.save();

											res.json({
												success: true,
												message: 'Machine ' + prmMachine + ' successfully reset',
												recipientReset: campaignRecipientUpdate.nModified
											});
										}
									}
								});
							}
						}
					);
				}
			}
		});
	});

	// WEB: Kill machine process
	apiRoutes.post('/killmachine', function (req, res) {
		prmMachine = req.body.machine;

		CurrentProcess.findOne({
			machine: prmMachine,
			status: 'Active'
		}).exec(function (err, currentProcessData) {
			currentProcessData.process = 'StandBy';
			currentProcessData.save();
		});
	});

	//# =======================
	//# End Routes ============
	//# =======================

	app.use('/api', apiRoutes);

	//# =======================
	//# Start the server ======
	//# =======================
	app.listen(process.env.PORT);
	console.log(new Date().toLocaleString() + ': Server started at port ' + process.env.PORT);
}
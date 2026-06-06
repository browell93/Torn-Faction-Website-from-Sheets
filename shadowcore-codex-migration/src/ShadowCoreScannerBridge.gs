/**
 * ShadowCore HQ v1.8 - Scanner Deep Data + Visuals Bridge
 *
 * Drop this file into your existing ShadowCore HQ Apps Script project.
 * Then patch Code.gs doPost(e) using the snippet in CodeGs_doPost_patch.txt.
 *
 * This bridge stores scanner data in separate Scanner_* sheets plus related module sheets.
 * It does not perform any Torn actions. It only accepts user-submitted observations/requests.
 */

var SCANNER = {
  VERSION: '1.8.3',
  SETTINGS_SHEET: 'Scanner_Settings',
  AUDIT_SHEET: 'Scanner_Audit',
  SUBMISSIONS_SHEET: 'Scout_Submissions',
  PROFILE_NOTES_SHEET: 'Profile_Notes',
  RECRUIT_LEADS_SHEET: 'Recruit_Leads',
  MARKET_NOTES_SHEET: 'Market_Notes',
  TRAVEL_LOGS_SHEET: 'Travel_Logs',
  HOSPITAL_SCANS_SHEET: 'Hospital_Scans',
  TRADE_LOGS_SHEET: 'Trade_Logs',
  CRIME_NOTES_SHEET: 'Crime_Notes',
  COMPANY_NOTES_SHEET: 'Company_Notes',
  ATTACK_RESULTS_SHEET: 'Attack_Result_Scans',
  API_SNAPSHOTS_SHEET: 'API_Snapshots',
  AUTO_LOG_SHEET: 'Auto_Enrichment_Log',
  MEMBER_READINESS_SHEET: 'Member_Readiness_Snapshots',
  WAR_READINESS_SHEET: 'War_Readiness_Scores',
  AUTO_CHECKINS_SHEET: 'Auto_Checkins',
  ASSIGNMENT_TRACKING_SHEET: 'Assignment_Tracking',
  ENEMY_ENRICHMENT_SHEET: 'Enemy_Profile_Enrichment',
  FACTION_ROSTER_SHEET: 'Faction_Roster_Snapshots',
  AUTO_RECRUITS_SHEET: 'Auto_Recruit_Leads',
  SUPPORT_CONTEXT_SHEET: 'Support_Context',
  TRAINING_GROWTH_SHEET: 'Training_Growth_Snapshots',
  ONBOARDING_PROGRESS_SHEET: 'Onboarding_Progress',
  API_HEALTH_SHEET: 'API_Key_Health_Snapshots',
  SCANNER_HEALTH_SHEET: 'Scanner_Health_Stats',
  DISCORD_TRIGGER_SHEET: 'Scanner_Discord_Triggers',
  MAX_ROWS_RETURNED: 80,
  MAX_PLAYERS_PER_SCAN: 250
};

var SCANNER_HEADERS = {};
SCANNER_HEADERS[SCANNER.SETTINGS_SHEET] = ['Key', 'Value', 'Description'];
SCANNER_HEADERS[SCANNER.AUDIT_SHEET] = ['Timestamp', 'Scanner_ID', 'Submitted_By_ID', 'Submitted_By_Name', 'Action', 'Page_Type', 'Source_URL', 'Count', 'Status', 'Details'];
SCANNER_HEADERS[SCANNER.SUBMISSIONS_SHEET] = ['Submission_ID', 'Timestamp', 'Submitted_By_ID', 'Submitted_By_Name', 'Page_Type', 'Source_URL', 'Mode', 'Subject_ID', 'Subject_Name', 'Count', 'Payload_JSON', 'Processed', 'Notes'];
SCANNER_HEADERS[SCANNER.PROFILE_NOTES_SHEET] = ['Note_ID', 'Timestamp', 'Player_ID', 'Player_Name', 'Category', 'Rating', 'Submitted_By_ID', 'Submitted_By_Name', 'Source_URL', 'Note', 'Visibility', 'Updated'];
SCANNER_HEADERS[SCANNER.RECRUIT_LEADS_SHEET] = ['Lead_ID', 'Timestamp', 'Torn_ID', 'Name', 'Level', 'Faction_ID', 'Faction_Name', 'Source', 'Submitted_By_ID', 'Submitted_By_Name', 'Status', 'Score', 'Notes', 'Source_URL'];
SCANNER_HEADERS[SCANNER.MARKET_NOTES_SHEET] = ['Note_ID', 'Timestamp', 'Item', 'Price', 'Quantity', 'Seller_ID', 'Seller_Name', 'Location', 'Profit_Note', 'Submitted_By_ID', 'Submitted_By_Name', 'Source_URL', 'Notes'];
SCANNER_HEADERS[SCANNER.TRAVEL_LOGS_SHEET] = ['Log_ID', 'Timestamp', 'Location', 'Item', 'Buy_Price', 'Sell_Price', 'Quantity', 'Profit_Estimate', 'Submitted_By_ID', 'Submitted_By_Name', 'Source_URL', 'Notes'];
SCANNER_HEADERS[SCANNER.HOSPITAL_SCANS_SHEET] = ['Scan_ID', 'Timestamp', 'Torn_ID', 'Name', 'Status', 'Hospital_Until', 'Time_Left_Text', 'Reason', 'Priority', 'Submitted_By_ID', 'Submitted_By_Name', 'Source_URL', 'Notes'];
SCANNER_HEADERS[SCANNER.TRADE_LOGS_SHEET] = ['Trade_ID', 'Timestamp', 'Partner_ID', 'Partner_Name', 'Direction', 'Amount', 'Item', 'Quantity', 'Category', 'Related_Loan_ID', 'Submitted_By_ID', 'Submitted_By_Name', 'Source_URL', 'Notes'];
SCANNER_HEADERS[SCANNER.CRIME_NOTES_SHEET] = ['Crime_Note_ID', 'Timestamp', 'Crime', 'Role', 'Torn_ID', 'Name', 'Status', 'Reliability_Note', 'Submitted_By_ID', 'Submitted_By_Name', 'Source_URL', 'Notes'];
SCANNER_HEADERS[SCANNER.COMPANY_NOTES_SHEET] = ['Company_Note_ID', 'Timestamp', 'Company_ID', 'Company_Name', 'Torn_ID', 'Name', 'Role', 'Work_Stats_Note', 'Submitted_By_ID', 'Submitted_By_Name', 'Source_URL', 'Notes'];
SCANNER_HEADERS[SCANNER.ATTACK_RESULTS_SHEET] = ['Attack_ID', 'Timestamp', 'Attacker_ID', 'Attacker_Name', 'Defender_ID', 'Defender_Name', 'Result', 'Respect', 'Chain', 'Source_URL', 'Submitted_By_ID', 'Submitted_By_Name', 'Notes'];
SCANNER_HEADERS[SCANNER.API_SNAPSHOTS_SHEET] = ['Snapshot_ID', 'Timestamp', 'Submitted_By_ID', 'Submitted_By_Name', 'Snapshot_Type', 'Endpoint', 'Selections', 'Subject_ID', 'Subject_Name', 'Rate_Per_Second', 'Status', 'Summary', 'Payload_JSON', 'Source_URL', 'Notes'];

SCANNER_HEADERS[SCANNER.AUTO_LOG_SHEET] = ['Event_ID', 'Timestamp', 'Submitted_By_ID', 'Submitted_By_Name', 'Trigger', 'Page_Type', 'Source_URL', 'Categories', 'Summary', 'Payload_JSON', 'Processed'];
SCANNER_HEADERS[SCANNER.MEMBER_READINESS_SHEET] = ['Snapshot_ID', 'Timestamp', 'Torn_ID', 'Name', 'Level', 'Status', 'Life_Current', 'Life_Max', 'Energy_Current', 'Energy_Max', 'Nerve_Current', 'Nerve_Max', 'Happy_Current', 'Happy_Max', 'Hospital', 'Jail', 'Travel', 'Drug_CD', 'Medical_CD', 'Booster_CD', 'Last_Action', 'Readiness_Score', 'Can_Hit', 'Needs_Revive', 'Source', 'Payload_JSON'];
SCANNER_HEADERS[SCANNER.WAR_READINESS_SHEET] = ['Score_ID', 'Timestamp', 'Torn_ID', 'Name', 'War_ID', 'Score', 'Ready', 'Can_Hit', 'Blockers', 'Recommendations', 'Source_URL'];
SCANNER_HEADERS[SCANNER.AUTO_CHECKINS_SHEET] = ['Checkin_ID', 'Timestamp', 'Torn_ID', 'Name', 'Checkin_Type', 'Page_Type', 'War_ID', 'Status', 'Details', 'Source_URL'];
SCANNER_HEADERS[SCANNER.ASSIGNMENT_TRACKING_SHEET] = ['Track_ID', 'Timestamp', 'Torn_ID', 'Name', 'War_ID', 'Assignment_ID', 'Target_ID', 'Target_Name', 'Event', 'Page_Type', 'Source_URL', 'Details'];
SCANNER_HEADERS[SCANNER.ENEMY_ENRICHMENT_SHEET] = ['Enrichment_ID', 'Timestamp', 'Enemy_ID', 'Enemy_Name', 'Faction_ID', 'Faction_Name', 'Level', 'Status', 'Last_Action', 'Tags', 'Submitted_By_ID', 'Submitted_By_Name', 'Source_URL', 'Payload_JSON'];
SCANNER_HEADERS[SCANNER.FACTION_ROSTER_SHEET] = ['Roster_ID', 'Timestamp', 'Faction_ID', 'Faction_Name', 'Member_Count', 'Submitted_By_ID', 'Submitted_By_Name', 'Source_URL', 'Payload_JSON'];
SCANNER_HEADERS[SCANNER.AUTO_RECRUITS_SHEET] = ['Lead_ID', 'Timestamp', 'Torn_ID', 'Name', 'Level', 'Faction_ID', 'Faction_Name', 'Source', 'Submitted_By_ID', 'Submitted_By_Name', 'Auto_Score', 'Reason', 'Source_URL', 'Payload_JSON'];
SCANNER_HEADERS[SCANNER.SUPPORT_CONTEXT_SHEET] = ['Context_ID', 'Timestamp', 'Torn_ID', 'Name', 'Context_Type', 'Priority', 'War_ID', 'Status', 'Energy', 'Life', 'Assignment_ID', 'Source_URL', 'Details_JSON'];
SCANNER_HEADERS[SCANNER.TRAINING_GROWTH_SHEET] = ['Growth_ID', 'Timestamp', 'Torn_ID', 'Name', 'Energy', 'Happy', 'Cooldowns', 'Training_State', 'Mentor_Flag', 'Source', 'Payload_JSON'];
SCANNER_HEADERS[SCANNER.ONBOARDING_PROGRESS_SHEET] = ['Progress_ID', 'Timestamp', 'Torn_ID', 'Name', 'Step', 'Status', 'Evidence', 'Source_URL', 'Details'];
SCANNER_HEADERS[SCANNER.API_HEALTH_SHEET] = ['Health_ID', 'Timestamp', 'Torn_ID', 'Name', 'API_Enabled', 'Last_OK', 'Last_Error', 'Rate_Per_Second', 'Selections', 'Snapshot_Type', 'Permission_Warnings', 'Source'];
SCANNER_HEADERS[SCANNER.SCANNER_HEALTH_SHEET] = ['Health_ID', 'Timestamp', 'Torn_ID', 'Name', 'Scanner_Version', 'Install_ID', 'Last_Page_Type', 'Last_URL', 'HQ_Connected', 'Auto_Enrichment', 'API_Calls_Session', 'Error_Count', 'Settings_JSON'];
SCANNER_HEADERS[SCANNER.DISCORD_TRIGGER_SHEET] = ['Trigger_ID', 'Timestamp', 'Trigger_Type', 'Priority', 'Title', 'Message', 'Torn_ID', 'Name', 'War_ID', 'Source_URL', 'Status', 'Payload_JSON'];



/**
 * v1.8.3 timeout fix:
 * Google Sheets can time out when many tabs are created/repaired in one Apps Script run.
 * These functions create/repair ONE scanner sheet at a time.
 * Run setupShadowCoreScannerBridgeMiniNext() repeatedly until status shows no missing sheets,
 * or run the numbered setupShadowCoreScannerBridgeSheetXX() functions one by one.
 */
function setupShadowCoreScannerBridge() {
  return setupShadowCoreScannerBridgeMiniNext();
}

function setupShadowCoreScannerBridgeMiniNext() {
  var names = Object.keys(SCANNER_HEADERS);
  var ss = scannerSs_();
  var done = [];
  var missing = [];
  for (var i = 0; i < names.length; i++) {
    if (ss.getSheetByName(names[i])) done.push(names[i]);
    else missing.push(names[i]);
  }
  if (!missing.length) {
    scannerSeedSettingsLite_();
    return {ok: true, version: SCANNER.VERSION, complete: true, message: 'All scanner sheets exist.', total: names.length, done: done.length, missing: []};
  }
  var name = missing[0];
  scannerEnsureSheetLite_(name, SCANNER_HEADERS[name]);
  SpreadsheetApp.flush();
  if (name === SCANNER.SETTINGS_SHEET) scannerSeedSettingsLite_();
  var remaining = [];
  for (var j = 0; j < names.length; j++) if (!ss.getSheetByName(names[j])) remaining.push(names[j]);
  return {ok: true, version: SCANNER.VERSION, complete: remaining.length === 0, created_or_checked: name, remaining_count: remaining.length, remaining: remaining};
}

function setupShadowCoreScannerBridgeMiniStatus() {
  var names = Object.keys(SCANNER_HEADERS);
  var ss = scannerSs_();
  var missing = [];
  names.forEach(function(name) { if (!ss.getSheetByName(name)) missing.push(name); });
  return {ok: true, version: SCANNER.VERSION, total: names.length, existing: names.length - missing.length, missing_count: missing.length, missing: missing, token: scannerSettingLite_('Scanner_Shared_Token', '')};
}

function setupShadowCoreScannerBridgeMiniResetProgress() {
  try { PropertiesService.getScriptProperties().deleteProperty('SCANNER_SETUP_NEXT_INDEX'); } catch (err) {}
  return setupShadowCoreScannerBridgeMiniStatus();
}

function setupShadowCoreScannerBridgeBatch1() { return setupShadowCoreScannerBridgeBatch_(1, true); }
function setupShadowCoreScannerBridgeBatch2() { return setupShadowCoreScannerBridgeBatch_(2, false); }
function setupShadowCoreScannerBridgeBatch3() { return setupShadowCoreScannerBridgeBatch_(3, false); }
function setupShadowCoreScannerBridgeBatch4() { return setupShadowCoreScannerBridgeBatch_(4, false); }
function setupShadowCoreScannerBridgeBatch5() { return setupShadowCoreScannerBridgeBatch_(5, false); }
function setupShadowCoreScannerBridgeBatch6() { return setupShadowCoreScannerBridgeBatch_(6, false); }
function setupShadowCoreScannerBridgeBatch7() { return setupShadowCoreScannerBridgeBatch_(7, false); }
function setupShadowCoreScannerBridgeBatch8() { return setupShadowCoreScannerBridgeBatch_(8, false); }
function setupShadowCoreScannerBridgeBatch9() { return setupShadowCoreScannerBridgeBatch_(9, false); }
function setupShadowCoreScannerBridgeBatch10() { return setupShadowCoreScannerBridgeBatch_(10, false); }
function setupShadowCoreScannerBridgeBatch11() { return setupShadowCoreScannerBridgeBatch_(11, false); }
function setupShadowCoreScannerBridgeBatch12() { return setupShadowCoreScannerBridgeBatch_(12, false); }
function setupShadowCoreScannerBridgeBatch13() { return setupShadowCoreScannerBridgeBatch_(13, false); }
function setupShadowCoreScannerBridgeBatch14() { return setupShadowCoreScannerBridgeBatch_(14, false); }
function setupShadowCoreScannerBridgeBatch15() { return setupShadowCoreScannerBridgeBatch_(15, false); }

function setupShadowCoreScannerBridgeAllBatchesStatus() {
  return setupShadowCoreScannerBridgeMiniStatus();
}

function setupShadowCoreScannerBridgeBatch_(batchNumber, seedSettings) {
  var batchSize = 2; // v1.8.3: very small batches to avoid Google Sheets timeouts.
  var names = Object.keys(SCANNER_HEADERS);
  var start = (Number(batchNumber) - 1) * batchSize;
  var end = Math.min(start + batchSize, names.length);
  var touched = [];
  for (var i = start; i < end; i++) {
    scannerEnsureSheetLite_(names[i], SCANNER_HEADERS[names[i]]);
    touched.push(names[i]);
  }
  SpreadsheetApp.flush();
  if (seedSettings) scannerSeedSettingsLite_();
  return {ok: true, version: SCANNER.VERSION, batch: batchNumber, start: start + 1, end: end, total: names.length, touched: touched, status: setupShadowCoreScannerBridgeMiniStatus()};
}

function setupShadowCoreScannerBridgeSheet01() { return setupShadowCoreScannerBridgeSheet_(1); }
function setupShadowCoreScannerBridgeSheet02() { return setupShadowCoreScannerBridgeSheet_(2); }
function setupShadowCoreScannerBridgeSheet03() { return setupShadowCoreScannerBridgeSheet_(3); }
function setupShadowCoreScannerBridgeSheet04() { return setupShadowCoreScannerBridgeSheet_(4); }
function setupShadowCoreScannerBridgeSheet05() { return setupShadowCoreScannerBridgeSheet_(5); }
function setupShadowCoreScannerBridgeSheet06() { return setupShadowCoreScannerBridgeSheet_(6); }
function setupShadowCoreScannerBridgeSheet07() { return setupShadowCoreScannerBridgeSheet_(7); }
function setupShadowCoreScannerBridgeSheet08() { return setupShadowCoreScannerBridgeSheet_(8); }
function setupShadowCoreScannerBridgeSheet09() { return setupShadowCoreScannerBridgeSheet_(9); }
function setupShadowCoreScannerBridgeSheet10() { return setupShadowCoreScannerBridgeSheet_(10); }
function setupShadowCoreScannerBridgeSheet11() { return setupShadowCoreScannerBridgeSheet_(11); }
function setupShadowCoreScannerBridgeSheet12() { return setupShadowCoreScannerBridgeSheet_(12); }
function setupShadowCoreScannerBridgeSheet13() { return setupShadowCoreScannerBridgeSheet_(13); }
function setupShadowCoreScannerBridgeSheet14() { return setupShadowCoreScannerBridgeSheet_(14); }
function setupShadowCoreScannerBridgeSheet15() { return setupShadowCoreScannerBridgeSheet_(15); }
function setupShadowCoreScannerBridgeSheet16() { return setupShadowCoreScannerBridgeSheet_(16); }
function setupShadowCoreScannerBridgeSheet17() { return setupShadowCoreScannerBridgeSheet_(17); }
function setupShadowCoreScannerBridgeSheet18() { return setupShadowCoreScannerBridgeSheet_(18); }
function setupShadowCoreScannerBridgeSheet19() { return setupShadowCoreScannerBridgeSheet_(19); }
function setupShadowCoreScannerBridgeSheet20() { return setupShadowCoreScannerBridgeSheet_(20); }
function setupShadowCoreScannerBridgeSheet21() { return setupShadowCoreScannerBridgeSheet_(21); }
function setupShadowCoreScannerBridgeSheet22() { return setupShadowCoreScannerBridgeSheet_(22); }
function setupShadowCoreScannerBridgeSheet23() { return setupShadowCoreScannerBridgeSheet_(23); }
function setupShadowCoreScannerBridgeSheet24() { return setupShadowCoreScannerBridgeSheet_(24); }
function setupShadowCoreScannerBridgeSheet25() { return setupShadowCoreScannerBridgeSheet_(25); }
function setupShadowCoreScannerBridgeSheet26() { return setupShadowCoreScannerBridgeSheet_(26); }
function setupShadowCoreScannerBridgeSheet27() { return setupShadowCoreScannerBridgeSheet_(27); }
function setupShadowCoreScannerBridgeSheet28() { return setupShadowCoreScannerBridgeSheet_(28); }
function setupShadowCoreScannerBridgeSheet29() { return setupShadowCoreScannerBridgeSheet_(29); }
function setupShadowCoreScannerBridgeSheet30() { return setupShadowCoreScannerBridgeSheet_(30); }
function setupShadowCoreScannerBridgeSheet31() { return setupShadowCoreScannerBridgeSheet_(31); }
function setupShadowCoreScannerBridgeSheet32() { return setupShadowCoreScannerBridgeSheet_(32); }
function setupShadowCoreScannerBridgeSheet33() { return setupShadowCoreScannerBridgeSheet_(33); }
function setupShadowCoreScannerBridgeSheet34() { return setupShadowCoreScannerBridgeSheet_(34); }
function setupShadowCoreScannerBridgeSheet35() { return setupShadowCoreScannerBridgeSheet_(35); }
function setupShadowCoreScannerBridgeSheet36() { return setupShadowCoreScannerBridgeSheet_(36); }

function setupShadowCoreScannerBridgeSheet_(oneBasedIndex) {
  var names = Object.keys(SCANNER_HEADERS);
  var idx = Number(oneBasedIndex) - 1;
  if (idx < 0 || idx >= names.length) return {ok: true, skipped: true, index: oneBasedIndex, total: names.length};
  var name = names[idx];
  scannerEnsureSheetLite_(name, SCANNER_HEADERS[name]);
  SpreadsheetApp.flush();
  if (name === SCANNER.SETTINGS_SHEET) scannerSeedSettingsLite_();
  return {ok: true, version: SCANNER.VERSION, index: oneBasedIndex, total: names.length, sheet: name, status: setupShadowCoreScannerBridgeMiniStatus()};
}

function scannerHandle_(body) {
  setupShadowCoreScannerBridgeIfMissing_();
  body = body || {};
  var action = String(body.action || '');
  var publicActions = {'scannerPing': true, 'scannerGetPublicConfig': true};
  if (!publicActions[action]) scannerRequireToken_(body.scannerToken || body.token || '');
  if (typeof boolSetting_ === 'function' && boolSetting_('Safe_Mode', false) && !publicActions[action]) {
    throw new Error('ShadowCore HQ Safe Mode is enabled. Scanner writes are paused.');
  }

  if (action === 'scannerPing') return scannerResponse_({version: SCANNER.VERSION, time: scannerNowIso_(), configured: !!scannerSetting_('Scanner_Shared_Token', ''), safeMode: (typeof boolSetting_ === 'function' ? boolSetting_('Safe_Mode', false) : false)});
  if (action === 'scannerGetPublicConfig') return scannerResponse_(scannerPublicConfig_());
  if (action === 'scannerGetOverlayContext') return scannerResponse_(scannerGetOverlayContext_(body));
  if (action === 'scannerSubmitPageScan') return scannerResponse_(scannerSubmitPageScan_(body));
  if (action === 'scannerAddProfileNote') return scannerResponse_(scannerAddProfileNote_(body));
  if (action === 'scannerSubmitRecruitLead') return scannerResponse_(scannerSubmitRecruitLead_(body));
  if (action === 'scannerSubmitHospitalScan') return scannerResponse_(scannerSubmitHospitalScan_(body));
  if (action === 'scannerSubmitMarketNote') return scannerResponse_(scannerSubmitMarketNote_(body));
  if (action === 'scannerSubmitTravelLog') return scannerResponse_(scannerSubmitTravelLog_(body));
  if (action === 'scannerSubmitAttackResult') return scannerResponse_(scannerSubmitAttackResult_(body));
  if (action === 'scannerSubmitApiSnapshot') return scannerResponse_(scannerSubmitApiSnapshot_(body));
  if (action === 'scannerSubmitTradeLog') return scannerResponse_(scannerSubmitTradeLog_(body));
  if (action === 'scannerSubmitCrimeNote') return scannerResponse_(scannerSubmitCrimeNote_(body));
  if (action === 'scannerSubmitCompanyNote') return scannerResponse_(scannerSubmitCompanyNote_(body));
  if (action === 'scannerRequestSupport') return scannerResponse_(scannerRequestSupport_(body));
  if (action === 'scannerWarCheckin') return scannerResponse_(scannerWarCheckin_(body));
  if (action === 'scannerMarkAssignmentSeen') return scannerResponse_(scannerMarkAssignmentSeen_(body));
  if (action === 'scannerGetPlayerNotes') return scannerResponse_(scannerGetPlayerNotes_(body));
  if (action === 'scannerGetSettings') return scannerResponse_(scannerPublicConfig_());
  if (action === 'scannerSubmitAutoEnrichment') return scannerResponse_(scannerSubmitAutoEnrichment_(body));
  if (action === 'scannerSubmitReadiness') return scannerResponse_(scannerSubmitReadiness_(body));
  if (action === 'scannerSubmitWarReadiness') return scannerResponse_(scannerSubmitWarReadiness_(body));
  if (action === 'scannerSubmitAutoCheckin') return scannerResponse_(scannerSubmitAutoCheckin_(body));
  if (action === 'scannerSubmitAssignmentTracking') return scannerResponse_(scannerSubmitAssignmentTracking_(body));
  if (action === 'scannerSubmitEnemyEnrichment') return scannerResponse_(scannerSubmitEnemyEnrichment_(body));
  if (action === 'scannerSubmitFactionRosterSnapshot') return scannerResponse_(scannerSubmitFactionRosterSnapshot_(body));
  if (action === 'scannerSubmitAutoRecruitLead') return scannerResponse_(scannerSubmitAutoRecruitLead_(body));
  if (action === 'scannerSubmitSupportContext') return scannerResponse_(scannerSubmitSupportContext_(body));
  if (action === 'scannerSubmitTrainingGrowth') return scannerResponse_(scannerSubmitTrainingGrowth_(body));
  if (action === 'scannerSubmitOnboardingProgress') return scannerResponse_(scannerSubmitOnboardingProgress_(body));
  if (action === 'scannerSubmitApiHealth') return scannerResponse_(scannerSubmitApiHealth_(body));
  if (action === 'scannerSubmitScannerHealth') return scannerResponse_(scannerSubmitScannerHealth_(body));
  if (action === 'scannerQueueDiscordTrigger') return scannerResponse_(scannerQueueDiscordTrigger_(body));
  if (action === 'scannerSubmitV18DeepScan' && typeof scannerSubmitV18DeepScan_ === 'function') return scannerResponse_(scannerSubmitV18DeepScan_(body));
  if (action === 'scannerGetV18OptIn' && typeof getV18ScannerOptInState === 'function') return scannerResponse_(getV18ScannerOptInState(body.memberTornId || body.tornId || ''));

  throw new Error('Unsupported scanner action: ' + action);
}

function scannerResponse_(result) {
  return result && result.ok !== undefined ? result : {ok: true, result: result};
}

function scannerPublicConfig_() {
  return {
    ok: true,
    version: SCANNER.VERSION,
    factionName: scannerSetting_('Faction_Name', (typeof factionName_ === 'function' ? factionName_() : 'ShadowCore')),
    hqUrl: scannerSetting_('HQ_Web_App_URL', (typeof appUrl_ === 'function' ? appUrl_() : '')),
    autoSubmitDefault: scannerSetting_('Scanner_Auto_Submit_Default', 'FALSE'),
    allowAutoSubmit: scannerSetting_('Scanner_Allow_Auto_Submit', 'FALSE'),
    allowMarketScan: scannerSetting_('Scanner_Allow_Market_Scan', 'TRUE'),
    allowForumScan: scannerSetting_('Scanner_Allow_Forum_Scan', 'TRUE'),
    allowHospitalScan: scannerSetting_('Scanner_Allow_Hospital_Scan', 'TRUE'),
    allowApiSnapshots: scannerSetting_('Scanner_Allow_API_Snapshots', 'TRUE'),
    allowAutoEnrichment: scannerSetting_('Scanner_Allow_Auto_Enrichment', 'TRUE'),
    autoEnrichmentDefault: scannerSetting_('Scanner_Auto_Enrichment_Default', 'FALSE'),
    apiDisclosure: scannerSetting_('Scanner_API_Disclosure', 'Torn API keys stay in the user browser. ShadowCore HQ only receives API snapshot JSON if the user chooses to submit it.'),
    disclosure: scannerSetting_('Scanner_Disclosure', 'The scanner only submits visible page observations or requests you choose to send. Do not submit private data without consent.')
  };
}

function scannerGetOverlayContext_(body) {
  var member = scannerMember_(body);
  var visiblePlayers = body.visiblePlayers || [];
  var playerIds = {};
  visiblePlayers.slice(0, SCANNER.MAX_PLAYERS_PER_SCAN).forEach(function(p) {
    var id = scannerCleanId_(p.id || p.tornId || p.Player_ID || p.Enemy_ID);
    if (id) playerIds[id] = true;
  });
  if (body.playerId) playerIds[scannerCleanId_(body.playerId)] = true;

  var latestChain = scannerReadIfExists_(sheetNameFromApp_('CHAIN_LOG', 'Chain_Log')).slice(-1)[0] || {};
  var activeWar = scannerReadIfExists_(sheetNameFromApp_('WARS', 'Wars')).filter(function(w) { return String(w.Status || '').toLowerCase() === 'active'; }).slice(-1)[0] || {};
  var myAssignments = [];
  if (member.tornId) {
    myAssignments = scannerReadIfExists_(sheetNameFromApp_('WAR_TARGETS', 'War_Targets')).filter(function(t) {
      return String(t.Assigned_To_ID || '') === String(member.tornId);
    }).slice(-10);
  }

  var profileNotes = scannerReadIfExists_(SCANNER.PROFILE_NOTES_SHEET).filter(function(n) {
    return playerIds[String(n.Player_ID || '')];
  }).slice(-SCANNER.MAX_ROWS_RETURNED);
  var enemyPlayers = scannerReadIfExists_(sheetNameFromApp_('ENEMY_PLAYERS', 'Enemy_Players')).filter(function(n) {
    return playerIds[String(n.Enemy_ID || '')];
  }).slice(-SCANNER.MAX_ROWS_RETURNED);
  var warTargets = scannerReadIfExists_(sheetNameFromApp_('WAR_TARGETS', 'War_Targets')).filter(function(n) {
    return playerIds[String(n.Enemy_ID || '')];
  }).slice(-SCANNER.MAX_ROWS_RETURNED);
  var recruitLeads = scannerReadIfExists_(SCANNER.RECRUIT_LEADS_SHEET).filter(function(n) {
    return playerIds[String(n.Torn_ID || '')];
  }).slice(-SCANNER.MAX_ROWS_RETURNED);

  var myPayouts = [];
  var myApiHealth = [];
  if (member.tornId) {
    myPayouts = scannerReadIfExists_(sheetNameFromApp_('PAYOUTS', 'Payouts')).filter(function(p) { return String(p.Torn_ID || '') === String(member.tornId); }).slice(-5);
    myApiHealth = scannerReadIfExists_(sheetNameFromApp_('API_KEY_HEALTH', 'API_Key_Health')).filter(function(h) { return String(h.Torn_ID || '') === String(member.tornId); }).slice(-3);
  }

  scannerAudit_(member.tornId, member.name, 'scannerGetOverlayContext', body.pageType || '', body.url || '', visiblePlayers.length, 'OK', 'Returned overlay context.');
  return {
    member: member,
    activeWar: activeWar,
    latestChain: latestChain,
    myAssignments: myAssignments,
    profileNotes: profileNotes,
    enemyPlayers: enemyPlayers,
    warTargets: warTargets,
    recruitLeads: recruitLeads,
    myPayouts: myPayouts,
    myApiHealth: myApiHealth,
    publicConfig: scannerPublicConfig_()
  };
}

function scannerSubmitPageScan_(body) {
  var member = scannerMember_(body);
  var scan = body.scan || body.payload || {};
  var players = (scan.players || []).slice(0, SCANNER.MAX_PLAYERS_PER_SCAN);
  var pageType = String(scan.pageType || body.pageType || 'unknown');
  var mode = String(body.mode || scan.mode || 'manual');
  var submissionId = 'SCAN-' + scannerUuid_();
  scannerAppend_(SCANNER.SUBMISSIONS_SHEET, {
    Submission_ID: submissionId,
    Timestamp: scannerNowIso_(),
    Submitted_By_ID: member.tornId,
    Submitted_By_Name: member.name,
    Page_Type: pageType,
    Source_URL: scannerCleanText_(scan.url || body.url || '', 800),
    Mode: mode,
    Subject_ID: scannerCleanText_((scan.subject && scan.subject.id) || '', 60),
    Subject_Name: scannerCleanText_((scan.subject && scan.subject.name) || '', 120),
    Count: players.length,
    Payload_JSON: scannerJson_(scannerTrimLargeScan_(scan)),
    Processed: 'TRUE',
    Notes: scannerCleanText_(body.notes || '', 500)
  });

  var importedEnemies = 0;
  var importedRecruitLeads = 0;
  var importedHospital = 0;
  players.forEach(function(p) {
    var pid = scannerCleanId_(p.id || p.tornId || p.Player_ID || p.Enemy_ID);
    if (!pid) return;
    var name = scannerCleanText_(p.name || p.Name || '', 120);
    var level = scannerCleanText_(p.level || p.Level || '', 30);
    var status = scannerCleanText_(p.status || p.Status || '', 120);
    var factionId = scannerCleanId_(p.factionId || (scan.subject && scan.subject.id) || '');
    var factionName = scannerCleanText_(p.factionName || (scan.subject && scan.subject.name) || '', 120);

    if (pageType === 'faction' || pageType === 'enemyFaction' || pageType === 'war' || mode === 'war' || mode === 'target') {
      scannerUpsert_(sheetNameFromApp_('ENEMY_PLAYERS', 'Enemy_Players'), 'Enemy_ID', pid, {
        Enemy_ID: pid,
        Name: name,
        Faction_ID: factionId,
        Level: level,
        Status: status,
        Last_Seen: scannerNowIso_(),
        Known_Strength: '',
        Good_Target: '',
        Avoid: '',
        Best_Attackers: '',
        Notes: 'Scanner import from ' + pageType + ' by ' + member.name,
        Updated: scannerNowIso_()
      });
      importedEnemies++;
    }
    if (pageType === 'forum' || mode === 'recruit' || String(p.recruitLead || '').toUpperCase() === 'TRUE') {
      scannerUpsert_(SCANNER.RECRUIT_LEADS_SHEET, 'Torn_ID', pid, {
        Lead_ID: 'LEAD-' + scannerUuid_(),
        Timestamp: scannerNowIso_(),
        Torn_ID: pid,
        Name: name,
        Level: level,
        Faction_ID: factionId,
        Faction_Name: factionName,
        Source: pageType,
        Submitted_By_ID: member.tornId,
        Submitted_By_Name: member.name,
        Status: 'New',
        Score: '',
        Notes: scannerCleanText_(body.notes || p.notes || '', 500),
        Source_URL: scannerCleanText_(scan.url || body.url || '', 800)
      });
      importedRecruitLeads++;
    }
    if (pageType === 'hospital' || scannerTextLooksHospital_(status)) {
      scannerAppend_(SCANNER.HOSPITAL_SCANS_SHEET, {
        Scan_ID: 'HOSP-' + scannerUuid_(),
        Timestamp: scannerNowIso_(),
        Torn_ID: pid,
        Name: name,
        Status: status || 'Hospital',
        Hospital_Until: scannerCleanText_(p.hospitalUntil || '', 120),
        Time_Left_Text: scannerCleanText_(p.timeLeft || '', 120),
        Reason: scannerCleanText_(p.reason || '', 200),
        Priority: scannerCleanText_(p.priority || '', 80),
        Submitted_By_ID: member.tornId,
        Submitted_By_Name: member.name,
        Source_URL: scannerCleanText_(scan.url || body.url || '', 800),
        Notes: scannerCleanText_(body.notes || p.notes || '', 500)
      });
      importedHospital++;
    }
  });

  scannerAudit_(member.tornId, member.name, 'scannerSubmitPageScan', pageType, scan.url || body.url || '', players.length, 'OK', 'Enemies=' + importedEnemies + ', recruitLeads=' + importedRecruitLeads + ', hospitals=' + importedHospital);
  return {submissionId: submissionId, players: players.length, importedEnemies: importedEnemies, importedRecruitLeads: importedRecruitLeads, importedHospital: importedHospital};
}

function scannerAddProfileNote_(body) {
  var member = scannerMember_(body);
  var player = body.player || {};
  var playerId = scannerCleanId_(body.playerId || player.id || player.tornId || '');
  if (!playerId) throw new Error('Missing player ID.');
  var noteId = 'NOTE-' + scannerUuid_();
  var row = {
    Note_ID: noteId,
    Timestamp: scannerNowIso_(),
    Player_ID: playerId,
    Player_Name: scannerCleanText_(body.playerName || player.name || '', 120),
    Category: scannerCleanText_(body.category || 'General', 80),
    Rating: scannerCleanText_(body.rating || '', 80),
    Submitted_By_ID: member.tornId,
    Submitted_By_Name: member.name,
    Source_URL: scannerCleanText_(body.url || '', 800),
    Note: scannerCleanText_(body.note || '', 2000),
    Visibility: scannerCleanText_(body.visibility || 'Faction', 80),
    Updated: scannerNowIso_()
  };
  scannerAppend_(SCANNER.PROFILE_NOTES_SHEET, row);

  if (row.Category === 'Target' || row.Category === 'Safe Target' || row.Category === 'Risky Target' || row.Category === 'Do Not Hit') {
    scannerUpsert_(sheetNameFromApp_('ENEMY_PLAYERS', 'Enemy_Players'), 'Enemy_ID', playerId, {
      Enemy_ID: playerId,
      Name: row.Player_Name,
      Faction_ID: scannerCleanId_(body.factionId || ''),
      Level: scannerCleanText_(body.level || '', 30),
      Status: scannerCleanText_(body.status || '', 120),
      Last_Seen: scannerNowIso_(),
      Known_Strength: row.Rating,
      Good_Target: row.Category === 'Safe Target' ? 'TRUE' : '',
      Avoid: row.Category === 'Do Not Hit' ? 'TRUE' : '',
      Best_Attackers: '',
      Notes: row.Note,
      Updated: scannerNowIso_()
    });
  }
  scannerAudit_(member.tornId, member.name, 'scannerAddProfileNote', body.pageType || 'profile', body.url || '', 1, 'OK', row.Category + ': ' + row.Player_Name);
  return {noteId: noteId};
}

function scannerSubmitRecruitLead_(body) {
  var member = scannerMember_(body);
  var player = body.player || {};
  var id = scannerCleanId_(body.tornId || player.id || player.tornId || '');
  if (!id) throw new Error('Missing recruit Torn ID.');
  var row = {
    Lead_ID: 'LEAD-' + scannerUuid_(),
    Timestamp: scannerNowIso_(),
    Torn_ID: id,
    Name: scannerCleanText_(body.name || player.name || '', 120),
    Level: scannerCleanText_(body.level || player.level || '', 30),
    Faction_ID: scannerCleanId_(body.factionId || player.factionId || ''),
    Faction_Name: scannerCleanText_(body.factionName || player.factionName || '', 120),
    Source: scannerCleanText_(body.source || body.pageType || 'scanner', 80),
    Submitted_By_ID: member.tornId,
    Submitted_By_Name: member.name,
    Status: 'New',
    Score: '',
    Notes: scannerCleanText_(body.notes || '', 1000),
    Source_URL: scannerCleanText_(body.url || '', 800)
  };
  scannerUpsert_(SCANNER.RECRUIT_LEADS_SHEET, 'Torn_ID', id, row);
  scannerAudit_(member.tornId, member.name, 'scannerSubmitRecruitLead', body.pageType || '', body.url || '', 1, 'OK', row.Name);
  return {leadId: row.Lead_ID, tornId: id};
}

function scannerSubmitHospitalScan_(body) {
  var member = scannerMember_(body);
  var rows = body.players || [body.player || body];
  var count = 0;
  rows.slice(0, SCANNER.MAX_PLAYERS_PER_SCAN).forEach(function(p) {
    var id = scannerCleanId_(p.tornId || p.id || body.tornId || '');
    if (!id) return;
    scannerAppend_(SCANNER.HOSPITAL_SCANS_SHEET, {
      Scan_ID: 'HOSP-' + scannerUuid_(),
      Timestamp: scannerNowIso_(),
      Torn_ID: id,
      Name: scannerCleanText_(p.name || body.name || '', 120),
      Status: scannerCleanText_(p.status || body.status || 'Hospital', 120),
      Hospital_Until: scannerCleanText_(p.hospitalUntil || body.hospitalUntil || '', 120),
      Time_Left_Text: scannerCleanText_(p.timeLeft || body.timeLeft || '', 120),
      Reason: scannerCleanText_(p.reason || body.reason || '', 200),
      Priority: scannerCleanText_(p.priority || body.priority || '', 80),
      Submitted_By_ID: member.tornId,
      Submitted_By_Name: member.name,
      Source_URL: scannerCleanText_(body.url || '', 800),
      Notes: scannerCleanText_(p.notes || body.notes || '', 500)
    });
    count++;
  });
  scannerAudit_(member.tornId, member.name, 'scannerSubmitHospitalScan', body.pageType || 'hospital', body.url || '', count, 'OK', 'Hospital rows submitted.');
  return {count: count};
}

function scannerSubmitMarketNote_(body) {
  var member = scannerMember_(body);
  var item = body.item || {};
  var row = {
    Note_ID: 'MKT-' + scannerUuid_(),
    Timestamp: scannerNowIso_(),
    Item: scannerCleanText_(item.name || body.itemName || body.name || '', 120),
    Price: scannerCleanNumber_(item.price || body.price || ''),
    Quantity: scannerCleanNumber_(item.quantity || body.quantity || 1),
    Seller_ID: scannerCleanId_(item.sellerId || body.sellerId || ''),
    Seller_Name: scannerCleanText_(item.sellerName || body.sellerName || '', 120),
    Location: scannerCleanText_(body.location || body.pageType || '', 120),
    Profit_Note: scannerCleanText_(body.profitNote || '', 300),
    Submitted_By_ID: member.tornId,
    Submitted_By_Name: member.name,
    Source_URL: scannerCleanText_(body.url || '', 800),
    Notes: scannerCleanText_(body.notes || '', 800)
  };
  scannerAppend_(SCANNER.MARKET_NOTES_SHEET, row);
  scannerAudit_(member.tornId, member.name, 'scannerSubmitMarketNote', body.pageType || 'market', body.url || '', 1, 'OK', row.Item);
  return {noteId: row.Note_ID};
}

function scannerSubmitTravelLog_(body) {
  var member = scannerMember_(body);
  var row = {
    Log_ID: 'TRAVEL-' + scannerUuid_(),
    Timestamp: scannerNowIso_(),
    Location: scannerCleanText_(body.location || '', 120),
    Item: scannerCleanText_(body.item || body.itemName || '', 120),
    Buy_Price: scannerCleanNumber_(body.buyPrice || ''),
    Sell_Price: scannerCleanNumber_(body.sellPrice || ''),
    Quantity: scannerCleanNumber_(body.quantity || 1),
    Profit_Estimate: scannerCleanNumber_(body.profitEstimate || ''),
    Submitted_By_ID: member.tornId,
    Submitted_By_Name: member.name,
    Source_URL: scannerCleanText_(body.url || '', 800),
    Notes: scannerCleanText_(body.notes || '', 800)
  };
  scannerAppend_(SCANNER.TRAVEL_LOGS_SHEET, row);
  scannerAudit_(member.tornId, member.name, 'scannerSubmitTravelLog', body.pageType || 'travel', body.url || '', 1, 'OK', row.Item);
  return {logId: row.Log_ID};
}

function scannerSubmitAttackResult_(body) {
  var member = scannerMember_(body);
  var result = body.result || body.attack || {};
  var attackId = 'ATKSCAN-' + scannerUuid_();
  var row = {
    Attack_ID: attackId,
    Timestamp: scannerNowIso_(),
    Attacker_ID: scannerCleanId_(result.attackerId || body.attackerId || member.tornId),
    Attacker_Name: scannerCleanText_(result.attackerName || body.attackerName || member.name, 120),
    Defender_ID: scannerCleanId_(result.defenderId || body.defenderId || ''),
    Defender_Name: scannerCleanText_(result.defenderName || body.defenderName || '', 120),
    Result: scannerCleanText_(result.result || body.attackResult || body.resultText || '', 120),
    Respect: scannerCleanNumber_(result.respect || body.respect || ''),
    Chain: scannerCleanNumber_(result.chain || body.chain || ''),
    Source_URL: scannerCleanText_(body.url || '', 800),
    Submitted_By_ID: member.tornId,
    Submitted_By_Name: member.name,
    Notes: scannerCleanText_(body.notes || '', 500)
  };
  scannerAppend_(SCANNER.ATTACK_RESULTS_SHEET, row);
  if (row.Defender_ID || row.Result) {
    scannerAppend_(sheetNameFromApp_('WAR_ATTACKS', 'War_Attacks'), {
      Attack_ID: attackId,
      War_ID: scannerActiveWarId_(),
      Timestamp: row.Timestamp,
      Attacker_ID: row.Attacker_ID,
      Attacker_Name: row.Attacker_Name,
      Defender_ID: row.Defender_ID,
      Defender_Name: row.Defender_Name,
      Result: row.Result,
      Respect: row.Respect,
      Chain: row.Chain,
      Is_KO: String(row.Result).toLowerCase().indexOf('hospital') !== -1 ? 'TRUE' : '',
      Is_Assist: '',
      Source: 'Tampermonkey Scanner'
    });
  }
  scannerAudit_(member.tornId, member.name, 'scannerSubmitAttackResult', body.pageType || 'attack', body.url || '', 1, 'OK', row.Result);
  return {attackId: attackId};
}


function scannerSubmitApiSnapshot_(body) {
  var member = scannerMember_(body);
  var allow = String(scannerSetting_('Scanner_Allow_API_Snapshots', 'TRUE')).toUpperCase() === 'TRUE';
  if (!allow) throw new Error('API snapshot submissions are disabled in Scanner_Settings.');
  var snap = body.apiSnapshot || body.snapshot || {};
  var snapType = scannerCleanText_(snap.type || body.snapshotType || 'unknown', 80);
  var snapshotId = 'APISNAP-' + scannerUuid_();
  var payload = scannerJson_(scannerTrimApiSnapshot_(snap));
  scannerAppend_(SCANNER.API_SNAPSHOTS_SHEET, {
    Snapshot_ID: snapshotId,
    Timestamp: scannerNowIso_(),
    Submitted_By_ID: member.tornId,
    Submitted_By_Name: member.name,
    Snapshot_Type: snapType,
    Endpoint: scannerCleanText_(snap.endpoint || body.endpoint || '', 120),
    Selections: scannerCleanText_(snap.selections || body.apiSelections || '', 300),
    Subject_ID: scannerCleanId_(snap.subjectId || body.subjectId || member.tornId || ''),
    Subject_Name: scannerCleanText_(snap.subjectName || body.subjectName || member.name || '', 120),
    Rate_Per_Second: scannerCleanNumber_(snap.ratePerSecond || body.apiRatePerSecond || ''),
    Status: scannerCleanText_(snap.status || 'Submitted', 80),
    Summary: scannerCleanText_(snap.summary || '', 500),
    Payload_JSON: payload,
    Source_URL: scannerCleanText_(body.url || '', 800),
    Notes: scannerCleanText_(body.notes || 'API key was not transmitted by the scanner.', 800)
  });
  try { if (typeof v22UpsertMemberStatusFromApiSnapshot_ === 'function') v22UpsertMemberStatusFromApiSnapshot_(member, snap); } catch (v22err) { scannerAudit_(member.tornId, member.name, 'v22ApiSnapshotStatusUpdate', body.pageType || 'api', body.url || '', 1, 'WARN', String(v22err.message || v22err)); }
  scannerAudit_(member.tornId, member.name, 'scannerSubmitApiSnapshot', body.pageType || 'api', body.url || '', 1, 'OK', snapType + ' ' + (snap.summary || ''));
  return {snapshotId: snapshotId, snapshotType: snapType};
}

function scannerTrimApiSnapshot_(snap) {
  var copy;
  try { copy = JSON.parse(JSON.stringify(snap || {})); } catch (err) { copy = {raw: String(snap || '')}; }
  if (copy.apiKey) delete copy.apiKey;
  if (copy.tornApiKey) delete copy.tornApiKey;
  var text = scannerJson_(copy);
  if (text.length <= 50000) return copy;
  return {
    type: copy.type || '',
    fetchedAt: copy.fetchedAt || '',
    endpoint: copy.endpoint || '',
    selections: copy.selections || '',
    subjectId: copy.subjectId || '',
    subjectName: copy.subjectName || '',
    ratePerSecond: copy.ratePerSecond || '',
    summary: copy.summary || '',
    truncated: true,
    payloadPreview: text.slice(0, 48000)
  };
}

function scannerSubmitTradeLog_(body) {
  var member = scannerMember_(body);
  var row = {
    Trade_ID: 'TRADE-' + scannerUuid_(),
    Timestamp: scannerNowIso_(),
    Partner_ID: scannerCleanId_(body.partnerId || ''),
    Partner_Name: scannerCleanText_(body.partnerName || '', 120),
    Direction: scannerCleanText_(body.direction || '', 60),
    Amount: scannerCleanNumber_(body.amount || ''),
    Item: scannerCleanText_(body.item || body.itemName || '', 120),
    Quantity: scannerCleanNumber_(body.quantity || 1),
    Category: scannerCleanText_(body.category || 'Trade', 80),
    Related_Loan_ID: scannerCleanText_(body.relatedLoanId || '', 80),
    Submitted_By_ID: member.tornId,
    Submitted_By_Name: member.name,
    Source_URL: scannerCleanText_(body.url || '', 800),
    Notes: scannerCleanText_(body.notes || '', 800)
  };
  scannerAppend_(SCANNER.TRADE_LOGS_SHEET, row);
  scannerAudit_(member.tornId, member.name, 'scannerSubmitTradeLog', body.pageType || 'trade', body.url || '', 1, 'OK', row.Category);
  return {tradeId: row.Trade_ID};
}

function scannerSubmitCrimeNote_(body) {
  var member = scannerMember_(body);
  var row = {
    Crime_Note_ID: 'CRIME-' + scannerUuid_(),
    Timestamp: scannerNowIso_(),
    Crime: scannerCleanText_(body.crime || '', 120),
    Role: scannerCleanText_(body.role || '', 80),
    Torn_ID: scannerCleanId_(body.tornId || ''),
    Name: scannerCleanText_(body.name || '', 120),
    Status: scannerCleanText_(body.status || '', 100),
    Reliability_Note: scannerCleanText_(body.reliabilityNote || '', 300),
    Submitted_By_ID: member.tornId,
    Submitted_By_Name: member.name,
    Source_URL: scannerCleanText_(body.url || '', 800),
    Notes: scannerCleanText_(body.notes || '', 800)
  };
  scannerAppend_(SCANNER.CRIME_NOTES_SHEET, row);
  scannerAudit_(member.tornId, member.name, 'scannerSubmitCrimeNote', body.pageType || 'crime', body.url || '', 1, 'OK', row.Crime);
  return {crimeNoteId: row.Crime_Note_ID};
}

function scannerSubmitCompanyNote_(body) {
  var member = scannerMember_(body);
  var row = {
    Company_Note_ID: 'COMP-' + scannerUuid_(),
    Timestamp: scannerNowIso_(),
    Company_ID: scannerCleanId_(body.companyId || ''),
    Company_Name: scannerCleanText_(body.companyName || '', 120),
    Torn_ID: scannerCleanId_(body.tornId || ''),
    Name: scannerCleanText_(body.name || '', 120),
    Role: scannerCleanText_(body.role || '', 80),
    Work_Stats_Note: scannerCleanText_(body.workStatsNote || '', 300),
    Submitted_By_ID: member.tornId,
    Submitted_By_Name: member.name,
    Source_URL: scannerCleanText_(body.url || '', 800),
    Notes: scannerCleanText_(body.notes || '', 800)
  };
  scannerAppend_(SCANNER.COMPANY_NOTES_SHEET, row);
  scannerAudit_(member.tornId, member.name, 'scannerSubmitCompanyNote', body.pageType || 'company', body.url || '', 1, 'OK', row.Company_Name);
  return {companyNoteId: row.Company_Note_ID};
}

function scannerRequestSupport_(body) {
  var member = scannerMember_(body);
  var type = scannerCleanText_(body.requestType || body.type || 'Support', 80);
  var id = 'SCREQ-' + scannerUuid_();
  var lower = type.toLowerCase();
  if (lower.indexOf('revive') !== -1 || lower.indexOf('hospital') !== -1) {
    scannerAppend_(sheetNameFromApp_('REVIVE_BOARD', 'Revive_Board'), {
      Revive_ID: id,
      Timestamp: scannerNowIso_(),
      Torn_ID: scannerCleanId_(body.targetId || member.tornId),
      Name: scannerCleanText_(body.targetName || member.name, 120),
      Hospital_Until: scannerCleanText_(body.hospitalUntil || '', 120),
      Priority: scannerCleanText_(body.priority || 'Normal', 80),
      Assigned_Reviver_ID: '',
      Assigned_Reviver_Name: '',
      Status: 'Requested',
      Cost: '',
      Requested_By: member.name,
      Notes: scannerCleanText_(body.notes || '', 800)
    });
    scannerAppend_(SCANNER.HOSPITAL_SCANS_SHEET, {
      Scan_ID: 'HOSP-' + scannerUuid_(),
      Timestamp: scannerNowIso_(),
      Torn_ID: scannerCleanId_(body.targetId || member.tornId),
      Name: scannerCleanText_(body.targetName || member.name, 120),
      Status: 'Revive Requested',
      Hospital_Until: scannerCleanText_(body.hospitalUntil || '', 120),
      Time_Left_Text: scannerCleanText_(body.timeLeft || '', 120),
      Reason: scannerCleanText_(body.reason || '', 200),
      Priority: scannerCleanText_(body.priority || 'Normal', 80),
      Submitted_By_ID: member.tornId,
      Submitted_By_Name: member.name,
      Source_URL: scannerCleanText_(body.url || '', 800),
      Notes: scannerCleanText_(body.notes || '', 800)
    });
  } else if (lower.indexOf('loan') !== -1) {
    scannerAppend_(sheetNameFromApp_('LOAN_COLLATERAL', 'Loan_Collateral'), {
      Loan_ID: id,
      Timestamp: scannerNowIso_(),
      Torn_ID: member.tornId,
      Name: member.name,
      Loan_Type: scannerCleanText_(body.loanType || 'Cash/Item', 80),
      Amount: scannerCleanNumber_(body.amount || ''),
      Item: scannerCleanText_(body.item || '', 120),
      Quantity: scannerCleanNumber_(body.quantity || 1),
      Collateral: scannerCleanText_(body.collateral || '', 200),
      Due_Date: scannerCleanText_(body.dueDate || '', 120),
      Status: 'Requested',
      Approved_By: '',
      Returned_Date: '',
      Notes: scannerCleanText_(body.notes || '', 800)
    });
  } else {
    scannerAppend_(sheetNameFromApp_('ARMORY_REQUESTS', 'Armory_Requests'), {
      Request_ID: id,
      Timestamp: scannerNowIso_(),
      Torn_ID: member.tornId,
      Name: member.name,
      Request_Type: type,
      Item: scannerCleanText_(body.item || '', 120),
      Quantity: scannerCleanNumber_(body.quantity || 1),
      Reason: scannerCleanText_(body.reason || body.notes || '', 500),
      Urgency: scannerCleanText_(body.urgency || 'Normal', 80),
      Status: 'Pending',
      Reviewed_By: '',
      Fulfilled_Date: '',
      Notes: scannerCleanText_(body.notes || '', 800)
    });
  }
  scannerAudit_(member.tornId, member.name, 'scannerRequestSupport', body.pageType || '', body.url || '', 1, 'OK', type);
  return {requestId: id, requestType: type};
}

function scannerWarCheckin_(body) {
  var member = scannerMember_(body);
  var id = 'CHK-' + scannerUuid_();
  var warId = scannerCleanText_(body.warId || scannerActiveWarId_() || 'CURRENT', 80);
  scannerAppend_(sheetNameFromApp_('WAR_COMMITMENTS', 'War_Commitments'), {
    Commitment_ID: id,
    War_ID: warId,
    Torn_ID: member.tornId,
    Name: member.name,
    Available: scannerCleanText_(body.available || 'Yes', 30),
    Time_Windows: scannerCleanText_(body.timeWindows || body.window || '', 200),
    Can_Hit: scannerCleanText_(body.canHit || 'Yes', 30),
    Can_Chain: scannerCleanText_(body.canChain || 'Yes', 30),
    Notes: scannerCleanText_(body.notes || '', 800),
    Timestamp: scannerNowIso_()
  });
  scannerAudit_(member.tornId, member.name, 'scannerWarCheckin', body.pageType || '', body.url || '', 1, 'OK', body.available || 'Yes');
  return {commitmentId: id};
}

function scannerMarkAssignmentSeen_(body) {
  var member = scannerMember_(body);
  var targetId = scannerCleanText_(body.targetId || '', 80);
  var note = 'Assignment seen by ' + member.name + ' at ' + scannerNowIso_();
  if (targetId) {
    var targets = scannerReadIfExists_(sheetNameFromApp_('WAR_TARGETS', 'War_Targets'));
    var found = null;
    targets.forEach(function(t) {
      if (String(t.Target_ID || '') === String(targetId) || String(t.Enemy_ID || '') === String(targetId)) found = t;
    });
    if (found) {
      found.Notes = scannerCleanText_((found.Notes || '') + ' | ' + note, 1000);
      found.Updated = scannerNowIso_();
      scannerUpsert_(sheetNameFromApp_('WAR_TARGETS', 'War_Targets'), 'Target_ID', found.Target_ID || targetId, found);
    }
  }
  scannerAudit_(member.tornId, member.name, 'scannerMarkAssignmentSeen', body.pageType || '', body.url || '', 1, 'OK', targetId);
  return {seen: true, targetId: targetId};
}

function scannerGetPlayerNotes_(body) {
  scannerRequireToken_(body.scannerToken || body.token || '');
  var playerId = scannerCleanId_(body.playerId || body.tornId || '');
  if (!playerId) throw new Error('Missing player ID.');
  return {
    notes: scannerReadIfExists_(SCANNER.PROFILE_NOTES_SHEET).filter(function(n) { return String(n.Player_ID || '') === String(playerId); }).slice(-SCANNER.MAX_ROWS_RETURNED),
    enemy: scannerReadIfExists_(sheetNameFromApp_('ENEMY_PLAYERS', 'Enemy_Players')).filter(function(n) { return String(n.Enemy_ID || '') === String(playerId); }).slice(-5),
    recruit: scannerReadIfExists_(SCANNER.RECRUIT_LEADS_SHEET).filter(function(n) { return String(n.Torn_ID || '') === String(playerId); }).slice(-5)
  };
}

function scannerActiveWarId_() {
  var active = scannerReadIfExists_(sheetNameFromApp_('WARS', 'Wars')).filter(function(w) { return String(w.Status || '').toLowerCase() === 'active'; }).slice(-1)[0];
  return active ? active.War_ID : '';
}


/** v1.7 Auto Enrichment Engine: accepts one bundled scanner payload and fans it out to purpose-built sheets. */
function scannerSubmitAutoEnrichment_(body) {
  var member = scannerMember_(body);
  var payload = body.enrichment || body.payload || {};
  var scan = payload.scan || body.scan || {};
  var trigger = scannerCleanText_(payload.trigger || body.trigger || 'manual', 80);
  var categories = payload.categories || [];
  var count = 0;

  scannerAppend_(SCANNER.AUTO_LOG_SHEET, {
    Event_ID: 'AE-' + scannerUuid_(),
    Timestamp: scannerNowIso_(),
    Submitted_By_ID: member.tornId,
    Submitted_By_Name: member.name,
    Trigger: trigger,
    Page_Type: scan.pageType || body.pageType || '',
    Source_URL: scannerCleanText_(scan.url || body.sourceUrl || '', 800),
    Categories: categories.join ? categories.join(',') : String(categories || ''),
    Summary: scannerCleanText_(payload.summary || '', 500),
    Payload_JSON: scannerJson_(scannerTrimAutoPayload_(payload)),
    Processed: 'TRUE'
  });
  count++;

  if (payload.readiness) { scannerStoreReadiness_(member, payload.readiness, scan, payload.apiSnapshot); count++; }
  if (payload.warReadiness) { scannerStoreWarReadiness_(member, payload.warReadiness, scan); count++; }
  if (payload.autoCheckin) { scannerStoreAutoCheckin_(member, payload.autoCheckin, scan); count++; }
  if (payload.assignmentTracking) { scannerStoreAssignmentTracking_(member, payload.assignmentTracking, scan); count++; }
  if (payload.enemyEnrichment && payload.enemyEnrichment.length) { payload.enemyEnrichment.slice(0, SCANNER.MAX_PLAYERS_PER_SCAN).forEach(function(e) { scannerStoreEnemyEnrichment_(member, e, scan); count++; }); }
  if (payload.factionRoster) { scannerStoreFactionRoster_(member, payload.factionRoster, scan); count++; }
  if (payload.recruitLeads && payload.recruitLeads.length) { payload.recruitLeads.slice(0, 50).forEach(function(r) { scannerStoreAutoRecruit_(member, r, scan); count++; }); }
  if (payload.hospitalSupport && payload.hospitalSupport.length) { payload.hospitalSupport.slice(0, 80).forEach(function(h) { scannerStoreHospitalContext_(member, h, scan); count++; }); }
  if (payload.supportContext) { scannerStoreSupportContext_(member, payload.supportContext, scan); count++; }
  if (payload.marketTravel) { scannerStoreMarketTravel_(member, payload.marketTravel, scan); count++; }
  if (payload.tradeLoan) { scannerStoreTradeLoan_(member, payload.tradeLoan, scan); count++; }
  if (payload.trainingGrowth) { scannerStoreTrainingGrowth_(member, payload.trainingGrowth, scan); count++; }
  if (payload.onboarding) { scannerStoreOnboarding_(member, payload.onboarding, scan); count++; }
  if (payload.apiHealth) { scannerStoreApiHealth_(member, payload.apiHealth, scan); count++; }
  if (payload.scannerHealth) { scannerStoreScannerHealth_(member, payload.scannerHealth, scan); count++; }
  if (payload.discordTriggers && payload.discordTriggers.length) { payload.discordTriggers.slice(0, 20).forEach(function(d) { scannerStoreDiscordTrigger_(member, d, scan); count++; }); }
  if (scan.attackResult && (scan.attackResult.attackerId || scan.attackResult.defenderId || scan.attackResult.result)) {
    try { scannerSubmitAttackResult_({member: member, scannerToken: body.scannerToken || body.token, attack: scan.attackResult, sourceUrl: scan.url}); count++; } catch (err) {}
  }
  scannerAudit_(member.tornId, member.name, 'scannerSubmitAutoEnrichment', scan.pageType || '', scan.url || '', count, 'OK', 'Auto enrichment stored.');
  return {ok: true, stored: count, version: SCANNER.VERSION};
}

function scannerSubmitReadiness_(body) { var member = scannerMember_(body); scannerStoreReadiness_(member, body.readiness || {}, body.scan || {}, body.apiSnapshot || {}); return {ok:true}; }
function scannerSubmitWarReadiness_(body) { var member = scannerMember_(body); scannerStoreWarReadiness_(member, body.warReadiness || {}, body.scan || {}); return {ok:true}; }
function scannerSubmitAutoCheckin_(body) { var member = scannerMember_(body); scannerStoreAutoCheckin_(member, body.checkin || {}, body.scan || {}); return {ok:true}; }
function scannerSubmitAssignmentTracking_(body) { var member = scannerMember_(body); scannerStoreAssignmentTracking_(member, body.assignment || {}, body.scan || {}); return {ok:true}; }
function scannerSubmitEnemyEnrichment_(body) { var member = scannerMember_(body); (body.enemies || [body.enemy || {}]).forEach(function(e){ scannerStoreEnemyEnrichment_(member,e,body.scan||{}); }); return {ok:true}; }
function scannerSubmitFactionRosterSnapshot_(body) { var member = scannerMember_(body); scannerStoreFactionRoster_(member, body.roster || {}, body.scan || {}); return {ok:true}; }
function scannerSubmitAutoRecruitLead_(body) { var member = scannerMember_(body); scannerStoreAutoRecruit_(member, body.lead || {}, body.scan || {}); return {ok:true}; }
function scannerSubmitSupportContext_(body) { var member = scannerMember_(body); scannerStoreSupportContext_(member, body.context || {}, body.scan || {}); return {ok:true}; }
function scannerSubmitTrainingGrowth_(body) { var member = scannerMember_(body); scannerStoreTrainingGrowth_(member, body.training || {}, body.scan || {}); return {ok:true}; }
function scannerSubmitOnboardingProgress_(body) { var member = scannerMember_(body); scannerStoreOnboarding_(member, body.onboarding || {}, body.scan || {}); return {ok:true}; }
function scannerSubmitApiHealth_(body) { var member = scannerMember_(body); scannerStoreApiHealth_(member, body.apiHealth || {}, body.scan || {}); return {ok:true}; }
function scannerSubmitScannerHealth_(body) { var member = scannerMember_(body); scannerStoreScannerHealth_(member, body.scannerHealth || {}, body.scan || {}); return {ok:true}; }
function scannerQueueDiscordTrigger_(body) { var member = scannerMember_(body); scannerStoreDiscordTrigger_(member, body.trigger || {}, body.scan || {}); return {ok:true}; }

function scannerStoreReadiness_(member, r, scan, apiSnapshot) {
  r = r || {};
  scannerAppend_(SCANNER.MEMBER_READINESS_SHEET, {
    Snapshot_ID: 'MR-' + scannerUuid_(), Timestamp: scannerNowIso_(), Torn_ID: member.tornId || r.tornId || '', Name: member.name || r.name || '',
    Level: r.level || '', Status: r.status || '', Life_Current: scannerCleanNumber_(r.lifeCurrent), Life_Max: scannerCleanNumber_(r.lifeMax), Energy_Current: scannerCleanNumber_(r.energyCurrent), Energy_Max: scannerCleanNumber_(r.energyMax),
    Nerve_Current: scannerCleanNumber_(r.nerveCurrent), Nerve_Max: scannerCleanNumber_(r.nerveMax), Happy_Current: scannerCleanNumber_(r.happyCurrent), Happy_Max: scannerCleanNumber_(r.happyMax),
    Hospital: r.hospital || '', Jail: r.jail || '', Travel: r.travel || '', Drug_CD: r.drugCooldown || '', Medical_CD: r.medicalCooldown || '', Booster_CD: r.boosterCooldown || '', Last_Action: r.lastAction || '',
    Readiness_Score: scannerCleanNumber_(r.readinessScore), Can_Hit: r.canHit === undefined ? '' : String(!!r.canHit), Needs_Revive: r.needsRevive === undefined ? '' : String(!!r.needsRevive), Source: r.source || 'scanner', Payload_JSON: scannerJson_(scannerTrimAutoPayload_(r))
  });
  try { if (typeof v22UpsertMemberStatusFromReadiness_ === 'function') v22UpsertMemberStatusFromReadiness_(member, r); } catch (v22err) { scannerAudit_(member.tornId, member.name, 'v22ReadinessStatusUpdate', scan.pageType || 'readiness', scan.url || '', 1, 'WARN', String(v22err.message || v22err)); }
}
function scannerStoreWarReadiness_(member, wr, scan) {
  scannerAppend_(SCANNER.WAR_READINESS_SHEET, {Score_ID:'WR-'+scannerUuid_(), Timestamp:scannerNowIso_(), Torn_ID:member.tornId, Name:member.name, War_ID:wr.warId || scannerActiveWarId_(), Score:scannerCleanNumber_(wr.score), Ready:wr.ready || '', Can_Hit:wr.canHit === undefined ? '' : String(!!wr.canHit), Blockers:(wr.blockers||[]).join ? wr.blockers.join(', ') : String(wr.blockers||''), Recommendations:(wr.recommendations||[]).join ? wr.recommendations.join('; ') : String(wr.recommendations||''), Source_URL:scan.url || ''});
}
function scannerStoreAutoCheckin_(member, c, scan) {
  scannerAppend_(SCANNER.AUTO_CHECKINS_SHEET, {Checkin_ID:'CI-'+scannerUuid_(), Timestamp:scannerNowIso_(), Torn_ID:member.tornId, Name:member.name, Checkin_Type:c.type || 'page_seen', Page_Type:scan.pageType || '', War_ID:c.warId || scannerActiveWarId_(), Status:c.status || '', Details:scannerJson_(c), Source_URL:scan.url || ''});
}
function scannerStoreAssignmentTracking_(member, a, scan) {
  scannerAppend_(SCANNER.ASSIGNMENT_TRACKING_SHEET, {Track_ID:'AT-'+scannerUuid_(), Timestamp:scannerNowIso_(), Torn_ID:member.tornId, Name:member.name, War_ID:a.warId || scannerActiveWarId_(), Assignment_ID:a.assignmentId || '', Target_ID:scannerCleanId_(a.targetId || (scan.subject && scan.subject.id) || ''), Target_Name:a.targetName || (scan.subject && scan.subject.name) || '', Event:a.event || 'viewed', Page_Type:scan.pageType || '', Source_URL:scan.url || '', Details:scannerJson_(a)});
}
function scannerStoreEnemyEnrichment_(member, e, scan) {
  var id = scannerCleanId_(e.id || e.tornId || e.Enemy_ID || e.playerId || ''); if (!id) return;
  var row = {Enrichment_ID:'EE-'+scannerUuid_(), Timestamp:scannerNowIso_(), Enemy_ID:id, Enemy_Name:e.name || e.Player_Name || '', Faction_ID:e.factionId || (scan.subject && scan.subject.factionId) || '', Faction_Name:e.factionName || (scan.subject && scan.subject.factionName) || '', Level:e.level || '', Status:e.status || '', Last_Action:e.lastAction || '', Tags:(e.tags||[]).join ? e.tags.join(',') : String(e.tags||''), Submitted_By_ID:member.tornId, Submitted_By_Name:member.name, Source_URL:scan.url || '', Payload_JSON:scannerJson_(scannerTrimAutoPayload_(e))};
  scannerAppend_(SCANNER.ENEMY_ENRICHMENT_SHEET, row);
  try { scannerUpsert_(sheetNameFromApp_('ENEMY_PLAYERS','Enemy_Players'), 'Enemy_ID', id, {Enemy_ID:id, Name:row.Enemy_Name, Faction_ID:row.Faction_ID, Faction_Name:row.Faction_Name, Level:row.Level, Status:row.Status, Priority:e.priority || '', Notes:'Auto-enriched by scanner v1.7', Last_Seen:scannerNowIso_(), Source_URL:scan.url || ''}); } catch (err) {}
}
function scannerStoreFactionRoster_(member, ro, scan) {
  var players = ro.players || scan.players || [];
  scannerAppend_(SCANNER.FACTION_ROSTER_SHEET, {Roster_ID:'FR-'+scannerUuid_(), Timestamp:scannerNowIso_(), Faction_ID:ro.factionId || (scan.subject && scan.subject.id) || '', Faction_Name:ro.factionName || (scan.subject && scan.subject.name) || '', Member_Count:players.length || ro.memberCount || 0, Submitted_By_ID:member.tornId, Submitted_By_Name:member.name, Source_URL:scan.url || '', Payload_JSON:scannerJson_({players:players.slice(0,SCANNER.MAX_PLAYERS_PER_SCAN), subject:scan.subject || {}})});
}
function scannerStoreAutoRecruit_(member, r, scan) {
  var id = scannerCleanId_(r.id || r.tornId || r.Torn_ID || ''); if (!id) return;
  scannerAppend_(SCANNER.AUTO_RECRUITS_SHEET, {Lead_ID:'AR-'+scannerUuid_(), Timestamp:scannerNowIso_(), Torn_ID:id, Name:r.name || '', Level:r.level || '', Faction_ID:r.factionId || '', Faction_Name:r.factionName || '', Source:r.source || scan.pageType || 'scanner', Submitted_By_ID:member.tornId, Submitted_By_Name:member.name, Auto_Score:scannerCleanNumber_(r.score), Reason:r.reason || '', Source_URL:scan.url || '', Payload_JSON:scannerJson_(r)});
  try { scannerSubmitRecruitLead_({member:member, lead:r, sourceUrl:scan.url}); } catch (err) {}
}
function scannerStoreHospitalContext_(member, h, scan) {
  scannerAppend_(SCANNER.HOSPITAL_SCANS_SHEET, {Scan_ID:'HS-'+scannerUuid_(), Timestamp:scannerNowIso_(), Torn_ID:scannerCleanId_(h.id || h.tornId || ''), Name:h.name || '', Status:h.status || 'Hospital', Hospital_Until:h.hospitalUntil || '', Time_Left_Text:h.timeLeft || '', Reason:h.reason || '', Priority:h.priority || '', Submitted_By_ID:member.tornId, Submitted_By_Name:member.name, Source_URL:scan.url || '', Notes:h.notes || 'Auto hospital support scan'});
}
function scannerStoreSupportContext_(member, c, scan) {
  scannerAppend_(SCANNER.SUPPORT_CONTEXT_SHEET, {Context_ID:'SC-'+scannerUuid_(), Timestamp:scannerNowIso_(), Torn_ID:member.tornId, Name:member.name, Context_Type:c.type || 'status', Priority:c.priority || '', War_ID:c.warId || scannerActiveWarId_(), Status:c.status || '', Energy:c.energy || '', Life:c.life || '', Assignment_ID:c.assignmentId || '', Source_URL:scan.url || '', Details_JSON:scannerJson_(c)});
}
function scannerStoreMarketTravel_(member, mt, scan) {
  var items = mt.items || scan.marketItems || [];
  if (scan.pageType === 'travel' || mt.travel) scannerSubmitTravelLog_({member:member, travel:{location:mt.location || (scan.subject && scan.subject.name) || '', item:items[0] && items[0].item || '', profitEstimate:mt.profitEstimate || '', notes:'Auto travel/market note'}, sourceUrl:scan.url});
  items.slice(0,20).forEach(function(it){ scannerSubmitMarketNote_({member:member, market:it, sourceUrl:scan.url}); });
}
function scannerStoreTradeLoan_(member, tl, scan) {
  scannerAppend_(SCANNER.TRADE_LOGS_SHEET, {Trade_ID:'TL-'+scannerUuid_(), Timestamp:scannerNowIso_(), Partner_ID:scannerCleanId_(tl.partnerId || ''), Partner_Name:tl.partnerName || '', Direction:tl.direction || '', Amount:tl.amount || '', Item:tl.item || '', Quantity:tl.quantity || '', Category:tl.category || 'Auto', Related_Loan_ID:tl.relatedLoanId || '', Submitted_By_ID:member.tornId, Submitted_By_Name:member.name, Source_URL:scan.url || '', Notes:tl.notes || 'Auto trade/loan context'});
}
function scannerStoreTrainingGrowth_(member, tg, scan) {
  scannerAppend_(SCANNER.TRAINING_GROWTH_SHEET, {Growth_ID:'TG-'+scannerUuid_(), Timestamp:scannerNowIso_(), Torn_ID:member.tornId, Name:member.name, Energy:tg.energy || '', Happy:tg.happy || '', Cooldowns:scannerJson_(tg.cooldowns || {}), Training_State:tg.trainingState || '', Mentor_Flag:tg.mentorFlag || '', Source:tg.source || 'scanner/api', Payload_JSON:scannerJson_(tg)});
}
function scannerStoreOnboarding_(member, ob, scan) {
  var steps = ob.steps || [{step:ob.step || 'scanner_activity', status:ob.status || 'complete', evidence:ob.evidence || scan.pageType || ''}];
  steps.forEach(function(st){ scannerAppend_(SCANNER.ONBOARDING_PROGRESS_SHEET, {Progress_ID:'OP-'+scannerUuid_(), Timestamp:scannerNowIso_(), Torn_ID:member.tornId, Name:member.name, Step:st.step || '', Status:st.status || 'complete', Evidence:st.evidence || '', Source_URL:scan.url || '', Details:scannerJson_(st)}); });
}
function scannerStoreApiHealth_(member, ah, scan) {
  scannerAppend_(SCANNER.API_HEALTH_SHEET, {Health_ID:'AH-'+scannerUuid_(), Timestamp:scannerNowIso_(), Torn_ID:member.tornId, Name:member.name, API_Enabled:String(!!ah.apiEnabled), Last_OK:ah.lastOk || '', Last_Error:ah.lastError || '', Rate_Per_Second:ah.ratePerSecond || '', Selections:ah.selections || '', Snapshot_Type:ah.snapshotType || '', Permission_Warnings:(ah.permissionWarnings||[]).join ? ah.permissionWarnings.join(', ') : String(ah.permissionWarnings||''), Source:ah.source || 'scanner'});
}
function scannerStoreScannerHealth_(member, sh, scan) {
  scannerAppend_(SCANNER.SCANNER_HEALTH_SHEET, {Health_ID:'SH-'+scannerUuid_(), Timestamp:scannerNowIso_(), Torn_ID:member.tornId, Name:member.name, Scanner_Version:sh.version || SCANNER.VERSION, Install_ID:sh.installId || '', Last_Page_Type:scan.pageType || sh.lastPageType || '', Last_URL:scan.url || sh.lastUrl || '', HQ_Connected:String(!!sh.hqConnected), Auto_Enrichment:String(!!sh.autoEnrichment), API_Calls_Session:sh.apiCallsSession || 0, Error_Count:sh.errorCount || 0, Settings_JSON:scannerJson_(scannerTrimAutoPayload_(sh.settings || {}))});
}
function scannerStoreDiscordTrigger_(member, d, scan) {
  if (String(scannerSetting_('Scanner_Auto_Discord_Triggers','TRUE')).toUpperCase() !== 'TRUE') return;
  scannerAppend_(SCANNER.DISCORD_TRIGGER_SHEET, {Trigger_ID:'DT-'+scannerUuid_(), Timestamp:scannerNowIso_(), Trigger_Type:d.type || 'scanner', Priority:d.priority || 'normal', Title:d.title || 'ShadowCore Scanner Trigger', Message:d.message || '', Torn_ID:d.tornId || member.tornId, Name:d.name || member.name, War_ID:d.warId || scannerActiveWarId_(), Source_URL:scan.url || '', Status:'Queued', Payload_JSON:scannerJson_(d)});
}

function scannerTrimAutoPayload_(payload) {
  var copy = JSON.parse(scannerJson_(payload || {}));
  function scrub(o) { if (!o || typeof o !== 'object') return; Object.keys(o).forEach(function(k){ if (/key|token|secret|password/i.test(k)) o[k] = '[redacted]'; else scrub(o[k]); }); }
  scrub(copy);
  if (copy.scan && copy.scan.textSample && String(copy.scan.textSample).length > 1500) copy.scan.textSample = String(copy.scan.textSample).slice(0,1500);
  if (copy.players && copy.players.length > SCANNER.MAX_PLAYERS_PER_SCAN) copy.players = copy.players.slice(0, SCANNER.MAX_PLAYERS_PER_SCAN);
  return copy;
}

function setupShadowCoreScannerBridgeIfMissing_() {
  var ss = scannerSs_();
  if (!ss.getSheetByName(SCANNER.SETTINGS_SHEET)) setupShadowCoreScannerBridgeMiniNext();
}

function scannerSeedSettings_() {
  var token = scannerSetting_('Scanner_Shared_Token', '');
  if (!token) token = Utilities.getUuid().replace(/-/g, '').slice(0, 24);
  var rows = [
    {Key: 'Scanner_Shared_Token', Value: token, Description: 'Shared token used by the Tampermonkey scanner. Keep private. Rotate if leaked.'},
    {Key: 'HQ_Web_App_URL', Value: (typeof appUrl_ === 'function' ? appUrl_() : ''), Description: 'Optional: paste your deployed /exec URL here for display in the scanner.'},
    {Key: 'Scanner_Allow_Auto_Submit', Value: 'FALSE', Description: 'TRUE allows members to enable auto-submit. Manual submit is always safer.'},
    {Key: 'Scanner_Auto_Submit_Default', Value: 'FALSE', Description: 'Default auto-submit value shown to members.'},
    {Key: 'Scanner_Allow_Market_Scan', Value: 'TRUE', Description: 'Enable market/travel note submissions.'},
    {Key: 'Scanner_Allow_Forum_Scan', Value: 'TRUE', Description: 'Enable forum/recruit lead submissions.'},
    {Key: 'Scanner_Allow_Hospital_Scan', Value: 'TRUE', Description: 'Enable hospital scan/revive support submissions.'},
    {Key: 'Scanner_Allow_API_Snapshots', Value: 'TRUE', Description: 'TRUE allows users to submit their local Torn API snapshot data into API_Snapshots.'},
    {Key: 'Scanner_Allow_Auto_Enrichment', Value: 'TRUE', Description: 'TRUE allows v1.7 scanner auto-enrichment submissions when a member opts in locally.'},
    {Key: 'Scanner_Auto_Enrichment_Default', Value: 'FALSE', Description: 'Default local auto-enrichment state shown to members. FALSE is safer.'},
    {Key: 'Scanner_Auto_Discord_Triggers', Value: 'TRUE', Description: 'TRUE lets auto-enrichment queue Discord-style trigger rows for leaders to post or webhook later.'},
    {Key: 'Scanner_Allow_V18_Deep_Data', Value: 'TRUE', Description: 'TRUE allows v1.8 deep scanner categories when a member opts in locally.'},
    {Key: 'Scanner_V18_Deep_Data_Default', Value: 'FALSE', Description: 'Default for v1.8 deep scanner categories. Keep FALSE for opt-in.'},
    {Key: 'Scanner_V18_Visuals_Enabled', Value: 'TRUE', Description: 'TRUE enables visual snapshot/analytics pages.'},
    {Key: 'Scanner_API_Disclosure', Value: 'Torn API keys stay in the user browser. ShadowCore HQ only receives API snapshot JSON if the user chooses to submit it.', Description: 'Displayed/used by API-enabled scanner versions.'},
    {Key: 'Scanner_Disclosure', Value: 'This scanner only submits visible page observations or requests you choose to send. Do not submit private data without consent.', Description: 'Displayed in scanner settings.'}
  ];
  rows.forEach(function(r) { scannerUpsert_(SCANNER.SETTINGS_SHEET, 'Key', r.Key, r); });
}

function scannerRequireToken_(token) {
  var expected = scannerSetting_('Scanner_Shared_Token', '');
  if (!expected) throw new Error('Scanner token is not configured. Run setupShadowCoreScannerBridge().');
  if (String(token || '') !== String(expected)) throw new Error('Invalid scanner token.');
}

function scannerMember_(body) {
  var m = body.member || {};
  return {
    tornId: scannerCleanId_(body.memberTornId || body.tornId || m.tornId || m.id || ''),
    name: scannerCleanText_(body.memberName || body.name || m.name || 'Unknown', 120)
  };
}


function scannerEnsureSheetLite_(name, headers) {
  var ss = scannerSs_();
  var sh = ss.getSheetByName(name);
  var created = false;
  if (!sh) {
    sh = ss.insertSheet(name);
    created = true;
  }
  // Keep setup light. Only write headers when the first row is empty or too short.
  var lastCol = 0;
  try { lastCol = sh.getLastColumn(); } catch (err) { lastCol = 0; }
  if (lastCol < 1) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var first = [];
    try { first = sh.getRange(1, 1, 1, Math.min(lastCol, headers.length)).getValues()[0].map(String); } catch (err2) { first = []; }
    if (!first.length || first[0] === '') {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else if (created && lastCol < headers.length) {
      sh.getRange(1, lastCol + 1, 1, headers.length - lastCol).setValues([headers.slice(lastCol)]);
    }
  }
  // No formatting here; formatting many tabs is a major timeout source.
  return sh;
}

function scannerSettingLite_(key, fallback) {
  try {
    var ss = scannerSs_();
    var sh = ss.getSheetByName(SCANNER.SETTINGS_SHEET);
    if (!sh || sh.getLastRow() < 2) return fallback;
    var values = sh.getRange(1, 1, sh.getLastRow(), Math.min(2, sh.getLastColumn())).getValues();
    for (var i = 1; i < values.length; i++) if (String(values[i][0]) === String(key)) return values[i][1];
  } catch (err) {}
  return fallback;
}

function scannerSeedSettingsLite_() {
  scannerEnsureSheetLite_(SCANNER.SETTINGS_SHEET, SCANNER_HEADERS[SCANNER.SETTINGS_SHEET]);
  var token = scannerSettingLite_('Scanner_Shared_Token', '');
  if (!token) token = Utilities.getUuid().replace(/-/g, '').slice(0, 24);
  var rows = [
    ['Scanner_Shared_Token', token, 'Shared token used by the Tampermonkey scanner. Keep private. Rotate if leaked.'],
    ['Scanner_Allow_Auto_Submit', 'FALSE', 'TRUE allows members to enable auto-submit. Manual submit is safer.'],
    ['Scanner_Auto_Submit_Default', 'FALSE', 'Default auto-submit value shown to members.'],
    ['Scanner_Allow_API_Snapshots', 'TRUE', 'TRUE allows users to submit local Torn API snapshot data into API_Snapshots.'],
    ['Scanner_Allow_Auto_Enrichment', 'TRUE', 'TRUE allows v1.7 scanner auto-enrichment submissions when a member opts in locally.'],
    ['Scanner_Auto_Enrichment_Default', 'FALSE', 'Default local auto-enrichment state shown to members. FALSE is safer.'],
    ['Scanner_Allow_V18_Deep_Data', 'TRUE', 'TRUE allows v1.8 deep scanner categories when a member opts in locally.'],
    ['Scanner_V18_Deep_Data_Default', 'FALSE', 'Default for v1.8 deep scanner categories. Keep FALSE for opt-in.'],
    ['Scanner_API_Disclosure', 'Torn API keys stay in the user browser. ShadowCore HQ only receives API snapshot JSON if the user chooses to submit it.', 'Displayed/used by API-enabled scanner versions.'],
    ['Scanner_Disclosure', 'This scanner only submits visible page observations or requests you choose to send. Do not submit private data without consent.', 'Displayed in scanner settings.']
  ];
  var sh = scannerSs_().getSheetByName(SCANNER.SETTINGS_SHEET);
  var existing = {};
  if (sh.getLastRow() >= 2) {
    var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    vals.forEach(function(r) { if (r[0]) existing[String(r[0])] = true; });
  }
  var append = [];
  rows.forEach(function(r) { if (!existing[String(r[0])]) append.push(r); });
  if (append.length) sh.getRange(sh.getLastRow() + 1, 1, append.length, 3).setValues(append);
  return {ok: true, token: token, added: append.length};
}

function scannerEnsureSheet_(name, headers) {
  var ss = scannerSs_();
  var sh = ss.getSheetByName(name);
  var isNew = false;
  if (!sh) {
    sh = ss.insertSheet(name);
    isNew = true;
  }

  var lastColumn = sh.getLastColumn();
  var current = lastColumn ? sh.getRange(1, 1, 1, lastColumn).getValues()[0].map(String) : [];
  if (current.length === 0 || current[0] === '') {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    current = headers.slice();
  } else {
    var missing = headers.filter(function(h) { return current.indexOf(h) === -1; });
    if (missing.length) {
      sh.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
      current = current.concat(missing);
    }
  }

  // Formatting every header on every setup run is a common timeout source.
  // Only do lightweight formatting for new sheets; skip it for existing sheets.
  if (isNew) {
    try {
      sh.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setFontColor('#ffffff')
        .setBackground('#111827');
      sh.setFrozenRows(1);
    } catch (err) {}
  }
  return sh;
}

function scannerHeaders_(sheetName) {
  var sh = scannerGetSheet_(sheetName);
  if (sh.getLastColumn() < 1) return [];
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function scannerGetSheet_(sheetName) {
  if (SCANNER_HEADERS[sheetName]) return scannerEnsureSheet_(sheetName, SCANNER_HEADERS[sheetName]);
  if (typeof getSheet_ === 'function') {
    try { return getSheet_(sheetName); } catch (err) {}
  }
  var ss = scannerSs_();
  var sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);
  return sh;
}

function scannerAppend_(sheetName, obj) {
  if (typeof appendRowObject_ === 'function' && !SCANNER_HEADERS[sheetName]) {
    try { return appendRowObject_(sheetName, obj); } catch (err) {}
  }
  var sh = scannerGetSheet_(sheetName);
  var headers = scannerHeaders_(sheetName);
  if (!headers.length) throw new Error('No headers for sheet ' + sheetName);
  var row = headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
  sh.appendRow(row);
  return obj;
}

function scannerUpsert_(sheetName, keyHeader, keyValue, obj) {
  if (typeof upsertRowByKey_ === 'function' && !SCANNER_HEADERS[sheetName]) {
    try { return upsertRowByKey_(sheetName, keyHeader, keyValue, obj); } catch (err) {}
  }
  var sh = scannerGetSheet_(sheetName);
  var headers = scannerHeaders_(sheetName);
  var keyCol = headers.indexOf(keyHeader);
  if (keyCol === -1) return scannerAppend_(sheetName, obj);
  var values = sh.getDataRange().getValues();
  var targetRow = -1;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][keyCol]) === String(keyValue)) { targetRow = i + 1; break; }
  }
  var row = headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
  if (targetRow > 0) sh.getRange(targetRow, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);
  return obj;
}

function scannerReadIfExists_(sheetName) {
  try {
    if (!scannerSs_().getSheetByName(sheetName)) return [];
    if (typeof readTable_ === 'function') {
      try { return readTable_(sheetName); } catch (err) {}
    }
    var sh = scannerGetSheet_(sheetName);
    var values = sh.getDataRange().getValues();
    if (values.length < 2) return [];
    var headers = values[0].map(String);
    var out = [];
    for (var r = 1; r < values.length; r++) {
      var row = {}, empty = true;
      for (var c = 0; c < headers.length; c++) {
        row[headers[c]] = values[r][c];
        if (values[r][c] !== '' && values[r][c] !== null) empty = false;
      }
      if (!empty) out.push(row);
    }
    return out;
  } catch (err2) {
    return [];
  }
}

function scannerSetting_(key, fallback) {
  var rows = scannerReadIfExists_(SCANNER.SETTINGS_SHEET);
  for (var i = 0; i < rows.length; i++) if (String(rows[i].Key) === String(key)) return rows[i].Value;
  if (typeof setting_ === 'function') {
    try { return setting_(key, fallback); } catch (err) {}
  }
  return fallback;
}

function scannerAudit_(memberId, memberName, action, pageType, url, count, status, details) {
  try {
    scannerAppend_(SCANNER.AUDIT_SHEET, {
      Timestamp: scannerNowIso_(),
      Scanner_ID: SCANNER.VERSION,
      Submitted_By_ID: memberId || '',
      Submitted_By_Name: memberName || '',
      Action: action || '',
      Page_Type: pageType || '',
      Source_URL: scannerCleanText_(url || '', 800),
      Count: count || 0,
      Status: status || '',
      Details: typeof details === 'string' ? details : scannerJson_(details)
    });
  } catch (err) {}
}

function sheetNameFromApp_(key, fallback) {
  try {
    if (typeof APP !== 'undefined' && APP.SHEETS && APP.SHEETS[key]) return APP.SHEETS[key];
  } catch (err) {}
  return fallback;
}

function scannerTextLooksHospital_(text) {
  text = String(text || '').toLowerCase();
  return text.indexOf('hospital') !== -1 || text.indexOf('hosp') !== -1 || text.indexOf('revive') !== -1;
}

function scannerTrimLargeScan_(scan) {
  scan = scan || {};
  var copy = {};
  Object.keys(scan).forEach(function(k) {
    if (k === 'bodyText') return;
    copy[k] = scan[k];
  });
  if (copy.players && copy.players.length > SCANNER.MAX_PLAYERS_PER_SCAN) copy.players = copy.players.slice(0, SCANNER.MAX_PLAYERS_PER_SCAN);
  if (copy.marketItems && copy.marketItems.length > 80) copy.marketItems = copy.marketItems.slice(0, 80);
  if (copy.textSample && String(copy.textSample).length > 4000) copy.textSample = String(copy.textSample).slice(0, 4000);
  return copy;
}

function scannerCleanId_(val) {
  var s = String(val || '').match(/\d+/);
  return s ? s[0] : '';
}

function scannerCleanNumber_(val) {
  if (val === '' || val === null || val === undefined) return '';
  var n = Number(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? '' : n;
}

function scannerCleanText_(val, max) {
  var s = String(val === undefined || val === null ? '' : val);
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').replace(/\s+/g, ' ').trim();
  max = max || 500;
  return s.length > max ? s.slice(0, max) : s;
}

function scannerJson_(obj) {
  if (typeof safeJson_ === 'function') return safeJson_(obj);
  return JSON.stringify(obj, function(key, value) { if (value instanceof Date) return value.toISOString(); return value; });
}

function scannerUuid_() {
  return Utilities.getUuid().slice(0, 8).toUpperCase();
}

function scannerNowIso_() {
  if (typeof nowIso_ === 'function') return nowIso_();
  return new Date().toISOString();
}

function scannerSs_() {
  if (typeof ss_ === 'function') return ss_();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open this script from a Google Sheet or bind it to a spreadsheet first.');
  return spreadsheet;
}

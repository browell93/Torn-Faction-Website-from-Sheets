/**
 * ShadowCore HQ - Sheet schema and data helpers.
 */

var HEADERS = {};
HEADERS[APP.SHEETS.SETTINGS] = ['Key', 'Value', 'Description'];
HEADERS[APP.SHEETS.API_KEYS] = ['Torn_ID', 'Name', 'Role', 'Key_Type', 'Stored', 'Access_Level', 'Selections', 'Status', 'Last_Checked', 'Key_Fingerprint', 'Owner_Email', 'Consent', 'Notes'];
HEADERS[APP.SHEETS.MEMBERS] = ['Torn_ID', 'Name', 'Role', 'Rank', 'Joined', 'Discord', 'Active', 'Last_Seen', 'Faction_ID', 'Profile_URL', 'Notes'];
HEADERS[APP.SHEETS.MEMBER_STATUS] = ['Torn_ID', 'Name', 'Status', 'Last_Action', 'Life', 'Energy', 'Nerve', 'Happy', 'Hospital_Until', 'Jail', 'Travel', 'Drug_Cooldown', 'Medical_Cooldown', 'Booster_Cooldown', 'Updated'];
HEADERS[APP.SHEETS.MEMBER_SCORECARDS] = ['Torn_ID', 'Name', 'Activity_Score', 'War_Score', 'Reliability_Score', 'Growth_Score', 'Faction_Value', 'Grade', 'Recommended_Role', 'Warnings', 'Updated'];
HEADERS[APP.SHEETS.FACTION_STATUS] = ['Timestamp', 'Faction_ID', 'Name', 'Members', 'Respect', 'Chain', 'Rank', 'War_Status', 'Notes'];
HEADERS[APP.SHEETS.WARS] = ['War_ID', 'Enemy_Faction_ID', 'Enemy_Name', 'Status', 'Start_Time', 'End_Time', 'Our_Score', 'Enemy_Score', 'Chain_Start', 'Chain_End', 'Payout_Locked', 'Notes'];
HEADERS[APP.SHEETS.WAR_ATTACKS] = ['Attack_ID', 'War_ID', 'Timestamp', 'Attacker_ID', 'Attacker_Name', 'Defender_ID', 'Defender_Name', 'Result', 'Respect', 'Chain', 'Is_KO', 'Is_Assist', 'Source'];
HEADERS[APP.SHEETS.WAR_TARGETS] = ['Target_ID', 'War_ID', 'Enemy_ID', 'Enemy_Name', 'Status', 'Priority', 'Assigned_To_ID', 'Assigned_To_Name', 'Score', 'Notes', 'Updated'];
HEADERS[APP.SHEETS.CHAIN_LOG] = ['Timestamp', 'Chain', 'Timeout_Sec', 'Next_Bonus', 'Hits_Needed', 'Available_Members', 'Danger_Level', 'Notes'];
HEADERS[APP.SHEETS.PAYOUT_RULES] = ['Rule', 'Value', 'Enabled', 'Description'];
HEADERS[APP.SHEETS.PAYOUTS] = ['War_ID', 'Torn_ID', 'Name', 'Hits', 'Respect', 'KOs', 'Assists', 'Bonuses', 'Penalties', 'Total', 'Paid', 'Paid_Date', 'Notes'];
HEADERS[APP.SHEETS.PAYOUT_HISTORY] = ['Timestamp', 'War_ID', 'Torn_ID', 'Name', 'Amount', 'Action', 'By', 'Notes'];
HEADERS[APP.SHEETS.APPLICATIONS] = ['Application_ID', 'Timestamp', 'Torn_ID', 'Name', 'Level', 'Age_Days', 'Battle_Stats_Estimate', 'Activity', 'War_Availability', 'Discord', 'Previous_Faction', 'API_Verified', 'Score', 'Status', 'Reviewed_By', 'Notes'];
HEADERS[APP.SHEETS.APPLICATION_NOTES] = ['Timestamp', 'Application_ID', 'By', 'Note'];
HEADERS[APP.SHEETS.ARMORY_REQUESTS] = ['Request_ID', 'Timestamp', 'Torn_ID', 'Name', 'Request_Type', 'Item', 'Quantity', 'Reason', 'Urgency', 'Status', 'Reviewed_By', 'Fulfilled_Date', 'Notes'];
HEADERS[APP.SHEETS.ARMORY_LOANS] = ['Loan_ID', 'Timestamp', 'Torn_ID', 'Name', 'Item', 'Quantity', 'Due_Date', 'Status', 'Returned_Date', 'Notes'];
HEADERS[APP.SHEETS.OC_PLANNER] = ['OC_ID', 'Crime', 'Planned_Time', 'Slot', 'Torn_ID', 'Name', 'Role', 'Status', 'Reliability', 'Expected_Payout', 'Actual_Payout', 'Result', 'Notes'];
HEADERS[APP.SHEETS.ENEMY_FACTIONS] = ['Faction_ID', 'Name', 'Last_War_ID', 'War_Record', 'Timezone_Pattern', 'Strength_Notes', 'Weakness_Notes', 'Updated'];
HEADERS[APP.SHEETS.ENEMY_PLAYERS] = ['Enemy_ID', 'Name', 'Faction_ID', 'Level', 'Status', 'Last_Seen', 'Known_Strength', 'Good_Target', 'Avoid', 'Best_Attackers', 'Notes', 'Updated'];
HEADERS[APP.SHEETS.EVENTS] = ['Event_ID', 'Title', 'Type', 'Start_Time', 'End_Time', 'Owner', 'Status', 'Description'];
HEADERS[APP.SHEETS.RULES] = ['Rule_ID', 'Category', 'Rule', 'Active', 'Updated'];
HEADERS[APP.SHEETS.ANNOUNCEMENTS] = ['Announcement_ID', 'Timestamp', 'Title', 'Message', 'Audience', 'Active'];
HEADERS[APP.SHEETS.DISCORD_ALERTS] = ['Timestamp', 'Channel_Key', 'Message', 'Status', 'Response', 'By'];
HEADERS[APP.SHEETS.REPORTS] = ['Timestamp', 'Report_Type', 'War_ID', 'Title', 'Body', 'BBCode'];
HEADERS[APP.SHEETS.AUDIT_LOG] = ['Timestamp', 'User', 'Action', 'Details'];
HEADERS[APP.SHEETS.ERRORS] = ['Timestamp', 'Source', 'Message', 'Stack', 'Payload'];
HEADERS[APP.SHEETS.CACHE] = ['Key', 'Timestamp', 'TTL_Seconds', 'Value'];
HEADERS[APP.SHEETS.BATTLE_PLANS] = ['Plan_ID', 'Timestamp', 'War_ID', 'Phase', 'Summary', 'Assignments_JSON', 'Risk_Notes', 'Chain_Advice', 'Status'];
HEADERS[APP.SHEETS.WAR_COMMITMENTS] = ['Commitment_ID', 'War_ID', 'Torn_ID', 'Name', 'Available', 'Time_Windows', 'Can_Hit', 'Can_Chain', 'Notes', 'Timestamp'];
HEADERS[APP.SHEETS.STRIKE_TEAMS] = ['Team_ID', 'War_ID', 'Team_Name', 'Captain_ID', 'Captain_Name', 'Torn_ID', 'Name', 'Role', 'Status', 'Notes', 'Updated'];
HEADERS[APP.SHEETS.DISCIPLINE] = ['Case_ID', 'Timestamp', 'Torn_ID', 'Name', 'Issue_Type', 'Severity', 'Status', 'Action_Recommended', 'Logged_By', 'Notes'];
HEADERS[APP.SHEETS.ECONOMY_LEDGER] = ['Entry_ID', 'Timestamp', 'Torn_ID', 'Name', 'Category', 'Direction', 'Amount', 'Item', 'Quantity', 'Related_War_ID', 'Status', 'Logged_By', 'Notes'];
HEADERS[APP.SHEETS.TRAINING_TRACKER] = ['Training_ID', 'Torn_ID', 'Name', 'Goal', 'Current_Estimate', 'Target_Estimate', 'Focus', 'Plan', 'Updated', 'Notes'];
HEADERS[APP.SHEETS.APPLICANT_VETTING] = ['Vetting_ID', 'Application_ID', 'Torn_ID', 'Name', 'Score', 'Red_Flags', 'Strengths', 'Recommendation', 'Reviewed_By', 'Updated'];
HEADERS[APP.SHEETS.CHAIN_PLANS] = ['Plan_ID', 'Timestamp', 'War_ID', 'Current_Chain', 'Next_Bonus', 'Hits_Needed', 'Pacing_Plan', 'Reserved_Bonus_Hitter', 'Danger_Level', 'Notes'];
HEADERS[APP.SHEETS.BBCODE_SNIPPETS] = ['Snippet_ID', 'Timestamp', 'Type', 'Title', 'BBCode', 'Plain_Text', 'Created_By'];
HEADERS[APP.SHEETS.HTML_SNIPPETS] = ['Snippet_ID', 'Timestamp', 'Type', 'Title', 'HTML', 'Plain_Text', 'Source_ID', 'Template', 'Sanitized', 'Created_By', 'Updated'];
HEADERS[APP.SHEETS.OFFICER_TASKS] = ['Task_ID', 'Created', 'Title', 'Assigned_To', 'Due_Date', 'Priority', 'Status', 'Related_ID', 'Completed', 'Notes'];
HEADERS[APP.SHEETS.RULE_CHECKS] = ['Check_ID', 'Timestamp', 'Torn_ID', 'Name', 'Rule', 'Status', 'Evidence', 'Recommended_Action'];
HEADERS[APP.SHEETS.MEMBER_AVAILABILITY] = ['Availability_ID', 'War_ID', 'Torn_ID', 'Name', 'Time_Windows', 'Timezone', 'Discord', 'Notes', 'Updated'];
HEADERS[APP.SHEETS.BANK_LEDGER] = ['Entry_ID', 'Timestamp', 'Torn_ID', 'Name', 'Type', 'Direction', 'Amount', 'Item', 'Quantity', 'Related_ID', 'Status', 'Logged_By', 'Notes'];
HEADERS[APP.SHEETS.TREASURY_REPORTS] = ['Report_ID', 'Timestamp', 'Period', 'Inflow', 'Outflow', 'Net', 'Open_Loans', 'Collateral_Value', 'Unpaid_Payouts', 'Body', 'BBCode', 'Created_By'];
HEADERS[APP.SHEETS.LOAN_COLLATERAL] = ['Loan_ID', 'Timestamp', 'Torn_ID', 'Name', 'Principal', 'Item', 'Quantity', 'Collateral', 'Collateral_Value', 'Due_Date', 'Status', 'Approved_By', 'Repaid_Date', 'Notes'];
HEADERS[APP.SHEETS.REVIVE_BOARD] = ['Request_ID', 'Timestamp', 'Torn_ID', 'Name', 'Hospital_Until', 'Priority', 'Status', 'Assigned_To', 'Completed', 'Cost', 'Notes'];
HEADERS[APP.SHEETS.AVAILABILITY_CALENDAR] = ['Availability_ID', 'Torn_ID', 'Name', 'Day_Of_Week', 'Time_Window', 'Timezone', 'Timezone_Offset', 'Viewer_Offset', 'Start_Hour_Local', 'End_Hour_Local', 'Start_Hour_TCT', 'End_Hour_TCT', 'Role', 'War_ID', 'Active', 'Updated', 'Notes'];
HEADERS[APP.SHEETS.PROMOTIONS] = ['Promotion_ID', 'Timestamp', 'Torn_ID', 'Name', 'Current_Rank', 'Proposed_Rank', 'Score', 'Criteria_Met', 'Status', 'Proposed_By', 'Decision_Date', 'Notes'];
HEADERS[APP.SHEETS.AWARDS] = ['Award_ID', 'Timestamp', 'Torn_ID', 'Name', 'Award', 'Category', 'Related_ID', 'Awarded_By', 'Public', 'Notes'];
HEADERS[APP.SHEETS.ONBOARDING] = ['Onboarding_ID', 'Torn_ID', 'Name', 'Step', 'Status', 'Assigned_To', 'Due_Date', 'Completed', 'Updated', 'Notes'];
HEADERS[APP.SHEETS.MENTORSHIPS] = ['Mentorship_ID', 'Mentee_ID', 'Mentee_Name', 'Mentor_ID', 'Mentor_Name', 'Status', 'Start_Date', 'Checkin_Frequency', 'Last_Checkin', 'Next_Checkin', 'Goals', 'Notes'];
HEADERS[APP.SHEETS.KNOWLEDGE_BASE] = ['Article_ID', 'Category', 'Title', 'Audience', 'Content', 'Tags', 'Active', 'Updated', 'Updated_By'];
HEADERS[APP.SHEETS.API_KEY_HEALTH] = ['Check_ID', 'Timestamp', 'Torn_ID', 'Name', 'Stored', 'Status', 'Last_Checked', 'Age_Days', 'Risk_Level', 'Missing_Selections', 'Recommended_Action'];
HEADERS[APP.SHEETS.POLLS] = ['Poll_ID', 'Title', 'Description', 'Options', 'Audience', 'Status', 'Created', 'Closes', 'Created_By', 'Results_JSON'];
HEADERS[APP.SHEETS.POLL_VOTES] = ['Vote_ID', 'Poll_ID', 'Torn_ID', 'Name', 'Choice', 'Timestamp'];
HEADERS[APP.SHEETS.RECRUIT_MICROSITE] = ['Section_ID', 'Sort', 'Title', 'Content', 'Button_Text', 'Button_URL', 'Active', 'Updated'];

HEADERS[APP.SHEETS.SETUP_WIZARD] = ['Step_ID', 'Sort', 'Title', 'Status', 'Required', 'Value_Key', 'Instructions', 'Last_Checked', 'Notes'];
HEADERS[APP.SHEETS.MEMBER_TOKENS] = ['Token_ID', 'Torn_ID', 'Name', 'Role', 'Token_Fingerprint', 'Status', 'Issued', 'Expires', 'Last_Used', 'Issued_By', 'Notes'];
HEADERS[APP.SHEETS.PRIVACY_CONSENTS] = ['Consent_ID', 'Timestamp', 'Torn_ID', 'Name', 'Consent_Type', 'Accepted', 'Version', 'IP_Note', 'Notes'];
HEADERS[APP.SHEETS.VERSION_LOG] = ['Version', 'Installed', 'Title', 'Changes', 'Migration_Status', 'Notes'];
HEADERS[APP.SHEETS.BACKUPS] = ['Backup_ID', 'Timestamp', 'Type', 'Spreadsheet_URL', 'Status', 'Created_By', 'Notes'];
HEADERS[APP.SHEETS.DIAGNOSTICS] = ['Check_ID', 'Timestamp', 'Category', 'Check_Name', 'Status', 'Details', 'Recommended_Action'];
HEADERS[APP.SHEETS.SCANNER_INSTALLS] = ['Install_ID', 'Timestamp', 'Torn_ID', 'Name', 'Scanner_Version', 'Backend_URL', 'Token_Fingerprint', 'API_Enabled', 'Last_Check', 'Status', 'Notes'];
HEADERS[APP.SHEETS.DISCORD_COMMANDS] = ['Command_ID', 'Command', 'Description', 'Template', 'Last_Run', 'Last_Output', 'Enabled', 'Role'];
HEADERS[APP.SHEETS.SHEET_PROTECTIONS] = ['Protection_ID', 'Timestamp', 'Sheet_Name', 'Protected', 'Editors', 'Status', 'Notes'];
HEADERS[APP.SHEETS.SAFE_MODE_LOG] = ['Timestamp', 'Safe_Mode', 'Changed_By', 'Reason', 'Disabled_Features'];
HEADERS[APP.SHEETS.ADMIN_MANUAL] = ['Article_ID', 'Sort', 'Title', 'Category', 'Content', 'Updated', 'Updated_By'];
HEADERS[APP.SHEETS.SETUP_CHECKLIST] = ['Check_ID', 'Sort', 'Title', 'Status', 'Details', 'Action_URL', 'Updated'];

HEADERS[APP.SHEETS.USER_PREFERENCES] = ['Torn_ID', 'Name', 'Hidden_Pages', 'Collapsed_Sections', 'Default_Page', 'Homepage_Cards', 'Theme', 'Updated', 'Notes'];
HEADERS[APP.SHEETS.ROLE_PERMISSIONS] = ['Page_Key', 'Label', 'Category', 'Min_Role', 'Enabled', 'Admin_Locked', 'Notes', 'Updated'];
HEADERS[APP.SHEETS.HIDDEN_PAGES] = ['Torn_ID', 'Name', 'Page_Key', 'Hidden', 'Updated', 'Notes'];
HEADERS[APP.SHEETS.DASHBOARD_LAYOUTS] = ['Layout_ID', 'Torn_ID', 'Name', 'Layout_Name', 'Cards', 'Default_Page', 'Active', 'Updated', 'Notes'];
HEADERS[APP.SHEETS.LAYOUT_PRESETS] = ['Preset_Name', 'Description', 'Visible_Pages', 'Homepage_Cards', 'Role_Target', 'Active', 'Updated'];


function setupShadowCoreHQ() {
  return setupShadowCoreHQ_CoreOnly();
}

/**
 * v1.8.1 timeout-safe setup.
 * This creates/repairs only the core ShadowCore HQ tabs and defaults.
 * Run the scanner/v1.8 installers separately to avoid Apps Script Spreadsheet timeouts.
 */
function setupShadowCoreHQ_CoreOnly() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var spreadsheet = ss_();
    var names = Object.keys(HEADERS);
    for (var i = 0; i < names.length; i++) {
      ensureSheet_(names[i], HEADERS[names[i]]);
      if (i % 15 === 14) SpreadsheetApp.flush();
    }
    seedDefaults_();
    installMenu_();
    logAudit_('system', 'setupShadowCoreHQ_CoreOnly', 'Created/updated core ShadowCore HQ schema. Scanner/v1.8 deep setup should be run separately.');
    return {ok: true, message: 'Core ShadowCore HQ setup complete. Next run setupShadowCoreScannerBridge(), then setupShadowCoreV18DeepScanner().', spreadsheetUrl: safeSpreadsheetUrl_(spreadsheet)};
  } finally {
    lock.releaseLock();
  }
}

function setupShadowCoreHQ_InstallScanner() {
  if (typeof setupShadowCoreScannerBridge !== 'function') return {ok:false, message:'ShadowCoreScannerBridge.gs is missing.'};
  return setupShadowCoreScannerBridge();
}

function setupShadowCoreHQ_InstallV18() {
  if (typeof setupShadowCoreV18DeepScanner !== 'function') return {ok:false, message:'V18Features.gs is missing.'};
  return setupShadowCoreV18DeepScanner();
}

function setupShadowCoreHQ_RunPostInstall() {
  var out = {ok:true, steps:[]};
  try { if (typeof generateV18VisualSnapshot === 'function') out.steps.push(generateV18VisualSnapshot()); } catch (err) { logError_('setupShadowCoreHQ_RunPostInstall.generateV18VisualSnapshot', err, {}); out.steps.push({ok:false, step:'visuals', error:String(err)}); }
  try { if (typeof generateV18SmartRecommendations === 'function') out.steps.push(generateV18SmartRecommendations()); } catch (err) { logError_('setupShadowCoreHQ_RunPostInstall.generateV18SmartRecommendations', err, {}); out.steps.push({ok:false, step:'recommendations', error:String(err)}); }
  return out;
}

function setupShadowCoreHQ_ReorganizeTabsOnly() {
  if (typeof reorganizeShadowCoreSheetsV18 !== 'function') return {ok:false, message:'V18 tab organizer is not installed.'};
  return reorganizeShadowCoreSheetsV18();
}

function safeSpreadsheetUrl_(spreadsheet) {
  try { return spreadsheet.getUrl(); } catch (err) { return ''; }
}

function onOpen() {
  installMenu_();
}

function installMenu_() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('ShadowCore HQ')
      .addItem('Setup core tabs (safe)', 'setupShadowCoreHQ')
      .addItem('Setup scanner bridge', 'setupShadowCoreHQ_InstallScanner')
      .addItem('Setup v1.8 deep scanner', 'setupShadowCoreHQ_InstallV18')
      .addItem('Run v1.8 visuals/recommendations', 'setupShadowCoreHQ_RunPostInstall')
      .addItem('Setup v2.5 layout + permissions', 'setupShadowCoreV25LayoutPermissions')
      .addItem('Reorganize tabs only', 'setupShadowCoreHQ_ReorganizeTabsOnly')
      .addItem('Install sync triggers', 'installShadowCoreTriggers')
      .addItem('Manual full sync', 'manualFullSync')
      .addItem('Calculate payouts', 'calculateWarPayouts')
      .addItem('Generate war report', 'generateLatestWarReport')
      .addItem('Generate battle plan', 'generateLatestWarBattlePlan')
      .addItem('Evaluate rule compliance', 'evaluateRuleCompliance')
      .addItem('Run API key health audit', 'runApiKeyHealthAudit')
      .addItem('Generate treasury report', 'generateTreasuryReport')
      .addSeparator()
      .addItem('Run v1.6 setup wizard check', 'runSetupWizardCheck')
      .addItem('Run diagnostics', 'runDiagnostics')
      .addItem('Create backup copy', 'createBackupCopy')
      .addItem('Protect important sheets', 'protectCriticalSheets')
      .addItem('Show deployment checklist', 'showDeploymentChecklist')
      .addItem('Setup v1.7 auto-enrichment', 'setupShadowCoreV17AutoEnrichment')
      .addItem('Setup v1.8 deep scanner / visuals', 'setupShadowCoreV18DeepScanner')
      .addItem('Reorganize tabs (v1.8)', 'reorganizeShadowCoreSheetsV18')
      .addItem('Generate v1.8 visual snapshot', 'generateV18VisualSnapshot')
      .addItem('Generate smart recommendations', 'generateV18SmartRecommendations')
      .addSeparator()
      .addItem('Setup v1.9 RW countdown monitor', 'setupShadowCoreV19WarCountdownMonitor')
      .addItem('Poll ranked-war countdown monitors', 'pollRankedWarCountdownMonitors')
      .addItem('Generate v1.9 readiness report', 'generateV19WarReadinessReport')
      .addItem('Install v1.9 monitor trigger', 'installV19RankedWarCountdownTrigger')
      .addItem('Setup v2.0 Gym Gains Lab', 'setupShadowCoreV20GymGainsLab')
      .addItem('Setup v2.2 Status/Availability Fixes', 'setupShadowCoreV22Fixes')
      .addToUi();
  } catch (err) {
    // Menu is not available during web executions.
  }
}

function ensureSheet_(name, headers) {
  var spreadsheet = ss_();
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  var current = sheet.getRange(1, 1, 1, Math.max(headers.length, 1)).getValues()[0];
  var needsHeaders = current.join('') === '' || current[0] !== headers[0];
  if (needsHeaders) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    // Append any newly added headers without overwriting existing data.
    var existing = current.map(String);
    var missing = headers.filter(function(h) { return existing.indexOf(h) === -1; });
    if (missing.length) {
      sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    }
  }
  return sheet;
}

function seedDefaults_() {
  seedSettings_();
  seedPayoutRules_();
  seedRules_();
  seedAnnouncements_();
  if (typeof seedV12Defaults_ === 'function') seedV12Defaults_();
  if (typeof seedV13Defaults_ === 'function') seedV13Defaults_();
  if (typeof seedV16Defaults_ === 'function') seedV16Defaults_();
  if (typeof seedV18Defaults_ === 'function') seedV18Defaults_();
  if (typeof seedV19Defaults_ === 'function') seedV19Defaults_();
}


function seedSettings_() {
  var rows = [
    ['Faction_Name', APP.FACTION_NAME_DEFAULT, 'Displayed name for the faction portal.'],
    ['Faction_ID', APP.FACTION_ID_DEFAULT, 'Your Torn faction ID. ShadowCore was previously discussed as 50538.'],
    ['Api_Cache_Seconds', APP.CACHE_SECONDS_DEFAULT, 'How long to cache Torn API responses inside Apps Script.'],
    ['Api_Bypass_Torn_Service_Cache', 'FALSE', 'Only turn on during urgent live checks; adds timestamp query.'],
    ['Admin_Token', Utilities.getUuid(), 'Emergency leader login token. Keep private. Prefer Google email allowlist.'],
    ['Admin_Emails', '', 'Comma-separated Google emails that should be treated as leaders.'],
    ['Auth_Mode', 'EmailOrToken', 'EmailOnly, TokenOnly, or EmailOrToken.'],
    ['Discord_Webhook_War', '', 'Discord webhook URL for war alerts.'],
    ['Discord_Webhook_Chain', '', 'Discord webhook URL for chain alerts.'],
    ['Discord_Webhook_Applications', '', 'Discord webhook URL for recruit alerts.'],
    ['Discord_Webhook_Armory', '', 'Discord webhook URL for armory/request alerts.'],
    ['Discord_Webhook_Leadership', '', 'Discord webhook URL for leader-only alerts.'],
    ['Enable_Discord_Alerts', 'FALSE', 'TRUE to send configured Discord alerts.'],
    ['Payout_Per_Hit', '250000', 'Cash per successful war hit.'],
    ['Payout_Per_Respect', '75000', 'Cash per respect gained.'],
    ['Payout_Per_KO', '1000000', 'Cash per knockout.'],
    ['Payout_Per_Assist', '100000', 'Cash per assist if tracked.'],
    ['Payout_Chain_Saver_Bonus', '500000', 'Bonus per chain saver hit if marked.'],
    ['Penalty_Missed_Assignment', '250000', 'Penalty per missed assignment.'],
    ['Payout_MVP_Bonus_1', '5000000', 'Optional manual/leader bonus for top contributor.'],
    ['Payout_MVP_Bonus_2', '3000000', 'Optional manual/leader bonus for second contributor.'],
    ['Payout_MVP_Bonus_3', '1500000', 'Optional manual/leader bonus for third contributor.'],
    ['Only_One_Active_War', 'TRUE', 'Auto-pause other active war rows when a new war is activated.'],
    ['Use_AttacksFull_First', 'FALSE', 'Try faction attacksfull before attacks where key/API permissions allow it.'],
    ['Chain_Danger_Seconds', '120', 'Send danger alert when estimated chain timeout is below this.'],
    ['Store_Member_Keys', 'TRUE', 'If FALSE, member keys are only verified and not stored.'],
    ['Required_Key_Disclosure', requiredCustomSelectionsText_(), 'Displayed before any member submits an API key.'],
    ['Privacy_Disclosure_Version', '1.6', 'Current privacy/API disclosure version shown to members.'],
    ['Safe_Mode', 'FALSE', 'TRUE disables heavy sync/scanner writes/Discord alerts while troubleshooting.'],
    ['Theme_Mode', 'Anthracite', 'UI theme name used by the web app.'],
    ['Scanner_Install_Page_Enabled', 'TRUE', 'Show scanner install/troubleshooting page.'],
    ['Backup_Keep_Count', '10', 'How many manual backups you intend to keep.'],
    ['Public_Custom_Domain', '', 'Optional custom domain or redirect URL for public recruiting.']
  ];
  upsertRowsByKey_(APP.SHEETS.SETTINGS, 'Key', rows.map(function(r) {
    return {Key: r[0], Value: r[1], Description: r[2]};
  }));
}

function seedPayoutRules_() {
  var rows = [
    {Rule: 'Base_Per_Hit', Value: numberSetting_('Payout_Per_Hit', 250000), Enabled: 'TRUE', Description: 'Successful attacks multiplied by this value.'},
    {Rule: 'Respect_Bonus', Value: numberSetting_('Payout_Per_Respect', 75000), Enabled: 'TRUE', Description: 'Respect gained multiplied by this value.'},
    {Rule: 'KO_Bonus', Value: numberSetting_('Payout_Per_KO', 1000000), Enabled: 'TRUE', Description: 'KO count multiplied by this value.'},
    {Rule: 'Assist_Bonus', Value: numberSetting_('Payout_Per_Assist', 100000), Enabled: 'TRUE', Description: 'Assist count multiplied by this value if available.'},
    {Rule: 'Chain_Saver_Bonus', Value: numberSetting_('Payout_Chain_Saver_Bonus', 500000), Enabled: 'TRUE', Description: 'Manual bonus for chain saver hits.'},
    {Rule: 'Missed_Assignment_Penalty', Value: numberSetting_('Penalty_Missed_Assignment', 250000), Enabled: 'TRUE', Description: 'Manual penalty per missed assignment.'}
  ];
  upsertRowsByKey_(APP.SHEETS.PAYOUT_RULES, 'Rule', rows);
}

function seedRules_() {
  var rows = [
    {Rule_ID: 'R-001', Category: 'War', Rule: 'Follow assigned targets during ranked wars and chains.', Active: 'TRUE', Updated: nowIso_()},
    {Rule_ID: 'R-002', Category: 'Discord', Rule: 'Join Discord and watch the war/chain alert channels.', Active: 'TRUE', Updated: nowIso_()},
    {Rule_ID: 'R-003', Category: 'Payouts', Rule: 'War payouts are calculated from the payout sheet and can include bonuses/penalties.', Active: 'TRUE', Updated: nowIso_()},
    {Rule_ID: 'R-004', Category: 'API', Rule: 'API keys are optional unless leadership makes them required; keys are used only as disclosed on the key connect page.', Active: 'TRUE', Updated: nowIso_()}
  ];
  upsertRowsByKey_(APP.SHEETS.RULES, 'Rule_ID', rows);
}

function seedAnnouncements_() {
  var rows = [
    {Announcement_ID: 'A-001', Timestamp: nowIso_(), Title: 'Welcome to ShadowCore HQ', Message: 'Use this portal for war orders, payout stubs, requests, applications, and faction planning.', Audience: 'All', Active: 'TRUE'}
  ];
  upsertRowsByKey_(APP.SHEETS.ANNOUNCEMENTS, 'Announcement_ID', rows);
}

function applyBasicFormatting_() {
  // v1.8.1: keep this lightweight. Heavy auto-resize across 100+ tabs can trigger Spreadsheet timeouts.
  var names = Object.keys(HEADERS);
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var sheet = ss_().getSheetByName(name);
    if (!sheet) continue;
    var lastCol = Math.max(sheet.getLastColumn(), HEADERS[name].length);
    if (lastCol < 1) continue;
    sheet.getRange(1, 1, 1, lastCol)
      .setFontWeight('bold')
      .setFontColor('#ffffff')
      .setBackground('#111827')
      .setWrap(true);
    if (i % 15 === 14) SpreadsheetApp.flush();
  }
}

function getSheet_(name) {
  var sheet = ss_().getSheetByName(name);
  if (!sheet) {
    if (!HEADERS[name]) throw new Error('Unknown sheet: ' + name);
    sheet = ensureSheet_(name, HEADERS[name]);
  }
  return sheet;
}

function headers_(sheetName) {
  var sheet = getSheet_(sheetName);
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
}

function readTable_(sheetName, limit) {
  var sheet = getSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  var out = [];
  var max = limit ? Math.min(values.length, limit + 1) : values.length;
  for (var r = 1; r < max; r++) {
    var row = {};
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      row[headers[c]] = values[r][c];
      if (values[r][c] !== '' && values[r][c] !== null) empty = false;
    }
    if (!empty) out.push(row);
  }
  return out;
}

function appendRowObject_(sheetName, obj) {
  var sheet = getSheet_(sheetName);
  var headers = headers_(sheetName);
  var row = headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
  return obj;
}

function upsertRowsByKey_(sheetName, keyHeader, objects) {
  objects.forEach(function(obj) {
    upsertRowByKey_(sheetName, keyHeader, obj[keyHeader], obj);
  });
}

function upsertRowByKey_(sheetName, keyHeader, keyValue, obj) {
  if (keyValue === undefined || keyValue === null || keyValue === '') {
    return appendRowObject_(sheetName, obj);
  }
  var sheet = getSheet_(sheetName);
  var headers = headers_(sheetName);
  var keyCol = headers.indexOf(keyHeader);
  if (keyCol === -1) throw new Error('Missing key header ' + keyHeader + ' in ' + sheetName);
  var data = sheet.getDataRange().getValues();
  var targetRow = -1;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][keyCol]) === String(keyValue)) {
      targetRow = r + 1;
      break;
    }
  }
  var row = headers.map(function(h, idx) {
    if (obj[h] !== undefined) return obj[h];
    if (targetRow > -1) return sheet.getRange(targetRow, idx + 1).getValue();
    return '';
  });
  if (targetRow > -1) {
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return obj;
}

function getSettingsMap_() {
  var sheet = ss_().getSheetByName(APP.SHEETS.SETTINGS);
  if (!sheet) return {};
  var values = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < values.length; i++) {
    if (values[i][0]) map[String(values[i][0])] = values[i][1];
  }
  return map;
}

function saveSetting_(key, value, description) {
  upsertRowByKey_(APP.SHEETS.SETTINGS, 'Key', key, {Key: key, Value: value, Description: description || ''});
  logAudit_('system', 'saveSetting', key);
  return {ok: true};
}

function logAudit_(user, action, details) {
  try {
    appendRowObject_(APP.SHEETS.AUDIT_LOG, {
      Timestamp: nowIso_(),
      User: user || 'system',
      Action: action,
      Details: typeof details === 'string' ? details : safeJson_(details)
    });
  } catch (err) {
    Logger.log(err);
  }
}

function logError_(source, err, payload) {
  try {
    appendRowObject_(APP.SHEETS.ERRORS, {
      Timestamp: nowIso_(),
      Source: source,
      Message: err && err.message ? err.message : String(err),
      Stack: err && err.stack ? err.stack : '',
      Payload: payload ? safeJson_(payload).slice(0, 50000) : ''
    });
  } catch (inner) {
    Logger.log(inner);
  }
}

function showDeploymentChecklist() {
  var msg = [
    '1) Run ShadowCore HQ > Setup / Repair tabs.',
    '2) Put your leader/faction API key in the web app as a leader or call setFactionLeaderKey("YOUR_KEY") in the editor.',
    '3) Fill Discord webhook settings if using alerts.',
    '4) Deploy as Web App. Choose execute as you, access anyone with link or restricted to your domain.',
    '5) Share the Web App URL with members, not the Apps Script editor.',
    '6) Keep the Admin_Token private. Use Admin_Emails where possible.'
  ].join('\n\n');
  try {
    SpreadsheetApp.getUi().alert('ShadowCore HQ Deployment Checklist', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    return msg;
  }
}

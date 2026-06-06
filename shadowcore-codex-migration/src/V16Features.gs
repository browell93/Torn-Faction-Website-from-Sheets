/**
 * ShadowCore HQ v1.6 - Polish, Setup, Security, Diagnostics, and Scanner UX.
 * Adds: setup wizard, member tokens, privacy/disclosure, theme/public polish,
 * version log, backups, diagnostics, scanner install, scanner onboarding,
 * Discord command-style reports, sheet protections, safe mode, and admin manual.
 */


function fingerprint_(value) {
  value = String(value || '');
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
  return digest.map(function(b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('').slice(0, 16);
}

function seedV16Defaults_() {
  seedV16Settings_();
  seedV16SetupWizard_();
  seedV16VersionLog_();
  seedV16DiscordCommands_();
  seedV16AdminManual_();
  seedV16PrivacyArticle_();
  seedV16ScannerInstallArticle_();
}

function seedV16Settings_() {
  var rows = [
    ['V16_Installed', 'TRUE', 'v1.6 feature pack installed.'],
    ['V16_Installed_At', nowIso_(), 'Last v1.6 setup/repair time.'],
    ['Setup_Wizard_Complete', setting_('Setup_Wizard_Complete', 'FALSE'), 'TRUE when the setup wizard checklist is complete.'],
    ['Theme_Accent', '#f59e0b', 'Anthracite/coal accent color.'],
    ['Theme_Background', '#05070a', 'Primary dark UI background.'],
    ['Member_Token_Days', '180', 'Default member-token expiration period.'],
    ['Officer_Token_Days', '90', 'Default officer-token expiration period.'],
    ['Enable_Backup_Button', 'TRUE', 'Allow leaders to create spreadsheet backups from Admin.'],
    ['Enable_Sheet_Protection', 'TRUE', 'Allow leaders to protect critical sheets.'],
    ['Scanner_UserScript_Version', '1.5+', 'Recommended userscript version for Scanner Install page.'],
    ['Scanner_UserScript_URL', '', 'Optional hosted URL for the scanner userscript.'],
    ['Discord_Command_Prefix', '/', 'Prefix shown for command-style report templates.'],
    ['Diagnostics_Last_Run', '', 'Last diagnostics timestamp.']
  ];
  rows.forEach(function(r) { saveSetting_(r[0], r[1], r[2]); });
}

function seedV16SetupWizard_() {
  var rows = [
    {Step_ID:'SETUP-01', Sort:1, Title:'Set faction name and ID', Status:'Open', Required:'TRUE', Value_Key:'Faction_ID', Instructions:'Confirm Faction_Name and Faction_ID in Settings.', Last_Checked:'', Notes:''},
    {Step_ID:'SETUP-02', Sort:2, Title:'Store faction leader API key', Status:'Open', Required:'TRUE', Value_Key:'FACTION_LEADER', Instructions:'Use installMyFactionKey() or Admin settings to store the leader key.', Last_Checked:'', Notes:''},
    {Step_ID:'SETUP-03', Sort:3, Title:'Set admin emails or token', Status:'Open', Required:'TRUE', Value_Key:'Admin_Emails', Instructions:'Add Admin_Emails or keep Admin_Token private.', Last_Checked:'', Notes:''},
    {Step_ID:'SETUP-04', Sort:4, Title:'Configure Discord webhooks', Status:'Open', Required:'FALSE', Value_Key:'Enable_Discord_Alerts', Instructions:'Add webhooks and test a command-style report.', Last_Checked:'', Notes:''},
    {Step_ID:'SETUP-05', Sort:5, Title:'Create scanner shared token', Status:'Open', Required:'FALSE', Value_Key:'Scanner_Shared_Token', Instructions:'Run setupShadowCoreScannerBridge() and copy the scanner token.', Last_Checked:'', Notes:''},
    {Step_ID:'SETUP-06', Sort:6, Title:'Install scanner', Status:'Open', Required:'FALSE', Value_Key:'Scanner_Installs', Instructions:'Use Scanner Install page and test HQ connection from Torn.', Last_Checked:'', Notes:''},
    {Step_ID:'SETUP-07', Sort:7, Title:'Review privacy/API disclosure', Status:'Open', Required:'TRUE', Value_Key:'Privacy_Disclosure_Version', Instructions:'Open Privacy page and confirm it matches what you collect.', Last_Checked:'', Notes:''},
    {Step_ID:'SETUP-08', Sort:8, Title:'Run diagnostics', Status:'Open', Required:'TRUE', Value_Key:'Diagnostics_Last_Run', Instructions:'Run diagnostics after every upgrade/redeploy.', Last_Checked:'', Notes:''},
    {Step_ID:'SETUP-09', Sort:9, Title:'Create first backup', Status:'Open', Required:'TRUE', Value_Key:'Backups', Instructions:'Create a manual backup copy before inviting members.', Last_Checked:'', Notes:''},
    {Step_ID:'SETUP-10', Sort:10, Title:'Protect critical sheets', Status:'Open', Required:'FALSE', Value_Key:'Sheet_Protections', Instructions:'Protect Settings/API/Audit/Treasury sheets from accidental edits.', Last_Checked:'', Notes:''}
  ];
  upsertRowsByKey_(APP.SHEETS.SETUP_WIZARD, 'Step_ID', rows);
}

function seedV16VersionLog_() {
  var rows = [
    {Version:'1.0.0', Installed:'', Title:'Core ShadowCore HQ', Changes:'Sheets database, Apps Script app, roster/dashboard, war room, payouts, applications.', Migration_Status:'Historical', Notes:''},
    {Version:'1.1.0', Installed:'', Title:'Admin actions and page routing', Changes:'Admin controls, reports, settings, direct page URLs.', Migration_Status:'Historical', Notes:''},
    {Version:'1.2.0', Installed:'', Title:'War intelligence and mobile command', Changes:'Battle plans, check-ins, teams, mobile, tasks, BBCode.', Migration_Status:'Historical', Notes:''},
    {Version:'1.3.0', Installed:'', Title:'Economy/member life', Changes:'Treasury, loans, revives, awards, onboarding, mentors, polls, microsite.', Migration_Status:'Historical', Notes:''},
    {Version:'1.4.0', Installed:'', Title:'Tampermonkey bridge', Changes:'Independent Torn scanner bridge and scanner tabs.', Migration_Status:'Historical', Notes:''},
    {Version:'1.5.0', Installed:'', Title:'Scanner API support', Changes:'Optional local Torn API usage in scanner, capped at 1/s.', Migration_Status:'Historical', Notes:''},
    {Version:'1.6.0', Installed:nowIso_(), Title:'Polish, setup, security, diagnostics', Changes:'Setup wizard, privacy page, diagnostics, backups, safe mode, scanner install, token login, admin manual, sheet protection, Discord command reports, theme polish.', Migration_Status:'Installed', Notes:'Run setupShadowCoreHQ after copying files.'}
  ];
  upsertRowsByKey_(APP.SHEETS.VERSION_LOG, 'Version', rows);
}

function seedV16DiscordCommands_() {
  var rows = [
    {Command_ID:'CMD-WARREPORT', Command:'/warreport', Description:'Latest war report summary.', Template:'{latestWarReport}', Last_Run:'', Last_Output:'', Enabled:'TRUE', Role:'Officer'},
    {Command_ID:'CMD-PAYOUTS', Command:'/payouts', Description:'Unpaid payout summary.', Template:'Unpaid payouts: {unpaidPayouts}', Last_Run:'', Last_Output:'', Enabled:'TRUE', Role:'Officer'},
    {Command_ID:'CMD-TARGETS', Command:'/targets', Description:'Top active target list.', Template:'Targets: {targets}', Last_Run:'', Last_Output:'', Enabled:'TRUE', Role:'Core'},
    {Command_ID:'CMD-REVIVES', Command:'/revives', Description:'Open revive/hospital support requests.', Template:'Open revive requests: {revives}', Last_Run:'', Last_Output:'', Enabled:'TRUE', Role:'Member'},
    {Command_ID:'CMD-APPLICATIONS', Command:'/applications', Description:'Pending application count.', Template:'Pending applications: {applications}', Last_Run:'', Last_Output:'', Enabled:'TRUE', Role:'Officer'},
    {Command_ID:'CMD-CHECKIN', Command:'/checkin', Description:'War check-in instructions.', Template:'Check in at the HQ War Contracts page and use Mobile War during active wars.', Last_Run:'', Last_Output:'', Enabled:'TRUE', Role:'Member'}
  ];
  upsertRowsByKey_(APP.SHEETS.DISCORD_COMMANDS, 'Command_ID', rows);
}

function seedV16AdminManual_() {
  var rows = [
    {Article_ID:'MANUAL-INSTALL', Sort:1, Title:'Install / Upgrade', Category:'Setup', Content:'Copy all .gs/.html files into Apps Script, save, run setupShadowCoreHQ, then redeploy as a new version.', Updated:nowIso_(), Updated_By:'system'},
    {Article_ID:'MANUAL-KEY', Sort:2, Title:'Store faction leader API key', Category:'API', Content:'Run setFactionLeaderKey("YOUR_KEY") from a temporary wrapper function, then remove the key from code. The sheet stores a fingerprint only.', Updated:nowIso_(), Updated_By:'system'},
    {Article_ID:'MANUAL-SCANNER', Sort:3, Title:'Install scanner', Category:'Scanner', Content:'Install Tampermonkey, paste ShadowCoreScanner.user.js, configure backend URL and scanner token from Scanner_Settings.', Updated:nowIso_(), Updated_By:'system'},
    {Article_ID:'MANUAL-SAFE', Sort:4, Title:'Safe mode', Category:'Troubleshooting', Content:'Enable Safe_Mode to disable heavy sync, scanner writes, and Discord sends while repairing the sheet/app.', Updated:nowIso_(), Updated_By:'system'},
    {Article_ID:'MANUAL-BACKUP', Sort:5, Title:'Backups', Category:'Maintenance', Content:'Create a backup before big imports, payout edits, or upgrades. Backups copy the active spreadsheet.', Updated:nowIso_(), Updated_By:'system'},
    {Article_ID:'MANUAL-DIAG', Sort:6, Title:'Diagnostics', Category:'Maintenance', Content:'Run diagnostics after upgrades. Fix missing tabs/settings, invalid API keys, missing scanner token, or disabled deployment items.', Updated:nowIso_(), Updated_By:'system'},
    {Article_ID:'MANUAL-PRIVACY', Sort:7, Title:'Privacy/API disclosure', Category:'Security', Content:'Keep the privacy page accurate. Tell members what is collected, stored, visible to officers, and how to delete keys/data.', Updated:nowIso_(), Updated_By:'system'}
  ];
  upsertRowsByKey_(APP.SHEETS.ADMIN_MANUAL, 'Article_ID', rows);
}

function seedV16PrivacyArticle_() {
  var content = privacyDisclosureText_();
  upsertRowByKey_(APP.SHEETS.KNOWLEDGE_BASE, 'Article_ID', 'KB-PRIVACY-V16', {
    Article_ID:'KB-PRIVACY-V16', Category:'Security', Title:'ShadowCore HQ Privacy and API Disclosure', Audience:'All', Content:content, Tags:'privacy,api,scanner,security', Active:'TRUE', Updated:nowIso_(), Updated_By:'system'
  });
}

function seedV16ScannerInstallArticle_() {
  upsertRowByKey_(APP.SHEETS.KNOWLEDGE_BASE, 'Article_ID', 'KB-SCANNER-INSTALL', {
    Article_ID:'KB-SCANNER-INSTALL', Category:'Scanner', Title:'Install the ShadowCore Torn Scanner', Audience:'All', Content:'Install Tampermonkey, add ShadowCoreScanner.user.js, open Torn, configure Backend URL, Scanner Shared Token, Torn ID/name, and test HQ. API use is optional and stored locally by Tampermonkey, not sent to HQ.', Tags:'scanner,tampermonkey,install', Active:'TRUE', Updated:nowIso_(), Updated_By:'system'
  });
}

function privacyDisclosureText_() {
  return [
    'ShadowCore HQ uses Torn API keys and optional scanner submissions to organize faction activity.',
    'Never enter your Torn password. Only Torn API keys may be requested.',
    'Stored data can include Torn ID, Torn name, faction status, war contribution, requests, applications, payouts, notes, availability, onboarding progress, awards, loans, revive requests, scanner submissions, and API key health/fingerprint information.',
    'Actual member API keys should be stored in Apps Script Properties where enabled; public sheets should show fingerprints/status only.',
    'The Tampermonkey scanner is manual by default. Optional scanner API use stores the API key locally in Tampermonkey storage and does not send the key to ShadowCore HQ.',
    'Faction leaders/officers may see data needed for war planning, payouts, applications, support requests, discipline, and faction administration.',
    'Members may ask leadership to remove stored keys or correct/remove member-submitted data.',
    'Do not submit data you are not comfortable sharing with ShadowCore leadership.'
  ].join('\n\n');
}

/** 1. Setup wizard */
function runSetupWizardCheck() {
  var rows = readTable_(APP.SHEETS.SETUP_WIZARD);
  var settings = getSettingsMap_();
  var hasLeaderKey = !!getScriptProps_().getProperty('TORN_KEY_FACTION_LEADER_PRIMARY');
  var scannerSettingsExists = !!ss_().getSheetByName('Scanner_Settings');
  var backupRows = readTable_(APP.SHEETS.BACKUPS);
  var diagnosticRows = readTable_(APP.SHEETS.DIAGNOSTICS);
  var checkMap = {
    'SETUP-01': factionId_() ? 'Complete' : 'Open',
    'SETUP-02': hasLeaderKey ? 'Complete' : 'Open',
    'SETUP-03': (settings.Admin_Emails || settings.Admin_Token) ? 'Complete' : 'Open',
    'SETUP-04': boolSetting_('Enable_Discord_Alerts', false) ? 'Complete' : 'Optional',
    'SETUP-05': scannerSettingsExists ? 'Complete' : 'Optional',
    'SETUP-06': readTable_(APP.SHEETS.SCANNER_INSTALLS).length ? 'Complete' : 'Optional',
    'SETUP-07': settings.Privacy_Disclosure_Version ? 'Complete' : 'Open',
    'SETUP-08': diagnosticRows.length ? 'Complete' : 'Open',
    'SETUP-09': backupRows.length ? 'Complete' : 'Open',
    'SETUP-10': readTable_(APP.SHEETS.SHEET_PROTECTIONS).length ? 'Complete' : 'Optional'
  };
  rows.forEach(function(r) {
    r.Status = checkMap[String(r.Step_ID)] || r.Status || 'Open';
    r.Last_Checked = nowIso_();
    upsertRowByKey_(APP.SHEETS.SETUP_WIZARD, 'Step_ID', r.Step_ID, r);
  });
  var openRequired = readTable_(APP.SHEETS.SETUP_WIZARD).filter(function(r) { return String(r.Required).toUpperCase() === 'TRUE' && String(r.Status) !== 'Complete'; }).length;
  saveSetting_('Setup_Wizard_Complete', openRequired ? 'FALSE' : 'TRUE', 'Updated by setup wizard check.');
  refreshSetupChecklist_();
  logAudit_('system', 'runSetupWizardCheck', {openRequired: openRequired});
  return {ok:true, openRequired: openRequired, complete: openRequired === 0};
}

function runSetupWizardCheckFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'LEADER');
  var out = runSetupWizardCheck();
  logAudit_(session.name, 'runSetupWizardCheckFromWeb', out);
  return out;
}

function refreshSetupChecklist_() {
  var wizard = readTable_(APP.SHEETS.SETUP_WIZARD);
  var rows = wizard.map(function(w) {
    return {Check_ID:w.Step_ID, Sort:w.Sort, Title:w.Title, Status:w.Status, Details:w.Instructions, Action_URL:'?page=setup', Updated:nowIso_()};
  });
  upsertRowsByKey_(APP.SHEETS.SETUP_CHECKLIST, 'Check_ID', rows);
}

/** 2. Member token login */
function issueMemberTokenFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var token = Utilities.getUuid() + '-' + Utilities.getUuid();
  var role = String(form.role || 'MEMBER').toUpperCase();
  var days = role === 'OFFICER' ? numberSetting_('Officer_Token_Days', 90) : numberSetting_('Member_Token_Days', 180);
  var expires = new Date(Date.now() + days * 86400000).toISOString();
  var row = {
    Token_ID:'TOK-' + Utilities.getUuid().slice(0,8).toUpperCase(), Torn_ID:String(form.tornId || ''), Name:String(form.name || ''), Role:role,
    Token_Fingerprint:fingerprint_(token), Status:'Active', Issued:nowIso_(), Expires:expires, Last_Used:'', Issued_By:session.name, Notes:String(form.notes || '')
  };
  getScriptProps_().setProperty('MEMBER_TOKEN_' + row.Token_Fingerprint, safeJson_({token:token, tornId:row.Torn_ID, name:row.Name, role:role, expires:expires}));
  appendRowObject_(APP.SHEETS.MEMBER_TOKENS, row);
  logAudit_(session.name, 'issueMemberTokenFromWeb', {tornId:row.Torn_ID, role:role, fp:row.Token_Fingerprint});
  return {ok:true, token:token, fingerprint:row.Token_Fingerprint, expires:expires};
}

function memberTokenLoginLegacy_(token) {
  var fp = fingerprint_(String(token || ''));
  var raw = getScriptProps_().getProperty('MEMBER_TOKEN_' + fp);
  if (!raw) throw new Error('Invalid member token.');
  var data = JSON.parse(raw);
  if (new Date(data.expires).getTime() < Date.now()) throw new Error('Expired member token.');
  var rows = readTable_(APP.SHEETS.MEMBER_TOKENS), row = null;
  rows.forEach(function(r) { if (String(r.Token_Fingerprint) === fp) row = r; });
  if (row && String(row.Status).toLowerCase() !== 'active') throw new Error('Token is not active.');
  if (row) { row.Last_Used = nowIso_(); upsertRowByKey_(APP.SHEETS.MEMBER_TOKENS, 'Token_ID', row.Token_ID, row); }
  return createSession_({tornId:data.tornId, name:data.name || ('Player ' + data.tornId), role:data.role || 'MEMBER', email:''});
}

function revokeMemberTokenFromWeb(sessionId, tokenId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var rows = readTable_(APP.SHEETS.MEMBER_TOKENS), found = null;
  rows.forEach(function(r) { if (String(r.Token_ID) === String(tokenId)) found = r; });
  if (!found) throw new Error('Token row not found.');
  found.Status = 'Revoked';
  upsertRowByKey_(APP.SHEETS.MEMBER_TOKENS, 'Token_ID', tokenId, found);
  logAudit_(session.name, 'revokeMemberTokenFromWeb', tokenId);
  return {ok:true};
}

/** 3. Privacy / disclosure */
function acceptPrivacyDisclosureFromWeb(sessionId, accepted) {
  var session = requireSession_(sessionId);
  var row = {Consent_ID:'CONSENT-' + session.tornId + '-' + setting_('Privacy_Disclosure_Version','1.6'), Timestamp:nowIso_(), Torn_ID:session.tornId, Name:session.name, Consent_Type:'Privacy/API Disclosure', Accepted:String(!!accepted).toUpperCase(), Version:setting_('Privacy_Disclosure_Version','1.6'), IP_Note:'Apps Script web app', Notes:''};
  upsertRowByKey_(APP.SHEETS.PRIVACY_CONSENTS, 'Consent_ID', row.Consent_ID, row);
  logAudit_(session.name, 'acceptPrivacyDisclosureFromWeb', row.Accepted);
  return {ok:true};
}

function getPrivacyDisclosure() {
  return {version:setting_('Privacy_Disclosure_Version','1.6'), text:privacyDisclosureText_(), rows:readTable_(APP.SHEETS.PRIVACY_CONSENTS).slice(-200)};
}

/** 4/5. Better public microsite and theme controls */
function saveThemeSettingFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'LEADER');
  form = form || {};
  if (form.themeMode !== undefined) saveSetting_('Theme_Mode', form.themeMode, 'Theme updated from v1.6 page.');
  if (form.accent !== undefined) saveSetting_('Theme_Accent', form.accent, 'Theme updated from v1.6 page.');
  if (form.background !== undefined) saveSetting_('Theme_Background', form.background, 'Theme updated from v1.6 page.');
  if (form.customDomain !== undefined) saveSetting_('Public_Custom_Domain', form.customDomain, 'Custom public domain note.');
  logAudit_(session.name, 'saveThemeSettingFromWeb', form);
  return {ok:true, settings:publicSettings_()};
}

/** 6. Version/update system */
function getVersionStatus_() {
  var rows = readTable_(APP.SHEETS.VERSION_LOG).sort(function(a,b){ return String(a.Version).localeCompare(String(b.Version)); });
  var current = APP.VERSION;
  var installed = rows.filter(function(r){ return String(r.Migration_Status).toLowerCase() === 'installed'; }).slice(-1)[0] || {};
  var missingSheets = Object.keys(HEADERS).filter(function(name){ return !ss_().getSheetByName(name); });
  return {current:current, installed:installed, versions:rows, missingSheets:missingSheets, setupComplete:boolSetting_('Setup_Wizard_Complete', false)};
}

function getVersionStatusFromWeb(sessionId) {
  requireRole_(sessionId, 'OFFICER');
  return getVersionStatus_();
}

/** 7. Backups */
function createBackupCopy() {
  var name = factionName_() + '_HQ_Backup_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  var file = DriveApp.getFileById(ss_().getId()).makeCopy(name);
  var row = {Backup_ID:'BACKUP-' + Utilities.getUuid().slice(0,8).toUpperCase(), Timestamp:nowIso_(), Type:'Spreadsheet copy', Spreadsheet_URL:file.getUrl(), Status:'Created', Created_By:Session.getActiveUser().getEmail() || 'system', Notes:name};
  appendRowObject_(APP.SHEETS.BACKUPS, row);
  logAudit_(row.Created_By, 'createBackupCopy', row.Spreadsheet_URL);
  return {ok:true, backup:row};
}

function createBackupCopyFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'LEADER');
  if (!boolSetting_('Enable_Backup_Button', true)) throw new Error('Backup button disabled in Settings.');
  var result = createBackupCopy();
  result.backup.Created_By = session.name;
  upsertRowByKey_(APP.SHEETS.BACKUPS, 'Backup_ID', result.backup.Backup_ID, result.backup);
  return result;
}

/** 8. Diagnostics */
function runDiagnostics() {
  var checks = [];
  function add(cat, name, ok, details, action) {
    checks.push({Check_ID:'DIAG-' + Utilities.getUuid().slice(0,8).toUpperCase(), Timestamp:nowIso_(), Category:cat, Check_Name:name, Status:ok ? 'OK' : 'WARN', Details:String(details || ''), Recommended_Action:String(action || '')});
  }
  Object.keys(HEADERS).forEach(function(name) { add('Sheets', 'Sheet exists: ' + name, !!ss_().getSheetByName(name), '', 'Run setupShadowCoreHQ if missing.'); });
  add('Settings', 'Faction ID set', !!factionId_(), factionId_(), 'Set Faction_ID in Settings.');
  add('Settings', 'Admin access configured', !!(setting_('Admin_Emails','') || setting_('Admin_Token','')), 'Admin_Emails/Admin_Token', 'Set Admin_Emails or keep Admin_Token private.');
  add('Security', 'Faction leader key stored', !!getScriptProps_().getProperty('TORN_KEY_FACTION_LEADER_PRIMARY'), 'Script Properties fingerprint only', 'Run setFactionLeaderKey through temporary wrapper.');
  add('Discord', 'Discord alerts enabled', boolSetting_('Enable_Discord_Alerts', false), 'Enable_Discord_Alerts=' + setting_('Enable_Discord_Alerts','FALSE'), 'Optional. Set webhooks and enable alerts.');
  add('Scanner', 'Scanner bridge installed', !!ss_().getSheetByName('Scanner_Settings'), 'Scanner_Settings sheet present', 'Run setupShadowCoreScannerBridge if using scanner.');
  add('Deployment', 'Web app URL available', !!appUrl_(), appUrl_(), 'Redeploy as web app if blank.');
  add('Safe Mode', 'Safe mode off', !boolSetting_('Safe_Mode', false), 'Safe_Mode=' + setting_('Safe_Mode','FALSE'), 'Turn off Safe_Mode after repairs.');
  upsertRowsByKey_(APP.SHEETS.DIAGNOSTICS, 'Check_ID', checks);
  saveSetting_('Diagnostics_Last_Run', nowIso_(), 'Updated by diagnostics.');
  refreshSetupChecklist_();
  return {ok:true, checks:checks.length, warnings:checks.filter(function(c){return c.Status !== 'OK';}).length};
}

function runDiagnosticsFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'LEADER');
  var out = runDiagnostics();
  logAudit_(session.name, 'runDiagnosticsFromWeb', out);
  return out;
}

/** 9/10. Scanner UI/install support */
function getScannerInstallState() {
  var scannerToken = '';
  try {
    var rows = ss_().getSheetByName('Scanner_Settings') ? readTable_('Scanner_Settings') : [];
    rows.forEach(function(r){ if (String(r.Key) === 'Scanner_Shared_Token') scannerToken = r.Value || ''; });
  } catch (err) {}
  return {
    backendUrl:appUrl_(), scannerToken:scannerToken, userScriptVersion:setting_('Scanner_UserScript_Version','1.5+'), userScriptUrl:setting_('Scanner_UserScript_URL',''), installs:readTable_(APP.SHEETS.SCANNER_INSTALLS).slice(-200)
  };
}

function registerScannerInstall_(payload) {
  payload = payload || {};
  var id = 'SCAN-' + (payload.tornId || 'UNKNOWN') + '-' + Utilities.getUuid().slice(0,6).toUpperCase();
  var row = {Install_ID:id, Timestamp:nowIso_(), Torn_ID:String(payload.tornId || ''), Name:String(payload.name || ''), Scanner_Version:String(payload.version || ''), Backend_URL:String(payload.backendUrl || appUrl_()), Token_Fingerprint:fingerprint_(String(payload.token || payload.sharedToken || '')), API_Enabled:String(!!payload.apiEnabled).toUpperCase(), Last_Check:nowIso_(), Status:'Connected', Notes:String(payload.notes || '')};
  appendRowObject_(APP.SHEETS.SCANNER_INSTALLS, row);
  return {ok:true, installId:id};
}

/** 11. Onboarding flow around scanner */
function createScannerOnboardingStepsFromWeb(sessionId, tornId, name) {
  var session = requireRole_(sessionId, 'OFFICER');
  var steps = ['Install Tampermonkey','Install ShadowCore Scanner','Enter backend URL','Enter scanner token','Test HQ connection','Optional: add local Torn API key','Submit availability','Accept privacy/API disclosure'];
  var rows = steps.map(function(step, idx) { return {Onboarding_ID:'SCAN-ONB-' + tornId + '-' + (idx+1), Torn_ID:String(tornId), Name:String(name || ''), Step:step, Status:'Open', Assigned_To:session.name, Due_Date:'', Completed:'', Updated:nowIso_(), Notes:'Scanner onboarding'}; });
  upsertRowsByKey_(APP.SHEETS.ONBOARDING, 'Onboarding_ID', rows);
  logAudit_(session.name, 'createScannerOnboardingStepsFromWeb', {tornId:tornId, count:rows.length});
  return {ok:true, created:rows.length};
}

/** 12. Command-style Discord messages */
function runDiscordCommandFromWeb(sessionId, command) {
  var session = requireRole_(sessionId, 'OFFICER');
  var row = null;
  readTable_(APP.SHEETS.DISCORD_COMMANDS).forEach(function(r){ if (String(r.Command) === String(command)) row = r; });
  if (!row) throw new Error('Unknown command: ' + command);
  var output = buildDiscordCommandOutput_(row.Command);
  row.Last_Run = nowIso_();
  row.Last_Output = output;
  upsertRowByKey_(APP.SHEETS.DISCORD_COMMANDS, 'Command_ID', row.Command_ID, row);
  if (boolSetting_('Enable_Discord_Alerts', false)) sendDiscordAlert('Leadership', output, {});
  logAudit_(session.name, 'runDiscordCommandFromWeb', command);
  return {ok:true, output:output};
}

function buildDiscordCommandOutput_(command) {
  var d = dashboardSummary_();
  if (command === '/payouts') return '💰 Unpaid payouts: ' + moneyText_(d.unpaidPayouts || 0);
  if (command === '/applications') return '📥 Pending applications: ' + (d.pendingApplications || 0);
  if (command === '/revives') return '🏥 Open revive requests: ' + readTable_(APP.SHEETS.REVIVE_BOARD).filter(function(r){ return !/complete|closed|cancel/i.test(String(r.Status)); }).length;
  if (command === '/targets') return '🎯 Active targets: ' + readTable_(APP.SHEETS.WAR_TARGETS).filter(function(t){ return !/complete|skipped/i.test(String(t.Status)); }).slice(0,5).map(function(t){return t.Enemy_Name + ' [' + t.Priority + ']';}).join(', ');
  if (command === '/checkin') return '✅ War check-in: open HQ → War Contracts or Mobile War and mark availability.';
  var report = readTable_(APP.SHEETS.REPORTS).slice(-1)[0];
  return report ? ('⚔️ ' + report.Title + '\n' + report.Body) : '⚔️ No war report generated yet.';
}

function moneyText_(n) { return '$' + Number(n || 0).toLocaleString(); }

/** 13. Sheet protection helpers */
function protectCriticalSheets() {
  var sheets = [APP.SHEETS.SETTINGS, APP.SHEETS.API_KEYS, APP.SHEETS.AUDIT_LOG, APP.SHEETS.ERRORS, APP.SHEETS.BANK_LEDGER, APP.SHEETS.LOAN_COLLATERAL, APP.SHEETS.PAYOUTS, APP.SHEETS.MEMBER_TOKENS, APP.SHEETS.PRIVACY_CONSENTS];
  var email = Session.getActiveUser().getEmail() || '';
  var out = [];
  sheets.forEach(function(name) {
    var sheet = ss_().getSheetByName(name);
    if (!sheet) return;
    var protection = sheet.protect().setDescription('ShadowCore HQ protected: ' + name);
    try { protection.removeEditors(protection.getEditors()); } catch (err) {}
    if (email) protection.addEditor(email);
    var row = {Protection_ID:'PROT-' + name, Timestamp:nowIso_(), Sheet_Name:name, Protected:'TRUE', Editors:email, Status:'Protected', Notes:'Created/updated by protectCriticalSheets'};
    upsertRowByKey_(APP.SHEETS.SHEET_PROTECTIONS, 'Protection_ID', row.Protection_ID, row);
    out.push(row);
  });
  logAudit_(email || 'system', 'protectCriticalSheets', {count:out.length});
  return {ok:true, protected:out.length};
}

function protectCriticalSheetsFromWeb(sessionId) {
  requireRole_(sessionId, 'LEADER');
  if (!boolSetting_('Enable_Sheet_Protection', true)) throw new Error('Sheet protection disabled in Settings.');
  return protectCriticalSheets();
}

/** 14. Safe mode */
function setSafeModeFromWeb(sessionId, enabled, reason) {
  var session = requireRole_(sessionId, 'LEADER');
  saveSetting_('Safe_Mode', enabled ? 'TRUE' : 'FALSE', 'Safe mode toggled from web UI.');
  var disabled = enabled ? 'Heavy sync, scanner writes, Discord alerts, nonessential triggers' : '';
  appendRowObject_(APP.SHEETS.SAFE_MODE_LOG, {Timestamp:nowIso_(), Safe_Mode:enabled ? 'TRUE' : 'FALSE', Changed_By:session.name, Reason:String(reason || ''), Disabled_Features:disabled});
  logAudit_(session.name, 'setSafeModeFromWeb', {enabled:enabled, reason:reason});
  return {ok:true, safeMode:!!enabled};
}

function isSafeMode_() { return boolSetting_('Safe_Mode', false); }

/** 15. Admin manual */
function saveAdminManualArticleFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'LEADER');
  form = form || {};
  var id = form.articleId || ('MANUAL-' + Utilities.getUuid().slice(0,8).toUpperCase());
  var row = {Article_ID:id, Sort:Number(form.sort) || 100, Title:String(form.title || ''), Category:String(form.category || 'General'), Content:String(form.content || ''), Updated:nowIso_(), Updated_By:session.name};
  if (!row.Title) throw new Error('Title required.');
  upsertRowByKey_(APP.SHEETS.ADMIN_MANUAL, 'Article_ID', id, row);
  return {ok:true, articleId:id};
}

/** v1.6 web state */
function getV16State_() {
  return {
    setupWizard:readTable_(APP.SHEETS.SETUP_WIZARD).sort(function(a,b){return Number(a.Sort)-Number(b.Sort);}),
    setupChecklist:readTable_(APP.SHEETS.SETUP_CHECKLIST).sort(function(a,b){return Number(a.Sort)-Number(b.Sort);}),
    memberTokens:readTable_(APP.SHEETS.MEMBER_TOKENS).slice(-300),
    privacy:getPrivacyDisclosure(),
    versionStatus:getVersionStatus_(),
    backups:readTable_(APP.SHEETS.BACKUPS).slice(-100),
    diagnostics:readTable_(APP.SHEETS.DIAGNOSTICS).slice(-200),
    scannerInstall:getScannerInstallState(),
    discordCommands:readTable_(APP.SHEETS.DISCORD_COMMANDS),
    protections:readTable_(APP.SHEETS.SHEET_PROTECTIONS).slice(-100),
    safeModeLog:readTable_(APP.SHEETS.SAFE_MODE_LOG).slice(-100),
    adminManual:readTable_(APP.SHEETS.ADMIN_MANUAL).sort(function(a,b){return Number(a.Sort)-Number(b.Sort);}),
    theme:{mode:setting_('Theme_Mode','Anthracite'), accent:setting_('Theme_Accent','#f59e0b'), background:setting_('Theme_Background','#05070a'), customDomain:setting_('Public_Custom_Domain',''), safeMode:setting_('Safe_Mode','FALSE')}
  };
}

/** Optional JSON endpoint handler for scanner/version pings. */
function v16HandlePost_(body) {
  body = body || {};
  if (isSafeMode_() && String(body.action) !== 'v16Ping') throw new Error('Safe Mode is enabled; v1.6 write endpoint disabled.');
  if (body.action === 'v16RegisterScanner') return registerScannerInstall_(body);
  if (body.action === 'v16Ping') return {ok:true, version:APP.VERSION, safeMode:isSafeMode_(), time:nowIso_()};
  throw new Error('Unsupported v16 action: ' + body.action);
}

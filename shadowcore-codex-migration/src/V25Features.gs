/**
 * ShadowCore HQ v2.5 - User Layout + Permissions
 * Adds:
 * 1. Personal hide/show preferences
 * 2. Role-based website access visibility
 * 3. Collapsible dashboard/page sections
 * 4. Custom homepage layout + presets
 */

function v25PageDefs_() {
  return [
    ['dashboard','Dashboard','Core','MEMBER'],
    ['mylife','My Faction Life','Member','MEMBER'],
    ['myadvisor','My Advisor','Member','MEMBER'],
    ['mobile','Mobile War','War','MEMBER'],
    ['requests','Armory Requests','Support','MEMBER'],
    ['revives','Revive Support','Support','MEMBER'],
    ['availabilitycal','Availability Calendar','Member','MEMBER'],
    ['training','Training','Member','MEMBER'],
    ['onboarding','Onboarding','Member','MEMBER'],
    ['mentors','Mentors','Member','MEMBER'],
    ['knowledge','Knowledge Base','Info','MEMBER'],
    ['scannerinstall','Scanner Install','Scanner','MEMBER'],
    ['scanneroptin','Scanner Opt-In','Scanner','MEMBER'],
    ['privacy','Privacy / API','Info','PUBLIC'],
    ['microsite','Recruit Microsite','Recruiting','PUBLIC'],
    ['recruiting','Recruiting','Recruiting','PUBLIC'],
    ['war','War Room','War','CORE'],
    ['targets','Target Board','War','CORE'],
    ['battleplan','Battle Plan','War','CORE'],
    ['chain','Chain Tracker','War','CORE'],
    ['chainplan','Chain Planner','War','CORE'],
    ['commitments','War Contracts','War','CORE'],
    ['strike','Strike Teams','War','CORE'],
    ['warcountdown','105h Enemy Watch','War Intel','OFFICER'],
    ['MemberActivityTable','Member Activity Table','War Intel','OFFICER'],
    ['ActivityHeatmap','Activity Heatmap','War Intel','OFFICER'],
    ['WarReadinessReportView','Readiness Report','War Intel','OFFICER'],
    ['payouts','Payout Center','Economy','CORE'],
    ['treasury','Treasury','Economy','OFFICER'],
    ['loans','Loans','Economy','OFFICER'],
    ['economy','Economy Ledger','Economy','OFFICER'],
    ['gymgains','Gym Gains Lab','Training','MEMBER'],
    ['GymGainComparison','Gym Comparison','Training','MEMBER'],
    ['GymGainProjectionView','Gym Projection','Training','MEMBER'],
    ['GymGoalEstimatorView','Goal Estimator','Training','MEMBER'],
    ['advisor','Advisor Center','Advisor','OFFICER'],
    ['membereducation','Member Education','Advisor','MEMBER'],
    ['weeklyreport','Weekly Reports','Advisor','MEMBER'],
    ['coachingqueue','Coaching Queue','Advisor','OFFICER'],
    ['factionneeds','Faction Needs','Advisor','MEMBER'],
    ['scorecards','Scorecards','Leadership','OFFICER'],
    ['oc','OC Planner','Leadership','OFFICER'],
    ['enemy','Enemy Intel','Leadership','OFFICER'],
    ['vetting','Applicant Vetting','Recruiting','OFFICER'],
    ['discipline','Discipline','Leadership','OFFICER'],
    ['tasks','Officer Tasks','Leadership','OFFICER'],
    ['rulescheck','Rule Checks','Leadership','OFFICER'],
    ['promotions','Promotions','Leadership','OFFICER'],
    ['awards','Awards','Leadership','OFFICER'],
    ['keyhealth','Key Health','Admin','OFFICER'],
    ['polls','Polls','Community','MEMBER'],
    ['bbcode','HTML Code Editor','Tools','OFFICER'],
    ['selfservice','Self-Service','Member','MEMBER'],
    ['scannerdeep','Scanner Deep Data','Scanner','OFFICER'],
    ['visuals','Graphs / Visuals','Reports','OFFICER'],
    ['recommendations','Smart Recs','Reports','OFFICER'],
    ['taborganizer','Tab Organizer','Admin','LEADER'],
    ['setup','Setup Wizard','Admin','LEADER'],
    ['updates','Version / Updates','Admin','LEADER'],
    ['backups','Backups','Admin','LEADER'],
    ['diagnostics','Diagnostics','Admin','LEADER'],
    ['tokens','Member Tokens','Admin','LEADER'],
    ['commands','Discord Commands','Admin','LEADER'],
    ['protection','Sheet Protection','Admin','LEADER'],
    ['safemode','Safe Mode','Admin','LEADER'],
    ['manual','Admin Manual','Admin','LEADER'],
    ['theme','Theme','Admin','LEADER'],
    ['comms','Comms & Reports','Admin','OFFICER'],
    ['settings','Settings','Admin','LEADER'],
    ['admin','Admin','Admin','LEADER'],
    ['authdebug','Auth Debug','Admin','LEADER'],
    ['layout','My Layout','Personalization','MEMBER'],
    ['permissions','Page Permissions','Admin','LEADER']
  ].map(function(r){return {Page_Key:r[0], Label:r[1], Category:r[2], Default_Min_Role:r[3]};});
}

function setupShadowCoreV25LayoutPermissions() {
  // v2.5.1: safe entry point. Your large ShadowCore workbook can time out if all
  // layout sheets + permissions are created/seeded in one execution. This now
  // performs only one small setup step. Re-run setupShadowCoreV25LayoutPermissionsMiniNext()
  // until status reports complete.
  return setupShadowCoreV25LayoutPermissionsMiniNext();
}

function v25SetupSheetDefs_() {
  return [
    {name: APP.SHEETS.USER_PREFERENCES, headers: HEADERS[APP.SHEETS.USER_PREFERENCES]},
    {name: APP.SHEETS.ROLE_PERMISSIONS, headers: HEADERS[APP.SHEETS.ROLE_PERMISSIONS]},
    {name: APP.SHEETS.HIDDEN_PAGES, headers: HEADERS[APP.SHEETS.HIDDEN_PAGES]},
    {name: APP.SHEETS.DASHBOARD_LAYOUTS, headers: HEADERS[APP.SHEETS.DASHBOARD_LAYOUTS]},
    {name: APP.SHEETS.LAYOUT_PRESETS, headers: HEADERS[APP.SHEETS.LAYOUT_PRESETS]}
  ];
}

function v25SetupProps_() {
  return PropertiesService.getScriptProperties();
}

function setupShadowCoreV25LayoutPermissionsReset() {
  var props = v25SetupProps_();
  props.deleteProperty('V25_SETUP_PHASE');
  props.deleteProperty('V25_SETUP_SHEET_INDEX');
  props.deleteProperty('V25_SETUP_PERMISSION_INDEX');
  props.deleteProperty('V25_SETUP_PRESET_INDEX');
  return setupShadowCoreV25LayoutPermissionsMiniStatus();
}

function setupShadowCoreV25LayoutPermissionsMiniStatus() {
  var props = v25SetupProps_();
  var sheets = v25SetupSheetDefs_();
  var ss = ss_();
  var missing = [];
  sheets.forEach(function(d){ if (!ss.getSheetByName(d.name)) missing.push(d.name); });
  var roleRows = ss.getSheetByName(APP.SHEETS.ROLE_PERMISSIONS) ? Math.max(0, ss.getSheetByName(APP.SHEETS.ROLE_PERMISSIONS).getLastRow() - 1) : 0;
  var presetRows = ss.getSheetByName(APP.SHEETS.LAYOUT_PRESETS) ? Math.max(0, ss.getSheetByName(APP.SHEETS.LAYOUT_PRESETS).getLastRow() - 1) : 0;
  var phase = props.getProperty('V25_SETUP_PHASE') || 'sheets';
  var complete = missing.length === 0 && roleRows >= v25PageDefs_().length && presetRows >= 6;
  return {
    ok: true,
    version: '2.5.1',
    complete: complete,
    phase: phase,
    missing_sheets: missing,
    missing_count: missing.length,
    permission_rows: roleRows,
    expected_permission_rows: v25PageDefs_().length,
    preset_rows: presetRows,
    sheet_index: Number(props.getProperty('V25_SETUP_SHEET_INDEX') || 0),
    permission_index: Number(props.getProperty('V25_SETUP_PERMISSION_INDEX') || 0),
    preset_index: Number(props.getProperty('V25_SETUP_PRESET_INDEX') || 0)
  };
}

function setupShadowCoreV25LayoutPermissionsMiniNext() {
  var props = v25SetupProps_();
  var phase = props.getProperty('V25_SETUP_PHASE') || 'sheets';
  if (phase === 'sheets') return v25SetupNextSheet_();
  if (phase === 'permissions') return v25SetupNextPermission_();
  if (phase === 'presets') return v25SetupNextPreset_();
  return setupShadowCoreV25LayoutPermissionsMiniStatus();
}

function v25SetupNextSheet_() {
  var props = v25SetupProps_();
  var defs = v25SetupSheetDefs_();
  var idx = Number(props.getProperty('V25_SETUP_SHEET_INDEX') || 0);
  if (idx >= defs.length) {
    props.setProperty('V25_SETUP_PHASE', 'permissions');
    props.setProperty('V25_SETUP_PERMISSION_INDEX', props.getProperty('V25_SETUP_PERMISSION_INDEX') || '0');
    return setupShadowCoreV25LayoutPermissionsMiniStatus();
  }
  var d = defs[idx];
  v25EnsureSheetLight_(d.name, d.headers);
  props.setProperty('V25_SETUP_SHEET_INDEX', String(idx + 1));
  if (idx + 1 >= defs.length) props.setProperty('V25_SETUP_PHASE', 'permissions');
  return {ok:true, version:'2.5.1', step:'sheet', index:idx + 1, sheet:d.name, next_status:setupShadowCoreV25LayoutPermissionsMiniStatus()};
}

function v25EnsureSheetLight_(name, headers) {
  var spreadsheet = ss_();
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  // Keep this intentionally light: no clear(), no freeze, no formatting.
  var first = sheet.getRange(1, 1).getValue();
  if (!first) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    var missing = headers.filter(function(h){ return current.indexOf(String(h)) === -1; });
    if (missing.length) sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

function v25SetupNextPermission_() {
  var props = v25SetupProps_();
  v25EnsureSheetLight_(APP.SHEETS.ROLE_PERMISSIONS, HEADERS[APP.SHEETS.ROLE_PERMISSIONS]);
  var defs = v25PageDefs_();
  var idx = Number(props.getProperty('V25_SETUP_PERMISSION_INDEX') || 0);
  if (idx >= defs.length) {
    props.setProperty('V25_SETUP_PHASE', 'presets');
    props.setProperty('V25_SETUP_PRESET_INDEX', props.getProperty('V25_SETUP_PRESET_INDEX') || '0');
    return setupShadowCoreV25LayoutPermissionsMiniStatus();
  }
  v25SeedPermissionFast_(defs[idx]);
  props.setProperty('V25_SETUP_PERMISSION_INDEX', String(idx + 1));
  if (idx + 1 >= defs.length) props.setProperty('V25_SETUP_PHASE', 'presets');
  return {ok:true, version:'2.5.1', step:'permission', index:idx + 1, page:defs[idx].Page_Key, next_status:setupShadowCoreV25LayoutPermissionsMiniStatus()};
}

function v25SeedPermissionFast_(p) {
  var sheet = v25EnsureSheetLight_(APP.SHEETS.ROLE_PERMISSIONS, HEADERS[APP.SHEETS.ROLE_PERMISSIONS]);
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(String);
  var keyCol = headers.indexOf('Page_Key');
  var target = -1;
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][keyCol]) === String(p.Page_Key)) { target = r + 1; break; }
  }
  if (target > -1) return;
  var rowObj = {Page_Key:p.Page_Key, Label:p.Label, Category:p.Category, Min_Role:p.Default_Min_Role, Enabled:'TRUE', Admin_Locked:'FALSE', Notes:'Seeded v2.5.1 default', Updated:nowIso_()};
  var row = headers.map(function(h){ return rowObj[h] !== undefined ? rowObj[h] : ''; });
  sheet.appendRow(row);
}

function v25PresetDefs_() {
  return [
    ['War Member Layout','War-focused member homepage','mylife,mobile,war,targets,chain,chainplan,payouts,requests,revives,factionneeds,knowledge','assignment,warReadiness,payouts,support,chain,advisor','MEMBER','TRUE'],
    ['New Player Layout','Onboarding and learning first','mylife,onboarding,knowledge,training,gymgains,availabilitycal,mentors,scannerinstall,requests,revives','onboarding,training,scanner,knowledge,support','MEMBER','TRUE'],
    ['Officer Layout','Leadership and management tools','dashboard,war,targets,battleplan,warcountdown,payouts,treasury,loans,revives,vetting,discipline,tasks,rulescheck,visuals,recommendations,advisor,coachingqueue','war,requests,applications,coaching,economy,visuals','OFFICER','TRUE'],
    ['Gym / Training Layout','Training and gains planning','mylife,training,gymgains,GymGainComparison,GymGainProjectionView,GymGoalEstimatorView,knowledge,mentors,membereducation','training,gym,goals,advisor','MEMBER','TRUE'],
    ['Recruiter Layout','Recruiting and applicant flow','microsite,recruiting,vetting,scannerdeep,advisor,coachingqueue,knowledge,bbcode','applications,leads,vetting,html','OFFICER','TRUE'],
    ['Leader Layout','Full command view','dashboard,admin,diagnostics,settings,war,warcountdown,visuals,recommendations,treasury,loans,tokens,permissions,layout,backups,safemode','status,war,economy,risks,admin','LEADER','TRUE']
  ];
}

function v25SetupNextPreset_() {
  var props = v25SetupProps_();
  v25EnsureSheetLight_(APP.SHEETS.LAYOUT_PRESETS, HEADERS[APP.SHEETS.LAYOUT_PRESETS]);
  var presets = v25PresetDefs_();
  var idx = Number(props.getProperty('V25_SETUP_PRESET_INDEX') || 0);
  if (idx >= presets.length) {
    props.setProperty('V25_SETUP_PHASE', 'complete');
    try { logAudit_('system', 'setupShadowCoreV25LayoutPermissionsMini', 'Installed v2.5.1 layout + permissions sheets.'); } catch (err) {}
    return setupShadowCoreV25LayoutPermissionsMiniStatus();
  }
  v25SeedPresetFast_(presets[idx]);
  props.setProperty('V25_SETUP_PRESET_INDEX', String(idx + 1));
  if (idx + 1 >= presets.length) props.setProperty('V25_SETUP_PHASE', 'complete');
  return {ok:true, version:'2.5.1', step:'preset', index:idx + 1, preset:presets[idx][0], next_status:setupShadowCoreV25LayoutPermissionsMiniStatus()};
}

function v25SeedPresetFast_(p) {
  var sheet = v25EnsureSheetLight_(APP.SHEETS.LAYOUT_PRESETS, HEADERS[APP.SHEETS.LAYOUT_PRESETS]);
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(String);
  var keyCol = headers.indexOf('Preset_Name');
  var target = -1;
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][keyCol]) === String(p[0])) { target = r + 1; break; }
  }
  var rowObj = {Preset_Name:p[0], Description:p[1], Visible_Pages:p[2], Homepage_Cards:p[3], Role_Target:p[4], Active:p[5], Updated:nowIso_()};
  var row = headers.map(function(h){ return rowObj[h] !== undefined ? rowObj[h] : ''; });
  if (target > -1) sheet.getRange(target, 1, 1, headers.length).setValues([row]);
  else sheet.appendRow(row);
}

function setupShadowCoreV25LayoutPermissionsSheet01() { return v25SetupSpecificSheet_(0); }
function setupShadowCoreV25LayoutPermissionsSheet02() { return v25SetupSpecificSheet_(1); }
function setupShadowCoreV25LayoutPermissionsSheet03() { return v25SetupSpecificSheet_(2); }
function setupShadowCoreV25LayoutPermissionsSheet04() { return v25SetupSpecificSheet_(3); }
function setupShadowCoreV25LayoutPermissionsSheet05() { return v25SetupSpecificSheet_(4); }
function v25SetupSpecificSheet_(idx) { var d = v25SetupSheetDefs_()[idx]; v25EnsureSheetLight_(d.name, d.headers); return {ok:true, sheet:d.name}; }


function v25SeedPermissions_() {
  v25PageDefs_().forEach(function(p){
    var existing = v25FindRolePermission_(p.Page_Key);
    if (!existing) {
      upsertRowByKey_(APP.SHEETS.ROLE_PERMISSIONS, 'Page_Key', p.Page_Key, {
        Page_Key:p.Page_Key, Label:p.Label, Category:p.Category, Min_Role:p.Default_Min_Role, Enabled:'TRUE', Admin_Locked:'FALSE', Notes:'Seeded v2.5 default', Updated:nowIso_()
      });
    }
  });
}

function v25SeedPresets_() {
  v25PresetDefs_().forEach(function(p){
    upsertRowByKey_(APP.SHEETS.LAYOUT_PRESETS, 'Preset_Name', p[0], {
      Preset_Name:p[0], Description:p[1], Visible_Pages:p[2], Homepage_Cards:p[3], Role_Target:p[4], Active:p[5], Updated:nowIso_()
    });
  });
}

function v25FindRolePermission_(pageKey) {
  var rows = readTable_(APP.SHEETS.ROLE_PERMISSIONS);
  for (var i=0;i<rows.length;i++) if (String(rows[i].Page_Key) === String(pageKey)) return rows[i];
  return null;
}

function getV25State_(session) {
  session = session || null;
  var pages = v25PageDefs_();
  var perms = readTable_(APP.SHEETS.ROLE_PERMISSIONS);
  if (!perms.length) perms = pages.map(function(p){return {Page_Key:p.Page_Key, Label:p.Label, Category:p.Category, Min_Role:p.Default_Min_Role, Enabled:'TRUE', Admin_Locked:'FALSE'};});
  var presets = readTable_(APP.SHEETS.LAYOUT_PRESETS).filter(function(p){return String(p.Active||'TRUE').toUpperCase() !== 'FALSE';});
  var pref = session ? v25GetUserPreference_(session.tornId, session.name) : null;
  var allowed = session ? v25EffectivePagesForSession_(session, perms, pref) : v25PublicPages_(perms);
  return {
    pages: pages,
    rolePermissions: perms,
    presets: presets,
    preferences: pref,
    allowedPages: allowed,
    currentRole: session ? session.role : 'PUBLIC',
    currentRoleValue: session ? session.roleValue : 0,
    defaultPage: pref ? (pref.Default_Page || 'dashboard') : 'dashboard'
  };
}

function v25GetUserPreference_(tornId, name) {
  tornId = String(tornId || '');
  if (!tornId) return null;
  var rows = readTable_(APP.SHEETS.USER_PREFERENCES);
  var found = null;
  rows.forEach(function(r){ if (String(r.Torn_ID) === tornId) found = r; });
  if (!found) {
    found = {Torn_ID:tornId, Name:name||'', Hidden_Pages:'', Collapsed_Sections:'', Default_Page:'dashboard', Homepage_Cards:'', Theme:'default', Updated:nowIso_(), Notes:''};
    upsertRowByKey_(APP.SHEETS.USER_PREFERENCES, 'Torn_ID', tornId, found);
  }
  return found;
}

function v25PublicPages_(perms) {
  return perms.filter(function(p){return String(p.Enabled||'TRUE').toUpperCase() !== 'FALSE' && roleValue_(p.Min_Role || 'PUBLIC') <= 0;})
    .map(function(p){return p.Page_Key;});
}

function v25EffectivePagesForSession_(session, perms, pref) {
  var rv = Number(session.roleValue || 0);
  var isAdmin = rv >= APP.ROLES.LEADER || String(session.role || '').toUpperCase() === 'LEADER' || String(session.role || '').toUpperCase() === 'DEVELOPER' || String(session.role || '').toUpperCase() === 'ADMIN';
  var hidden = isAdmin ? {} : v25CsvToSet_(pref && pref.Hidden_Pages);
  var out = [];
  var critical = v25CriticalAdminPages_();
  perms.forEach(function(p){
    var key = String(p.Page_Key || '');
    var disabled = String(p.Enabled||'TRUE').toUpperCase() === 'FALSE';
    // Leader/Admin token sessions must not be able to lock themselves out of core admin tools.
    if (disabled && !(isAdmin && critical[key])) return;
    if (!isAdmin && rv < roleValue_(p.Min_Role || 'PUBLIC')) return;
    if (hidden[key]) return;
    out.push(key);
  });
  if (out.indexOf('layout') === -1 && rv >= APP.ROLES.MEMBER) out.push('layout');
  if (isAdmin) {
    Object.keys(critical).forEach(function(k){ if (out.indexOf(k) === -1) out.push(k); });
  }
  return out;
}

function v25CriticalAdminPages_() {
  var keys = ['permissions','layout','settings','admin','authdebug','diagnostics','setup','safemode','backups','updates','tokens','protection','manual','theme'];
  var out = {};
  keys.forEach(function(k){ out[k] = true; });
  return out;
}

function repairV25AdminBypassPermissions() {
  var session = null;
  try { /* callable from client without args, but still safe */ } catch(e) {}
  v25EnsureSheetLight_(APP.SHEETS.ROLE_PERMISSIONS, HEADERS[APP.SHEETS.ROLE_PERMISSIONS]);
  var critical = v25CriticalAdminPages_();
  var defs = v25PageDefs_();
  var byKey = {};
  defs.forEach(function(d){ byKey[d.Page_Key] = d; });
  Object.keys(critical).forEach(function(k){
    var d = byKey[k] || {Page_Key:k, Label:k, Category:'Admin', Default_Min_Role:'LEADER'};
    upsertRowByKey_(APP.SHEETS.ROLE_PERMISSIONS, 'Page_Key', k, {
      Page_Key:k,
      Label:d.Label || k,
      Category:d.Category || 'Admin',
      Min_Role:'LEADER',
      Enabled:'TRUE',
      Admin_Locked:'FALSE',
      Notes:'v2.6.3 admin bypass repair - leaders/admin token cannot be locked out',
      Updated:nowIso_()
    });
  });
  try { logAudit_('system', 'repairV25AdminBypassPermissions', 'Repaired critical v2.5 admin permission rows.'); } catch(e) {}
  return {ok:true, repaired:Object.keys(critical)};
}

function v25CsvToSet_(csv) {
  var s = {};
  String(csv || '').split(',').map(function(x){return x.trim();}).filter(Boolean).forEach(function(x){s[x]=true;});
  return s;
}

function updateV25UserPreferences(sessionId, prefs) {
  var session = requireSession_(sessionId);
  prefs = prefs || {};
  var current = v25GetUserPreference_(session.tornId, session.name);
  var row = {
    Torn_ID: session.tornId,
    Name: session.name,
    Hidden_Pages: prefs.Hidden_Pages !== undefined ? String(prefs.Hidden_Pages || '') : String(current.Hidden_Pages || ''),
    Collapsed_Sections: prefs.Collapsed_Sections !== undefined ? String(prefs.Collapsed_Sections || '') : String(current.Collapsed_Sections || ''),
    Default_Page: prefs.Default_Page !== undefined ? String(prefs.Default_Page || 'dashboard') : String(current.Default_Page || 'dashboard'),
    Homepage_Cards: prefs.Homepage_Cards !== undefined ? String(prefs.Homepage_Cards || '') : String(current.Homepage_Cards || ''),
    Theme: prefs.Theme !== undefined ? String(prefs.Theme || 'default') : String(current.Theme || 'default'),
    Updated: nowIso_(),
    Notes: prefs.Notes !== undefined ? String(prefs.Notes || '') : String(current.Notes || '')
  };
  upsertRowByKey_(APP.SHEETS.USER_PREFERENCES, 'Torn_ID', session.tornId, row);
  logAudit_(session.name, 'updateV25UserPreferences', row);
  return {ok:true, preferences:row};
}

function applyV25LayoutPreset(sessionId, presetName) {
  var session = requireSession_(sessionId);
  var presets = readTable_(APP.SHEETS.LAYOUT_PRESETS);
  var preset = null;
  presets.forEach(function(p){ if (String(p.Preset_Name) === String(presetName)) preset = p; });
  if (!preset) throw new Error('Preset not found.');
  var visibleSet = v25CsvToSet_(preset.Visible_Pages || '');
  var all = v25PageDefs_().map(function(p){return p.Page_Key;});
  var hidden = all.filter(function(p){ return !visibleSet[p] && p !== 'layout'; }).join(',');
  return updateV25UserPreferences(sessionId, {Hidden_Pages:hidden, Homepage_Cards:preset.Homepage_Cards || '', Default_Page:'mylife', Notes:'Applied preset: '+presetName});
}

function resetV25MyLayout(sessionId) {
  return updateV25UserPreferences(sessionId, {Hidden_Pages:'', Collapsed_Sections:'', Default_Page:'dashboard', Homepage_Cards:'', Theme:'default', Notes:'Reset by user'});
}

function saveV25RolePermission(sessionId, pageKey, minRole, enabled) {
  var session = requireRole_(sessionId, 'LEADER');
  var def = v25PageDefs_().filter(function(p){return String(p.Page_Key) === String(pageKey);})[0] || {Page_Key:pageKey, Label:pageKey, Category:'Custom', Default_Min_Role:'LEADER'};
  var row = v25FindRolePermission_(pageKey) || {};
  if (String(row.Admin_Locked||'FALSE').toUpperCase() === 'TRUE' && session.roleValue < APP.ROLES.DEVELOPER) throw new Error('This page is admin locked.');
  row.Page_Key = pageKey;
  row.Label = def.Label || row.Label || pageKey;
  row.Category = def.Category || row.Category || 'Custom';
  row.Min_Role = roleName_(minRole || row.Min_Role || def.Default_Min_Role || 'MEMBER');
  row.Enabled = enabled === false || String(enabled).toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE';
  row.Admin_Locked = row.Admin_Locked || 'FALSE';
  row.Notes = row.Notes || '';
  row.Updated = nowIso_();
  upsertRowByKey_(APP.SHEETS.ROLE_PERMISSIONS, 'Page_Key', pageKey, row);
  logAudit_(session.name, 'saveV25RolePermission', row);
  return {ok:true, permission:row};
}

function saveV25DashboardLayout(sessionId, cardsCsv, defaultPage) {
  var session = requireSession_(sessionId);
  return updateV25UserPreferences(sessionId, {Homepage_Cards:String(cardsCsv||''), Default_Page:String(defaultPage||'dashboard')});
}

function v25CanAccessPage_(session, pageKey) {
  var perms = readTable_(APP.SHEETS.ROLE_PERMISSIONS);
  var p = null;
  perms.forEach(function(r){ if (String(r.Page_Key) === String(pageKey)) p = r; });
  if (!p) p = v25PageDefs_().filter(function(d){return d.Page_Key === pageKey;})[0] || {Min_Role:'MEMBER', Enabled:'TRUE'};
  if (String(p.Enabled||'TRUE').toUpperCase() === 'FALSE') return false;
  return Number(session.roleValue||0) >= roleValue_(p.Min_Role || p.Default_Min_Role || 'MEMBER');
}

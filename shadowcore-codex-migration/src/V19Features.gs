/**
 * ShadowCore HQ v1.9 - Ranked War 105-hour countdown enemy readiness monitor.
 *
 * Purpose:
 * - Monitor a selected Torn faction during the 105-hour ranked war countdown.
 * - Poll faction basic/member status at safe intervals.
 * - Store timestamped snapshots in Google Sheets.
 * - Generate member activity tables, activity heatmaps, landing watcher rows, and final reports.
 *
 * Safety:
 * - Read-only Torn API use.
 * - Default poll interval is 15 minutes.
 * - Triggers are optional and only poll active monitors that are due.
 */

var V19_VERSION = '1.9.0';
var V19_MONITOR_HOURS_DEFAULT = 105;
var V19_MIN_POLL_MINUTES = 5;
var V19_DEFAULT_POLL_MINUTES = 15;

var V19_SHEETS = {
  MONITORS: 'RWC_Monitors',
  MEMBERS: 'RWC_Members',
  SNAPSHOTS: 'RWC_Snapshots',
  HOURLY: 'RWC_Hourly_Activity',
  TRAVEL_WATCH: 'RWC_Travel_Watch',
  LANDING_EVENTS: 'RWC_Landing_Events',
  REPORTS: 'RWC_Reports',
  MEMBER_ACTIVITY_TABLE: 'MemberActivityTable',
  ACTIVITY_HEATMAP: 'ActivityHeatmap',
  REPORT_VIEW: 'WarReadinessReportView'
};

var V19_HEADERS = {};
V19_HEADERS[V19_SHEETS.MONITORS] = ['Monitor_ID','Faction_ID','Faction_Name','Status','Countdown_Start','War_Start_Estimate','Countdown_Hours','Poll_Interval_Minutes','Snapshot_Count','Last_Polled','Next_Poll_Due','Created_By','Created','Notes'];
V19_HEADERS[V19_SHEETS.MEMBERS] = ['Monitor_ID','Faction_ID','Torn_ID','Name','Level','Position','Days_In_Faction','Last_Seen_Status','Last_Seen_Description','Last_Action_Status','Last_Action_Timestamp','First_Seen','Last_Seen','Latest_Snapshot_ID','Notes'];
V19_HEADERS[V19_SHEETS.SNAPSHOTS] = ['Snapshot_ID','Monitor_ID','Timestamp','Torn_Time_Hour','Countdown_Hours_Remaining','Faction_ID','Faction_Name','Torn_ID','Name','Level','Position','Status_State','Status_Description','Status_Until','Last_Action_Status','Last_Action_Timestamp','Last_Action_Relative','Online_Flag','Active_Flag','Okay_Flag','Travel_Flag','Hospital_Flag','Jail_Flag','Abroad_Flag','Landing_Watch_Flag','Source'];
V19_HEADERS[V19_SHEETS.HOURLY] = ['Monitor_ID','Generated','Torn_Hour','Samples','Members_Seen','Online_Count','Active_Count','Okay_Count','Travel_Count','Hospital_Count','Jail_Count','Abroad_Count','Online_Rate','Active_Rate','Weakness_Score','Label'];
V19_HEADERS[V19_SHEETS.TRAVEL_WATCH] = ['Watch_ID','Monitor_ID','Faction_ID','Torn_ID','Name','First_Travel_Seen','Last_Travel_Seen','Travel_State','Travel_Description','Expected_Return','Return_Detected','Return_Timestamp','Current_State','Current_Description','Landing_Window','Notes'];
V19_HEADERS[V19_SHEETS.LANDING_EVENTS] = ['Event_ID','Monitor_ID','Timestamp','Faction_ID','Torn_ID','Name','Previous_State','Current_State','Travel_Description','Expected_Return','Landing_Window','Notes'];
V19_HEADERS[V19_SHEETS.REPORTS] = ['Report_ID','Monitor_ID','Generated','Faction_ID','Faction_Name','Countdown_Start','War_Start_Estimate','Snapshot_Count','Member_Count','Peak_Hours','Weakest_Hours','Suggested_Opening_Targets','Suggested_Avoid_List','Chain_Filler_Candidates','Markdown','Report_JSON'];
V19_HEADERS[V19_SHEETS.MEMBER_ACTIVITY_TABLE] = ['Monitor_ID','Generated','Torn_ID','Name','Level','Latest_Status','Latest_Description','Latest_Last_Action','Online_Pct','Active_Pct','Okay_Pct','Travel_Count','Hospital_Count','Jail_Count','Abroad_Count','Active_Hours_Torn','Online_Snapshots','Active_Snapshots','Total_Snapshots','Target_Window_Score','Role_Suggestion','Notes'];
V19_HEADERS[V19_SHEETS.ACTIVITY_HEATMAP] = ['Monitor_ID','Generated','Torn_Hour','Samples','Members_Seen','Online_Count','Active_Count','Okay_Count','Travel_Count','Hospital_Count','Jail_Count','Abroad_Count','Online_Rate','Active_Rate','Weakness_Score','Label'];
V19_HEADERS[V19_SHEETS.REPORT_VIEW] = ['Monitor_ID','Generated','Faction_ID','Faction_Name','Section','Sort','Title','Body','Data_JSON'];

function setupShadowCoreV19WarCountdownMonitor() {
  var keys = Object.keys(V19_HEADERS);
  for (var i = 0; i < keys.length; i++) {
    v19EnsureSheet_(keys[i], V19_HEADERS[keys[i]]);
    if (i % 3 === 2) SpreadsheetApp.flush();
  }
  seedV19Defaults_();
  logAudit_('system','setupShadowCoreV19WarCountdownMonitor',{version:V19_VERSION, sheets:keys.length});
  return {ok:true, version:V19_VERSION, sheets:keys.length, message:'Ranked War Countdown Monitor installed.'};
}

function setupShadowCoreV19WarCountdownMonitorMiniStatus() {
  var missing = [];
  Object.keys(V19_HEADERS).forEach(function(name){ if (!ss_().getSheetByName(name)) missing.push(name); });
  return {ok:true, version:V19_VERSION, missing_count:missing.length, missing:missing, complete:missing.length===0};
}

function setupShadowCoreV19WarCountdownMonitorMiniNext() {
  var props = getScriptProps_();
  var keys = Object.keys(V19_HEADERS);
  for (var i = 0; i < keys.length; i++) {
    var name = keys[i];
    if (!ss_().getSheetByName(name)) {
      v19EnsureSheet_(name, V19_HEADERS[name]);
      props.setProperty('V19_SETUP_LAST_SHEET', name);
      return {ok:true, complete:false, created:name, remaining:setupShadowCoreV19WarCountdownMonitorMiniStatus().missing_count};
    }
  }
  seedV19Defaults_();
  return {ok:true, complete:true, missing_count:0};
}

function setupShadowCoreV19WarCountdownMonitorSheet01(){return v19SetupSheetByIndex_(0);}
function setupShadowCoreV19WarCountdownMonitorSheet02(){return v19SetupSheetByIndex_(1);}
function setupShadowCoreV19WarCountdownMonitorSheet03(){return v19SetupSheetByIndex_(2);}
function setupShadowCoreV19WarCountdownMonitorSheet04(){return v19SetupSheetByIndex_(3);}
function setupShadowCoreV19WarCountdownMonitorSheet05(){return v19SetupSheetByIndex_(4);}
function setupShadowCoreV19WarCountdownMonitorSheet06(){return v19SetupSheetByIndex_(5);}
function setupShadowCoreV19WarCountdownMonitorSheet07(){return v19SetupSheetByIndex_(6);}
function setupShadowCoreV19WarCountdownMonitorSheet08(){return v19SetupSheetByIndex_(7);}
function setupShadowCoreV19WarCountdownMonitorSheet09(){return v19SetupSheetByIndex_(8);}
function setupShadowCoreV19WarCountdownMonitorSheet10(){return v19SetupSheetByIndex_(9);}

function v19SetupSheetByIndex_(idx) {
  var keys = Object.keys(V19_HEADERS);
  var name = keys[idx];
  if (!name) return {ok:false, error:'No v1.9 sheet at index '+idx};
  v19EnsureSheet_(name, V19_HEADERS[name]);
  return {ok:true, sheet:name};
}

function seedV19Defaults_() {
  var rows = [
    {Key:'RWC_Default_Countdown_Hours', Value:String(V19_MONITOR_HOURS_DEFAULT), Description:'Ranked war countdown length in hours.'},
    {Key:'RWC_Default_Poll_Minutes', Value:String(V19_DEFAULT_POLL_MINUTES), Description:'Default ranked-war monitor polling interval. Keep this safe; 15 minutes is recommended.'},
    {Key:'RWC_Max_Monitors_Per_Poll', Value:'2', Description:'Maximum active countdown monitors polled per trigger execution.'},
    {Key:'RWC_Enable_Discord_Report_Alerts', Value:'FALSE', Description:'TRUE to send Discord alerts when a final pre-war report is generated.'},
    {Key:'RWC_Landing_Window_Minutes', Value:'30', Description:'Landing Watcher window after expected return/return detection.'},
    {Key:'RWC_Min_Snapshots_For_Recommendations', Value:'3', Description:'Minimum snapshots per member before ranked-war recommendations are considered.'}
  ];
  try { upsertRowsByKey_(APP.SHEETS.SETTINGS, 'Key', rows); } catch (err) { logError_('seedV19Defaults_', err, {}); }
}

function v19EnsureSheet_(name, headers) {
  var spreadsheet = ss_();
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  var lastCol = Math.max(sheet.getLastColumn(), headers.length, 1);
  var current = sheet.getRange(1,1,1,lastCol).getValues()[0].map(String);
  var empty = current.join('') === '';
  if (empty || current[0] !== headers[0]) {
    sheet.clear();
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
  } else {
    var existing = current.filter(function(h){return h !== '';});
    var missing = headers.filter(function(h){return existing.indexOf(h) === -1;});
    if (missing.length) sheet.getRange(1, existing.length+1, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

function v19Headers_(sheetName) {
  var sheet = ss_().getSheetByName(sheetName);
  if (!sheet) v19EnsureSheet_(sheetName, V19_HEADERS[sheetName] || []);
  sheet = ss_().getSheetByName(sheetName);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1,1,1,lastCol).getValues()[0].map(String).filter(function(h){return h !== '';});
}

function v19AppendRows_(sheetName, objects) {
  objects = objects || [];
  if (!objects.length) return 0;
  var sheet = ss_().getSheetByName(sheetName) || v19EnsureSheet_(sheetName, V19_HEADERS[sheetName] || Object.keys(objects[0]));
  var headers = v19Headers_(sheetName);
  var rows = objects.map(function(obj){ return headers.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; }); });
  sheet.getRange(sheet.getLastRow()+1, 1, rows.length, headers.length).setValues(rows);
  return rows.length;
}

function v19Read_(sheetName, limit) {
  var sh = ss_().getSheetByName(sheetName);
  if (!sh) return [];
  return readTable_(sheetName, limit || 0);
}

function v19Iso_(d) {
  if (!d) return '';
  if (Object.prototype.toString.call(d) === '[object Date]') return d.toISOString();
  var dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toISOString();
}

function v19Date_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]') return value;
  var d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function v19HoursBetween_(a,b) {
  var da = v19Date_(a), db = v19Date_(b);
  if (!da || !db) return '';
  return Math.round((db.getTime() - da.getTime()) / 3600000 * 10) / 10;
}

function createV19RankedWarMonitorFromWeb(sessionId, config) {
  var session = requireRole_(sessionId, 'OFFICER');
  return createV19RankedWarMonitor_(config || {}, session.name || 'officer');
}

function createV19RankedWarMonitor(config) {
  return createV19RankedWarMonitor_(config || {}, Session.getActiveUser().getEmail() || 'manual');
}

function createV19RankedWarMonitor_(config, createdBy) {
  setupShadowCoreV19WarCountdownMonitorMiniNext();
  var factionId = String(config.factionId || config.Faction_ID || '').trim();
  if (!factionId) throw new Error('Enemy faction ID is required.');
  var factionName = String(config.factionName || config.Faction_Name || '').trim();
  var hours = Math.max(1, Math.min(200, Number(config.countdownHours || setting_('RWC_Default_Countdown_Hours', V19_MONITOR_HOURS_DEFAULT)) || V19_MONITOR_HOURS_DEFAULT));
  var pollMinutes = v19PollMinutes_(config.pollMinutes || setting_('RWC_Default_Poll_Minutes', V19_DEFAULT_POLL_MINUTES));
  var start = config.countdownStart ? v19Date_(config.countdownStart) : new Date();
  if (!start) start = new Date();
  var warStart = new Date(start.getTime() + hours * 3600000);
  var monitorId = 'RWC-' + Utilities.getUuid().slice(0,8).toUpperCase();
  var row = {
    Monitor_ID: monitorId,
    Faction_ID: factionId,
    Faction_Name: factionName,
    Status: 'Active',
    Countdown_Start: start.toISOString(),
    War_Start_Estimate: warStart.toISOString(),
    Countdown_Hours: hours,
    Poll_Interval_Minutes: pollMinutes,
    Snapshot_Count: 0,
    Last_Polled: '',
    Next_Poll_Due: new Date(Date.now() + 60000).toISOString(),
    Created_By: createdBy || 'system',
    Created: nowIso_(),
    Notes: config.notes || '105-hour ranked-war countdown monitor.'
  };
  upsertRowByKey_(V19_SHEETS.MONITORS, 'Monitor_ID', monitorId, row);
  logAudit_(createdBy || 'system','createV19RankedWarMonitor',row);
  return {ok:true, monitorId:monitorId, row:row};
}

function v19PollMinutes_(raw) {
  var n = Number(raw || V19_DEFAULT_POLL_MINUTES);
  if (isNaN(n)) n = V19_DEFAULT_POLL_MINUTES;
  if (n < V19_MIN_POLL_MINUTES) n = V19_MIN_POLL_MINUTES;
  if (n > 60) n = 60;
  // Apps Script time triggers support common values; monitoring logic still respects the row interval.
  return Math.round(n);
}

function pollV19RankedWarCountdownMonitorFromWeb(sessionId, monitorId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var result = pollV19RankedWarCountdownMonitor_(monitorId || '', {manual:true, by:session.name});
  logAudit_(session.name, 'pollV19RankedWarCountdownMonitorFromWeb', result);
  return result;
}

function pollRankedWarCountdownMonitors() {
  if (boolSetting_('Safe_Mode', false)) return {ok:false, safeMode:true};
  setupShadowCoreV19WarCountdownMonitorMiniNext();
  var monitors = v19Read_(V19_SHEETS.MONITORS, 500).filter(function(m){
    return String(m.Status || '').toLowerCase() === 'active';
  });
  var max = Math.max(1, Number(setting_('RWC_Max_Monitors_Per_Poll','2')) || 2);
  var now = new Date();
  var polled = [];
  for (var i = 0; i < monitors.length && polled.length < max; i++) {
    var due = !monitors[i].Next_Poll_Due || (v19Date_(monitors[i].Next_Poll_Due) && v19Date_(monitors[i].Next_Poll_Due).getTime() <= now.getTime());
    var end = v19Date_(monitors[i].War_Start_Estimate);
    if (end && end.getTime() < now.getTime()) {
      monitors[i].Status = 'Report Due';
      upsertRowByKey_(V19_SHEETS.MONITORS, 'Monitor_ID', monitors[i].Monitor_ID, monitors[i]);
      continue;
    }
    if (due) polled.push(pollV19RankedWarCountdownMonitor_(monitors[i].Monitor_ID, {manual:false, by:'trigger'}));
  }
  return {ok:true, polled:polled.length, results:polled};
}

function pollV19RankedWarCountdownMonitor_(monitorId, options) {
  options = options || {};
  var monitor = v19FindMonitor_(monitorId);
  if (!monitor) throw new Error('Monitor not found.');
  var factionId = String(monitor.Faction_ID || '').trim();
  if (!factionId) throw new Error('Monitor has no faction ID.');
  var fetched = v19FetchFactionBasic_(factionId);
  var factionName = v19FactionName_(fetched) || monitor.Faction_Name || ('Faction ' + factionId);
  var members = v19ExtractFactionMembers_(fetched);
  var ts = nowIso_();
  var hour = new Date(ts).getUTCHours();
  var remaining = v19HoursBetween_(ts, monitor.War_Start_Estimate);
  var rows = [];
  var memberRows = [];
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var snapId = 'SNP-' + Utilities.getUuid().slice(0,8).toUpperCase();
    var flags = v19StatusFlags_(m);
    rows.push({
      Snapshot_ID: snapId,
      Monitor_ID: monitor.Monitor_ID,
      Timestamp: ts,
      Torn_Time_Hour: hour,
      Countdown_Hours_Remaining: remaining,
      Faction_ID: factionId,
      Faction_Name: factionName,
      Torn_ID: m.tornId,
      Name: m.name,
      Level: m.level,
      Position: m.position,
      Status_State: m.statusState,
      Status_Description: m.statusDescription,
      Status_Until: m.statusUntil,
      Last_Action_Status: m.lastActionStatus,
      Last_Action_Timestamp: m.lastActionTimestamp,
      Last_Action_Relative: m.lastActionRelative,
      Online_Flag: flags.online ? 1 : 0,
      Active_Flag: flags.active ? 1 : 0,
      Okay_Flag: flags.okay ? 1 : 0,
      Travel_Flag: flags.travel ? 1 : 0,
      Hospital_Flag: flags.hospital ? 1 : 0,
      Jail_Flag: flags.jail ? 1 : 0,
      Abroad_Flag: flags.abroad ? 1 : 0,
      Landing_Watch_Flag: (flags.travel || flags.abroad) ? 1 : 0,
      Source: options.manual ? 'Manual Poll' : 'Trigger Poll'
    });
    memberRows.push({
      Monitor_ID: monitor.Monitor_ID,
      Faction_ID: factionId,
      Torn_ID: m.tornId,
      Name: m.name,
      Level: m.level,
      Position: m.position,
      Days_In_Faction: m.daysInFaction,
      Last_Seen_Status: m.statusState,
      Last_Seen_Description: m.statusDescription,
      Last_Action_Status: m.lastActionStatus,
      Last_Action_Timestamp: m.lastActionTimestamp,
      First_Seen: '',
      Last_Seen: ts,
      Latest_Snapshot_ID: snapId,
      Notes: ''
    });
  }
  var written = v19AppendRows_(V19_SHEETS.SNAPSHOTS, rows);
  v19UpsertMembersFast_(memberRows, ts);
  v19UpdateLandingWatcher_(monitor, rows);
  monitor.Faction_Name = factionName;
  monitor.Last_Polled = ts;
  monitor.Next_Poll_Due = new Date(Date.now() + v19PollMinutes_(monitor.Poll_Interval_Minutes) * 60000).toISOString();
  monitor.Snapshot_Count = Number(monitor.Snapshot_Count || 0) + written;
  upsertRowByKey_(V19_SHEETS.MONITORS, 'Monitor_ID', monitor.Monitor_ID, monitor);
  logAudit_(options.by || 'system','pollV19RankedWarCountdownMonitor',{monitor:monitor.Monitor_ID, factionId:factionId, members:members.length, snapshots:written});
  return {ok:true, monitorId:monitor.Monitor_ID, factionId:factionId, factionName:factionName, members:members.length, snapshots:written, nextPollDue:monitor.Next_Poll_Due};
}

function v19FetchFactionBasic_(factionId) {
  return tornRequest_('faction', factionId, 'basic', getFactionLeaderKey_(), {}, {bypassLocalCache:true});
}

function v19FactionName_(data) {
  if (!data) return '';
  return data.name || data.faction_name || (data.faction && (data.faction.name || data.faction.Name)) || (data.basic && data.basic.name) || '';
}

function v19ExtractFactionMembers_(data) {
  var raw = (data && (data.members || (data.faction && data.faction.members) || (data.basic && data.basic.members))) || {};
  var out = [];
  if (Array.isArray(raw)) {
    raw.forEach(function(m){ out.push(v19NormalizeMember_(m.id || m.player_id || m.user_id || m.Torn_ID, m)); });
  } else {
    Object.keys(raw).forEach(function(id){ out.push(v19NormalizeMember_(id, raw[id])); });
  }
  return out.filter(function(m){ return m.tornId; });
}

function v19NormalizeMember_(id, m) {
  m = m || {};
  var last = m.last_action || m.lastAction || m.last_action_status || {};
  var st = m.status || m.current_status || {};
  if (typeof st === 'string') st = {state:st, description:st};
  if (typeof last === 'string') last = {status:last};
  return {
    tornId: String(id || m.id || m.player_id || m.user_id || m.Torn_ID || ''),
    name: m.name || m.player_name || m.Name || '',
    level: m.level || m.Level || '',
    position: m.position || m.rank || m.Position || '',
    daysInFaction: m.days_in_faction || m.daysInFaction || '',
    statusState: st.state || st.status || st.Status || '',
    statusDescription: st.description || st.details || st.Description || '',
    statusUntil: st.until || st.Until || '',
    lastActionStatus: last.status || last.Status || '',
    lastActionTimestamp: last.timestamp || last.Timestamp || '',
    lastActionRelative: last.relative || last.Relative || ''
  };
}

function v19StatusFlags_(m) {
  var state = String(m.statusState || '').toLowerCase();
  var desc = String(m.statusDescription || '').toLowerCase();
  var text = state + ' ' + desc;
  var last = String(m.lastActionStatus || '').toLowerCase();
  var travel = /travel|travelling|flying|returning|departing|abroad|overseas/.test(text);
  var abroad = /abroad|mexico|cayman|canada|hawaii|uk|united kingdom|argentina|switzerland|japan|china|uae|south africa/.test(text) || /abroad/.test(state);
  var hospital = /hospital/.test(text) || state === 'hospital';
  var jail = /jail|jailed/.test(text) || state === 'jail';
  var okay = !travel && !hospital && !jail && (/okay|ok|normal/.test(text) || state === '' || state === 'okay');
  var online = /online/.test(last);
  var active = online || /idle/.test(last);
  return {travel:travel, abroad:abroad, hospital:hospital, jail:jail, okay:okay, online:online, active:active};
}

function v19FindMonitor_(monitorId) {
  var monitors = v19Read_(V19_SHEETS.MONITORS, 500);
  if (monitorId) {
    for (var i=0;i<monitors.length;i++) if (String(monitors[i].Monitor_ID) === String(monitorId)) return monitors[i];
  }
  var active = monitors.filter(function(m){ return /active|report due/i.test(String(m.Status||'')); });
  return active.length ? active[active.length-1] : (monitors.length ? monitors[monitors.length-1] : null);
}

function v19UpsertMembersFast_(memberRows, timestamp) {
  if (!memberRows.length) return 0;
  var sheet = ss_().getSheetByName(V19_SHEETS.MEMBERS) || v19EnsureSheet_(V19_SHEETS.MEMBERS, V19_HEADERS[V19_SHEETS.MEMBERS]);
  var headers = v19Headers_(V19_SHEETS.MEMBERS);
  var values = sheet.getDataRange().getValues();
  var keyColM = headers.indexOf('Monitor_ID');
  var keyColT = headers.indexOf('Torn_ID');
  var existing = {};
  for (var r=1;r<values.length;r++) existing[String(values[r][keyColM]) + '|' + String(values[r][keyColT])] = r+1;
  var toAppend = [];
  memberRows.forEach(function(obj){
    var key = String(obj.Monitor_ID)+'|'+String(obj.Torn_ID);
    var rowIndex = existing[key];
    if (rowIndex) {
      var firstSeenCol = headers.indexOf('First_Seen');
      if (!obj.First_Seen && firstSeenCol > -1) obj.First_Seen = sheet.getRange(rowIndex, firstSeenCol+1).getValue() || timestamp;
      var row = headers.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; });
      sheet.getRange(rowIndex,1,1,headers.length).setValues([row]);
    } else {
      obj.First_Seen = timestamp;
      toAppend.push(obj);
    }
  });
  if (toAppend.length) v19AppendRows_(V19_SHEETS.MEMBERS, toAppend);
  return memberRows.length;
}

function v19UpdateLandingWatcher_(monitor, snapshotRows) {
  if (!snapshotRows.length) return {ok:true, updated:0};
  var existing = v19Read_(V19_SHEETS.TRAVEL_WATCH, 2000);
  var map = {};
  existing.forEach(function(w){ map[String(w.Monitor_ID)+'|'+String(w.Torn_ID)] = w; });
  var updated = 0;
  var events = [];
  snapshotRows.forEach(function(s){
    var key = String(s.Monitor_ID)+'|'+String(s.Torn_ID);
    var current = map[key];
    var isTravel = Number(s.Travel_Flag || 0) || Number(s.Abroad_Flag || 0);
    if (isTravel) {
      var row = current || {Watch_ID:'LW-'+Utilities.getUuid().slice(0,8).toUpperCase(), Monitor_ID:s.Monitor_ID, Faction_ID:s.Faction_ID, Torn_ID:s.Torn_ID, Name:s.Name, First_Travel_Seen:s.Timestamp};
      row.Last_Travel_Seen = s.Timestamp;
      row.Travel_State = s.Status_State;
      row.Travel_Description = s.Status_Description;
      row.Expected_Return = s.Status_Until;
      row.Return_Detected = row.Return_Detected || '';
      row.Return_Timestamp = row.Return_Timestamp || '';
      row.Current_State = s.Status_State;
      row.Current_Description = s.Status_Description;
      row.Landing_Window = v19LandingWindow_(s.Status_Until || s.Timestamp);
      row.Notes = row.Notes || '';
      upsertRowByKey_(V19_SHEETS.TRAVEL_WATCH, 'Watch_ID', row.Watch_ID, row);
      map[key] = row;
      updated++;
    } else if (current && !current.Return_Detected && /travel|abroad|fly|return/i.test(String(current.Travel_State)+' '+String(current.Travel_Description))) {
      current.Return_Detected = 'TRUE';
      current.Return_Timestamp = s.Timestamp;
      current.Current_State = s.Status_State;
      current.Current_Description = s.Status_Description;
      current.Landing_Window = v19LandingWindow_(s.Timestamp);
      upsertRowByKey_(V19_SHEETS.TRAVEL_WATCH, 'Watch_ID', current.Watch_ID, current);
      events.push({Event_ID:'LAND-'+Utilities.getUuid().slice(0,8).toUpperCase(), Monitor_ID:s.Monitor_ID, Timestamp:s.Timestamp, Faction_ID:s.Faction_ID, Torn_ID:s.Torn_ID, Name:s.Name, Previous_State:current.Travel_State, Current_State:s.Status_State, Travel_Description:current.Travel_Description, Expected_Return:current.Expected_Return, Landing_Window:current.Landing_Window, Notes:'Landing Watcher detected return from travel/abroad.'});
      updated++;
    }
  });
  if (events.length) v19AppendRows_(V19_SHEETS.LANDING_EVENTS, events);
  return {ok:true, updated:updated, landingEvents:events.length};
}

function v19LandingWindow_(base) {
  var d = v19Date_(base);
  if (!d) return '';
  var mins = Math.max(5, Number(setting_('RWC_Landing_Window_Minutes','30')) || 30);
  return d.toISOString() + ' to ' + new Date(d.getTime() + mins*60000).toISOString();
}

function generateV19WarReadinessReportFromWeb(sessionId, monitorId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var out = generateV19WarReadinessReport(monitorId || '');
  logAudit_(session.name, 'generateV19WarReadinessReportFromWeb', {monitorId:out.monitorId, reportId:out.reportId});
  return out;
}

function generateV19WarReadinessReport(monitorId) {
  var monitor = v19FindMonitor_(monitorId);
  if (!monitor) throw new Error('No ranked-war countdown monitor found.');
  var all = v19Read_(V19_SHEETS.SNAPSHOTS, 50000).filter(function(s){ return String(s.Monitor_ID) === String(monitor.Monitor_ID); });
  if (!all.length) throw new Error('No snapshots yet for this monitor. Poll the faction first.');
  var report = v19AnalyzeSnapshots_(monitor, all);
  var generated = nowIso_();
  var reportId = 'RPT-' + Utilities.getUuid().slice(0,8).toUpperCase();
  v19ClearMonitorRows_(V19_SHEETS.MEMBER_ACTIVITY_TABLE, monitor.Monitor_ID);
  v19ClearMonitorRows_(V19_SHEETS.ACTIVITY_HEATMAP, monitor.Monitor_ID);
  v19ClearMonitorRows_(V19_SHEETS.REPORT_VIEW, monitor.Monitor_ID);
  var memberRows = report.memberActivityTable.map(function(r){ r.Monitor_ID=monitor.Monitor_ID; r.Generated=generated; return r; });
  var heatRows = report.heatmap.map(function(r){ r.Monitor_ID=monitor.Monitor_ID; r.Generated=generated; return r; });
  var viewRows = [];
  report.sections.forEach(function(sec, idx){ viewRows.push({Monitor_ID:monitor.Monitor_ID, Generated:generated, Faction_ID:monitor.Faction_ID, Faction_Name:report.factionOverview.name, Section:sec.key, Sort:idx+1, Title:sec.title, Body:sec.body, Data_JSON:safeJson_(sec.data || {})}); });
  v19AppendRows_(V19_SHEETS.MEMBER_ACTIVITY_TABLE, memberRows);
  v19AppendRows_(V19_SHEETS.ACTIVITY_HEATMAP, heatRows);
  v19AppendRows_(V19_SHEETS.REPORT_VIEW, viewRows);
  var row = {Report_ID:reportId, Monitor_ID:monitor.Monitor_ID, Generated:generated, Faction_ID:monitor.Faction_ID, Faction_Name:report.factionOverview.name, Countdown_Start:monitor.Countdown_Start, War_Start_Estimate:monitor.War_Start_Estimate, Snapshot_Count:all.length, Member_Count:report.factionOverview.memberCount, Peak_Hours:report.peakHours.join(', '), Weakest_Hours:report.weakestHours.join(', '), Suggested_Opening_Targets:report.openingTargets.map(function(x){return x.Name;}).join(', '), Suggested_Avoid_List:report.avoidList.map(function(x){return x.Name;}).join(', '), Chain_Filler_Candidates:report.chainFillers.map(function(x){return x.Name;}).join(', '), Markdown:report.markdown, Report_JSON:safeJson_(report)};
  appendRowObject_(V19_SHEETS.REPORTS, row);
  if (boolSetting_('RWC_Enable_Discord_Report_Alerts', false)) {
    try { sendDiscordAlert('War', '📊 Ranked-war countdown report generated for '+report.factionOverview.name+'\nPeak hours: '+row.Peak_Hours+'\nWeakest hours: '+row.Weakest_Hours, {}); } catch (err) { logError_('V19 Discord Report Alert', err, row); }
  }
  return {ok:true, reportId:reportId, monitorId:monitor.Monitor_ID, memberRows:memberRows.length, heatmapRows:heatRows.length, sections:viewRows.length};
}

function v19ClearMonitorRows_(sheetName, monitorId) {
  var sheet = ss_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return;
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(String);
  var monitorCol = headers.indexOf('Monitor_ID');
  if (monitorCol < 0) return;
  for (var r=data.length-1; r>=1; r--) {
    if (String(data[r][monitorCol]) === String(monitorId)) sheet.deleteRow(r+1);
  }
}

function v19AnalyzeSnapshots_(monitor, snapshots) {
  var byMember = {};
  var byHour = {};
  var latest = {};
  snapshots.forEach(function(s){
    var id = String(s.Torn_ID);
    if (!byMember[id]) byMember[id] = [];
    byMember[id].push(s);
    var h = Number(s.Torn_Time_Hour);
    if (isNaN(h)) h = new Date(s.Timestamp).getUTCHours();
    if (!byHour[h]) byHour[h] = [];
    byHour[h].push(s);
    if (!latest[id] || new Date(s.Timestamp).getTime() > new Date(latest[id].Timestamp).getTime()) latest[id] = s;
  });
  var minSnaps = Math.max(1, Number(setting_('RWC_Min_Snapshots_For_Recommendations','3')) || 3);
  var memberRows = Object.keys(byMember).map(function(id){
    var rows = byMember[id];
    rows.sort(function(a,b){ return new Date(a.Timestamp)-new Date(b.Timestamp); });
    var l = rows[rows.length-1];
    var total = rows.length;
    var online = v19Sum_(rows,'Online_Flag');
    var active = v19Sum_(rows,'Active_Flag');
    var okay = v19Sum_(rows,'Okay_Flag');
    var travel = v19Sum_(rows,'Travel_Flag');
    var hosp = v19Sum_(rows,'Hospital_Flag');
    var jail = v19Sum_(rows,'Jail_Flag');
    var abroad = v19Sum_(rows,'Abroad_Flag');
    var hours = {};
    rows.forEach(function(r){ if (Number(r.Active_Flag||0)) hours[String(r.Torn_Time_Hour)] = (hours[String(r.Torn_Time_Hour)]||0)+1; });
    var hourList = Object.keys(hours).sort(function(a,b){return hours[b]-hours[a];}).slice(0,5).map(function(h){return h+':00';});
    var onlinePct = total ? online/total : 0;
    var activePct = total ? active/total : 0;
    var okayPct = total ? okay/total : 0;
    var unavailablePct = total ? (travel+hosp+jail+abroad)/total : 0;
    var targetScore = total >= minSnaps ? Math.round(((1-activePct)*45 + okayPct*40 + (1-unavailablePct)*15) * 100) / 100 : 0;
    var role = 'Watch';
    if (total < minSnaps) role = 'Insufficient data';
    else if (Number(l.Travel_Flag||0) || Number(l.Abroad_Flag||0)) role = 'Landing Watch';
    else if (Number(l.Hospital_Flag||0) || Number(l.Jail_Flag||0)) role = 'Avoid until available';
    else if (targetScore >= 70) role = 'Suggested opening target';
    else if (targetScore >= 55) role = 'Chain filler candidate';
    else if (activePct >= 0.55) role = 'Avoid / very active';
    return {Torn_ID:id, Name:l.Name, Level:l.Level, Latest_Status:l.Status_State, Latest_Description:l.Status_Description, Latest_Last_Action:l.Last_Action_Status, Online_Pct:v19Pct_(onlinePct), Active_Pct:v19Pct_(activePct), Okay_Pct:v19Pct_(okayPct), Travel_Count:travel, Hospital_Count:hosp, Jail_Count:jail, Abroad_Count:abroad, Active_Hours_Torn:hourList.join(', '), Online_Snapshots:online, Active_Snapshots:active, Total_Snapshots:total, Target_Window_Score:targetScore, Role_Suggestion:role, Notes:''};
  });
  memberRows.sort(function(a,b){return Number(b.Target_Window_Score)-Number(a.Target_Window_Score);});
  var heatmap = [];
  for (var h=0; h<24; h++) {
    var hr = byHour[h] || [];
    var samples = hr.length;
    var membersSeen = v19UniqueCount_(hr,'Torn_ID');
    var onlineC = v19Sum_(hr,'Online_Flag');
    var activeC = v19Sum_(hr,'Active_Flag');
    var okayC = v19Sum_(hr,'Okay_Flag');
    var travelC = v19Sum_(hr,'Travel_Flag');
    var hospC = v19Sum_(hr,'Hospital_Flag');
    var jailC = v19Sum_(hr,'Jail_Flag');
    var abroadC = v19Sum_(hr,'Abroad_Flag');
    var onlineRate = samples ? onlineC/samples : 0;
    var activeRate = samples ? activeC/samples : 0;
    var weakness = samples ? Math.round(((1-activeRate)*70 + (okayC/samples)*30) * 100) / 100 : 0;
    heatmap.push({Torn_Hour:h, Samples:samples, Members_Seen:membersSeen, Online_Count:onlineC, Active_Count:activeC, Okay_Count:okayC, Travel_Count:travelC, Hospital_Count:hospC, Jail_Count:jailC, Abroad_Count:abroadC, Online_Rate:v19Pct_(onlineRate), Active_Rate:v19Pct_(activeRate), Weakness_Score:weakness, Label:h+':00 TCT'});
  }
  var peak = heatmap.slice().sort(function(a,b){return Number(b.Active_Rate.replace('%',''))-Number(a.Active_Rate.replace('%',''));}).filter(function(h){return h.Samples>0;}).slice(0,4).map(function(h){return h.Label;});
  var weak = heatmap.slice().sort(function(a,b){return Number(b.Weakness_Score)-Number(a.Weakness_Score);}).filter(function(h){return h.Samples>0;}).slice(0,4).map(function(h){return h.Label;});
  var opening = memberRows.filter(function(r){return r.Role_Suggestion === 'Suggested opening target';}).slice(0,15);
  var avoid = memberRows.filter(function(r){return /Avoid|very active|Landing/.test(String(r.Role_Suggestion));}).slice(0,15);
  var filler = memberRows.filter(function(r){return r.Role_Suggestion === 'Chain filler candidate';}).slice(0,15);
  var factionOverview = {id:monitor.Faction_ID, name:monitor.Faction_Name || ('Faction '+monitor.Faction_ID), memberCount:Object.keys(byMember).length, snapshotCount:snapshots.length, firstSnapshot:snapshots[0].Timestamp, lastSnapshot:snapshots[snapshots.length-1].Timestamp, warStartEstimate:monitor.War_Start_Estimate};
  var travelRows = v19Read_(V19_SHEETS.TRAVEL_WATCH,2000).filter(function(w){return String(w.Monitor_ID)===String(monitor.Monitor_ID);});
  var hospRows = memberRows.filter(function(r){return Number(r.Hospital_Count||0)>0;}).sort(function(a,b){return Number(b.Hospital_Count)-Number(a.Hospital_Count);}).slice(0,20);
  var sections = [
    {key:'overview', title:'Faction overview', body:v19OverviewText_(factionOverview), data:factionOverview},
    {key:'member_activity', title:'Member activity table', body:'Members are sorted by target-window score and activity consistency.', data:memberRows.slice(0,50)},
    {key:'peak_hours', title:'Peak activity hours', body:peak.length ? peak.join(', ') : 'No peak hours yet.', data:peak},
    {key:'weak_hours', title:'Weakest activity hours', body:weak.length ? weak.join(', ') : 'No weak hours yet.', data:weak},
    {key:'travel_patterns', title:'Travel patterns', body:travelRows.length ? travelRows.slice(-25).map(function(w){return w.Name+' → '+(w.Current_State||w.Travel_State)+' '+(w.Landing_Window||'');}).join('\n') : 'No travel patterns detected yet.', data:travelRows.slice(-50)},
    {key:'hospital_patterns', title:'Hospital patterns', body:hospRows.length ? hospRows.map(function(r){return r.Name+' hospital snapshots: '+r.Hospital_Count;}).join('\n') : 'No hospital pattern detected yet.', data:hospRows},
    {key:'online_consistency', title:'Online consistency', body:memberRows.slice().sort(function(a,b){return parseFloat(b.Active_Pct)-parseFloat(a.Active_Pct);}).slice(0,15).map(function(r){return r.Name+': '+r.Active_Pct+' active-ish';}).join('\n'), data:memberRows.slice(0,100)},
    {key:'opening_targets', title:'Suggested opening targets', body:opening.length ? opening.map(function(r){return r.Name+' ['+r.Torn_ID+'] score '+r.Target_Window_Score;}).join('\n') : 'No strong opening targets yet. Gather more snapshots.', data:opening},
    {key:'avoid_list', title:'Suggested avoid list', body:avoid.length ? avoid.map(function(r){return r.Name+' ['+r.Torn_ID+'] '+r.Role_Suggestion;}).join('\n') : 'No avoid list yet.', data:avoid},
    {key:'chain_fillers', title:'Chain filler candidates', body:filler.length ? filler.map(function(r){return r.Name+' ['+r.Torn_ID+'] score '+r.Target_Window_Score;}).join('\n') : 'No filler candidates yet.', data:filler},
    {key:'strategic_notes', title:'Strategic notes', body:v19StrategicNotes_(peak, weak, opening, avoid, filler, factionOverview), data:{}}
  ];
  return {version:V19_VERSION, factionOverview:factionOverview, memberActivityTable:memberRows, heatmap:heatmap, peakHours:peak, weakestHours:weak, openingTargets:opening, avoidList:avoid, chainFillers:filler, sections:sections, markdown:v19MarkdownReport_(sections)};
}

function v19Sum_(rows, field) { return rows.reduce(function(n,r){ return n + (Number(r[field]||0) || 0); },0); }
function v19UniqueCount_(rows, field) { var m={}; rows.forEach(function(r){ if(r[field]) m[String(r[field])]=1; }); return Object.keys(m).length; }
function v19Pct_(n) { return Math.round((Number(n)||0)*1000)/10 + '%'; }
function v19OverviewText_(o) { return ['Faction: '+o.name+' ['+o.id+']','Members seen: '+o.memberCount,'Snapshots: '+o.snapshotCount,'First snapshot: '+o.firstSnapshot,'Latest snapshot: '+o.lastSnapshot,'Estimated war start: '+o.warStartEstimate].join('\n'); }
function v19StrategicNotes_(peak, weak, opening, avoid, filler, overview) {
  var lines = [];
  lines.push('Monitor '+overview.name+' through the full 105-hour countdown before trusting recommendations.');
  if (weak.length) lines.push('Best broad pressure windows appear to be: '+weak.join(', ')+'.');
  if (peak.length) lines.push('Avoid major pushes during observed peak windows: '+peak.join(', ')+'.');
  if (opening.length) lines.push('Opening target pool is available; verify current status immediately before war begins.');
  if (avoid.length) lines.push('Avoid list includes very active or currently unavailable members; re-check at war start.');
  if (filler.length) lines.push('Chain filler list contains lower-consistency members that may be useful for safe chain building.');
  lines.push('Landing Watcher rows should be checked during the final hour for travelers returning right before war.');
  return lines.join('\n');
}
function v19MarkdownReport_(sections) {
  return sections.map(function(s){return '## '+s.title+'\n'+String(s.body||'');}).join('\n\n');
}

function getV19State_() {
  var monitors = v19Read_(V19_SHEETS.MONITORS, 200).slice(-100);
  var active = v19FindMonitor_('');
  var monitorId = active && active.Monitor_ID;
  var reports = v19Read_(V19_SHEETS.REPORTS, 100).filter(function(r){return !monitorId || String(r.Monitor_ID)===String(monitorId);}).slice(-20);
  var reportView = v19Read_(V19_SHEETS.REPORT_VIEW, 500).filter(function(r){return !monitorId || String(r.Monitor_ID)===String(monitorId);});
  return {
    version: V19_VERSION,
    monitors: monitors,
    activeMonitor: active,
    memberActivity: v19Read_(V19_SHEETS.MEMBER_ACTIVITY_TABLE, 500).filter(function(r){return !monitorId || String(r.Monitor_ID)===String(monitorId);}),
    heatmap: v19Read_(V19_SHEETS.ACTIVITY_HEATMAP, 200).filter(function(r){return !monitorId || String(r.Monitor_ID)===String(monitorId);}),
    reportView: reportView,
    reports: reports,
    travelWatch: v19Read_(V19_SHEETS.TRAVEL_WATCH, 500).filter(function(r){return !monitorId || String(r.Monitor_ID)===String(monitorId);}).slice(-100),
    landingEvents: v19Read_(V19_SHEETS.LANDING_EVENTS, 200).filter(function(r){return !monitorId || String(r.Monitor_ID)===String(monitorId);}).slice(-100),
    latestSnapshots: v19Read_(V19_SHEETS.SNAPSHOTS, 500).filter(function(r){return !monitorId || String(r.Monitor_ID)===String(monitorId);}).slice(-100)
  };
}

function installV19RankedWarCountdownTriggerFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'LEADER');
  var out = installV19RankedWarCountdownTrigger();
  logAudit_(session.name, 'installV19RankedWarCountdownTriggerFromWeb', out);
  return out;
}
function installV19RankedWarCountdownTrigger() {
  removeV19RankedWarCountdownTrigger();
  ScriptApp.newTrigger('pollRankedWarCountdownMonitors').timeBased().everyMinutes(15).create();
  return {ok:true, trigger:'pollRankedWarCountdownMonitors', intervalMinutes:15};
}
function removeV19RankedWarCountdownTriggerFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'LEADER');
  var out = removeV19RankedWarCountdownTrigger();
  logAudit_(session.name, 'removeV19RankedWarCountdownTriggerFromWeb', out);
  return out;
}
function removeV19RankedWarCountdownTrigger() {
  var removed = 0;
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction && t.getHandlerFunction() === 'pollRankedWarCountdownMonitors') { ScriptApp.deleteTrigger(t); removed++; }
  });
  return {ok:true, removed:removed};
}

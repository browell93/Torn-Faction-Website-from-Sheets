/**
 * ShadowCore HQ v2.2 - Status/API Field Fixes, Visual Fallbacks, Availability TZ, Chain Start Planner.
 */
var V22_VERSION = '2.2.0';

var V22_TIMEZONES = [
  'America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix','America/Anchorage','Pacific/Honolulu',
  'America/Toronto','America/Vancouver','America/Mexico_City','America/Sao_Paulo','UTC','Europe/London','Europe/Dublin','Europe/Paris','Europe/Berlin','Europe/Amsterdam','Europe/Madrid','Europe/Rome','Europe/Warsaw','Europe/Athens','Europe/Istanbul','Africa/Johannesburg','Asia/Dubai','Asia/Kolkata','Asia/Bangkok','Asia/Singapore','Asia/Hong_Kong','Asia/Manila','Asia/Tokyo','Australia/Perth','Australia/Brisbane','Australia/Sydney','Pacific/Auckland'
];

function setupShadowCoreV22Fixes() {
  try { ensureSheet_(APP.SHEETS.MEMBER_STATUS, HEADERS[APP.SHEETS.MEMBER_STATUS]); } catch(e) {}
  try { ensureSheet_(APP.SHEETS.AVAILABILITY_CALENDAR, HEADERS[APP.SHEETS.AVAILABILITY_CALENDAR]); } catch(e2) {}
  seedV22Defaults_();
  return {ok:true, version:V22_VERSION, message:'v2.2 fixes installed. Member_Status and Availability_Calendar repaired.'};
}

function seedV22Defaults_() {
  if (typeof upsertRowByKey_ !== 'function') return;
  var rows = [
    ['Default_Member_Timezone','America/New_York','Default timezone for availability if a member does not choose one.'],
    ['Chain_Start_Duration_Hours','2','How many consecutive hours the chain planner should score for start windows.'],
    ['Chain_Minimum_Available_Members','3','Minimum available members wanted in a recommended chain start window.'],
    ['Use_Scanner_Readiness_For_Member_Status','TRUE','Merge latest scanner/API readiness snapshots into Member_Status display.']
  ];
  rows.forEach(function(r){ upsertRowByKey_(APP.SHEETS.SETTINGS, 'Key', r[0], {Key:r[0], Value:r[1], Description:r[2]}); });
}

function getV22State_(session) {
  return {
    version: V22_VERSION,
    timezones: V22_TIMEZONES,
    memberStatusesMerged: v22MergedMemberStatuses_(),
    availabilityWithOffsets: v22AvailabilityWithOffsets_(),
    chainStartRecommendations: v22ChainStartRecommendations_()
  };
}

function v22MergedMemberStatuses_() {
  var base = {};
  readTable_(APP.SHEETS.MEMBER_STATUS).forEach(function(r){ base[String(r.Torn_ID)] = Object.assign({}, r); });
  var readiness = v22ReadScannerReadiness_();
  Object.keys(readiness).forEach(function(id){
    var r = readiness[id];
    var row = base[id] || {Torn_ID:id, Name:r.Name || ''};
    row.Name = row.Name || r.Name || '';
    row.Status = v22First_(row.Status, r.Status);
    row.Last_Action = v22First_(row.Last_Action, r.Last_Action);
    row.Life = v22First_(v22EmptyBar_(row.Life), v22BarText_(r.Life_Current, r.Life_Max));
    row.Energy = v22First_(v22EmptyBar_(row.Energy), v22BarText_(r.Energy_Current, r.Energy_Max));
    row.Nerve = v22First_(v22EmptyBar_(row.Nerve), v22BarText_(r.Nerve_Current, r.Nerve_Max));
    row.Happy = v22First_(v22EmptyBar_(row.Happy), v22BarText_(r.Happy_Current, r.Happy_Max));
    row.Hospital_Until = v22First_(row.Hospital_Until, r.Hospital_Until || r.Hospital);
    row.Jail = v22First_(row.Jail, r.Jail);
    row.Travel = v22First_(row.Travel, r.Travel);
    row.Drug_Cooldown = v22First_(row.Drug_Cooldown, v22CooldownText_(r.Drug_CD));
    row.Medical_Cooldown = v22First_(row.Medical_Cooldown, v22CooldownText_(r.Medical_CD));
    row.Booster_Cooldown = v22First_(row.Booster_Cooldown, v22CooldownText_(r.Booster_CD));
    row.Updated = v22First_(row.Updated, r.Timestamp);
    row.Source = 'Member_Status + Scanner/API readiness';
    base[id] = row;
  });
  return Object.keys(base).map(function(k){return base[k];});
}

function v22ReadScannerReadiness_() {
  var latest = {};
  try {
    var sheet = (typeof SCANNER !== 'undefined' && SCANNER.MEMBER_READINESS_SHEET) ? SCANNER.MEMBER_READINESS_SHEET : 'Member_Readiness_Snapshots';
    readTable_(sheet).forEach(function(r){
      var id = String(r.Torn_ID || ''); if(!id) return;
      if (!latest[id] || String(r.Timestamp || '') > String(latest[id].Timestamp || '')) latest[id] = r;
    });
  } catch (e) {}
  return latest;
}

function v22UpsertMemberStatusFromReadiness_(member, r) {
  if (!boolSetting_('Use_Scanner_Readiness_For_Member_Status', true)) return;
  member = member || {}; r = r || {};
  var id = String(member.tornId || r.tornId || r.Torn_ID || '');
  if (!id) return;
  var row = {
    Torn_ID: id,
    Name: String(member.name || r.name || r.Name || ''),
    Status: String(r.status || r.Status || ''),
    Last_Action: String(r.lastAction || r.Last_Action || ''),
    Life: v22BarText_(r.lifeCurrent || r.Life_Current, r.lifeMax || r.Life_Max),
    Energy: v22BarText_(r.energyCurrent || r.Energy_Current, r.energyMax || r.Energy_Max),
    Nerve: v22BarText_(r.nerveCurrent || r.Nerve_Current, r.nerveMax || r.Nerve_Max),
    Happy: v22BarText_(r.happyCurrent || r.Happy_Current, r.happyMax || r.Happy_Max),
    Hospital_Until: String(r.hospitalUntil || r.Hospital_Until || r.hospital || r.Hospital || ''),
    Jail: String(r.jail || r.Jail || ''),
    Travel: String(r.travel || r.Travel || ''),
    Drug_Cooldown: v22CooldownText_(r.drugCooldown || r.Drug_CD),
    Medical_Cooldown: v22CooldownText_(r.medicalCooldown || r.Medical_CD),
    Booster_Cooldown: v22CooldownText_(r.boosterCooldown || r.Booster_CD),
    Updated: nowIso_()
  };
  upsertRowByKey_(APP.SHEETS.MEMBER_STATUS, 'Torn_ID', id, row);
}

function v22UpsertMemberStatusFromApiSnapshot_(member, snap) {
  if (!boolSetting_('Use_Scanner_Readiness_For_Member_Status', true)) return;
  member = member || {}; snap = snap || {};
  var data = snap.data || snap.payload || snap.Payload_JSON || snap;
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) { data = {}; } }
  if (snap.type === 'visiblePlayers' || snap.Snapshot_Type === 'visiblePlayers') return; // visible enemies should not update our member status
  var parsed = v22ParseUserApiData_(data);
  var id = String(member.tornId || snap.subjectId || snap.Subject_ID || parsed.tornId || '');
  if (!id) return;
  var row = {
    Torn_ID: id,
    Name: String(member.name || snap.subjectName || snap.Subject_Name || parsed.name || ''),
    Status: parsed.status,
    Last_Action: parsed.lastAction,
    Life: parsed.life,
    Energy: parsed.energy,
    Nerve: parsed.nerve,
    Happy: parsed.happy,
    Hospital_Until: parsed.hospitalUntil,
    Jail: parsed.jail,
    Travel: parsed.travel,
    Drug_Cooldown: parsed.drugCooldown,
    Medical_Cooldown: parsed.medicalCooldown,
    Booster_Cooldown: parsed.boosterCooldown,
    Updated: nowIso_()
  };
  upsertRowByKey_(APP.SHEETS.MEMBER_STATUS, 'Torn_ID', id, row);
}

function v22ParseUserApiData_(data) {
  data = data || {};
  var profile = data.profile || data;
  var bars = data.bars || data;
  var statusObj = data.status || profile.status || {};
  var cooldowns = data.cooldowns || profile.cooldowns || {};
  var energy = bars.energy || {}, nerve = bars.nerve || {}, happy = bars.happy || {}, life = bars.life || {};
  var statusText = typeof statusObj === 'string' ? statusObj : String(statusObj.description || statusObj.details || statusObj.state || '');
  var statusState = typeof statusObj === 'string' ? statusObj : String(statusObj.state || '');
  var last = profile.last_action || data.last_action || {};
  return {
    tornId: profile.player_id || profile.user_id || profile.id || '',
    name: profile.name || profile.player_name || '',
    status: statusText || statusState,
    lastAction: typeof last === 'string' ? last : (last.relative || last.status || (last.timestamp ? v22UnixToIso_(last.timestamp) : '')),
    life: v22BarText_(life.current || life.now, life.maximum || life.max),
    energy: v22BarText_(energy.current || energy.now, energy.maximum || energy.max),
    nerve: v22BarText_(nerve.current || nerve.now, nerve.maximum || nerve.max),
    happy: v22BarText_(happy.current || happy.now, happy.maximum || happy.max),
    hospitalUntil: statusObj.until ? v22UnixToIso_(statusObj.until) : '',
    jail: /jail/i.test(statusText || statusState) ? 'TRUE' : 'FALSE',
    travel: /travel|abroad/i.test(statusText || statusState) ? 'TRUE' : 'FALSE',
    drugCooldown: v22CooldownText_(cooldowns.drug || cooldowns.drugs),
    medicalCooldown: v22CooldownText_(cooldowns.medical),
    boosterCooldown: v22CooldownText_(cooldowns.booster)
  };
}

function v22BarText_(cur, max) {
  if (cur === '' || cur === null || cur === undefined) return '';
  if (max === '' || max === null || max === undefined) return String(cur);
  return String(cur) + '/' + String(max);
}
function v22EmptyBar_(v) { return (v === null || v === undefined || v === 'undefined/undefined') ? '' : String(v || ''); }
function v22First_(a,b) { a = v22EmptyBar_(a); return a !== '' ? a : v22EmptyBar_(b); }
function v22CooldownText_(sec) {
  if (sec === '' || sec === null || sec === undefined) return '';
  if (typeof sec === 'string' && /ready|none|^0$|^0\s/.test(sec.toLowerCase())) return 'Ready';
  var n = Number(sec);
  if (!isFinite(n)) return String(sec);
  if (n <= 0) return 'Ready';
  var h = Math.floor(n/3600), m = Math.floor((n%3600)/60), s = Math.floor(n%60);
  if (h) return h+'h '+m+'m';
  if (m) return m+'m '+s+'s';
  return s+'s';
}
function v22UnixToIso_(x) { var n = Number(x); if (!n) return ''; return new Date(n*1000).toISOString(); }

function v22TimezoneOffsetHours_(tz, date) {
  tz = tz || setting_('Default_Member_Timezone','America/New_York');
  date = date || new Date();
  try {
    var z = Utilities.formatDate(date, tz, 'Z');
    var sign = z[0] === '-' ? -1 : 1;
    var hh = Number(z.slice(1,3)) || 0, mm = Number(z.slice(3,5)) || 0;
    return sign * (hh + mm/60);
  } catch(e) { return 0; }
}
function v22OffsetLabel_(hours) { var sign = hours >= 0 ? '+' : '-'; var abs = Math.abs(hours); var h = Math.floor(abs), m = Math.round((abs-h)*60); return 'UTC' + sign + h + (m ? ':' + ('0'+m).slice(-2) : ''); }
function v22Mod24_(h) { h = Number(h); return ((h % 24) + 24) % 24; }

function v22ParseTimeWindow_(text) {
  text = String(text || '').trim();
  if (!text || /any/i.test(text)) return {start:0,end:24,valid:true};
  var parts = text.split(/\s*(?:-|–|—|to)\s*/i);
  if (parts.length < 2) return {start:0,end:24,valid:false};
  return {start:v22ParseHour_(parts[0]), end:v22ParseHour_(parts[1]), valid:true};
}
function v22ParseHour_(s) {
  s = String(s||'').trim().toLowerCase();
  var m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i); if(!m) return 0;
  var h = Number(m[1]) || 0, mins = Number(m[2]||0)||0, ap = m[3];
  if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
  return v22Mod24_(h + mins/60);
}
function v22UtcHourFromLocal_(localHour, tz) { return v22Mod24_(Number(localHour) - v22TimezoneOffsetHours_(tz, new Date())); }

function v22AvailabilityWithOffsets_() {
  var viewerTz = setting_('Default_Member_Timezone','America/New_York');
  var viewerOffset = v22TimezoneOffsetHours_(viewerTz);
  return readTable_(APP.SHEETS.AVAILABILITY_CALENDAR).map(function(r){
    var tz = r.Timezone || viewerTz;
    var off = v22TimezoneOffsetHours_(tz);
    var win = v22ParseTimeWindow_(r.Time_Window);
    var sUtc = v22UtcHourFromLocal_(win.start, tz), eUtc = v22UtcHourFromLocal_(win.end, tz);
    var copy = Object.assign({}, r);
    copy.Timezone_Offset = v22OffsetLabel_(off);
    copy.Offset_From_Default = (off-viewerOffset >= 0 ? '+' : '') + (off-viewerOffset) + 'h';
    copy.Start_Hour_TCT = Math.round(sUtc*100)/100;
    copy.End_Hour_TCT = Math.round(eUtc*100)/100;
    return copy;
  });
}

function v22ChainStartRecommendations_() {
  var duration = Math.max(1, Math.min(8, Number(setting_('Chain_Start_Duration_Hours',2)) || 2));
  var rows = readTable_(APP.SHEETS.AVAILABILITY_CALENDAR).filter(function(r){return String(r.Active||'TRUE').toUpperCase() !== 'FALSE';});
  var hours = [];
  for (var h=0; h<24; h++) hours[h] = {Hour_TCT:h, Member_Count:0, Hitter_Count:0, Reviver_Count:0, Officer_Count:0, Names:[]};
  rows.forEach(function(r){
    var tz = r.Timezone || setting_('Default_Member_Timezone','America/New_York');
    var w = v22ParseTimeWindow_(r.Time_Window); if(!w.valid) return;
    var s = Math.floor(v22UtcHourFromLocal_(w.start,tz));
    var e = Math.ceil(v22UtcHourFromLocal_(w.end,tz));
    var span = [];
    if (w.end === 24 || s === e) { for(var x=0;x<24;x++) span.push(x); }
    else if (e > s) { for(var a=s; a<e; a++) span.push(v22Mod24_(a)); }
    else { for(var b=s; b<24; b++) span.push(b); for(var c=0;c<e;c++) span.push(c); }
    span.forEach(function(hr){
      var slot = hours[hr]; slot.Member_Count++; slot.Names.push(r.Name || r.Torn_ID || 'member');
      var role = String(r.Role||'').toLowerCase(); if(/hit|chain|war/.test(role)) slot.Hitter_Count++; if(/revive|medic/.test(role)) slot.Reviver_Count++; if(/officer|lead|captain/.test(role)) slot.Officer_Count++;
    });
  });
  var recs=[];
  for(var start=0; start<24; start++){
    var total=0,hit=0,rev=0,off=0,names={};
    for(var d=0; d<duration; d++){var slot=hours[v22Mod24_(start+d)]; total += slot.Member_Count; hit += slot.Hitter_Count; rev += slot.Reviver_Count; off += slot.Officer_Count; slot.Names.forEach(function(n){names[n]=true;});}
    var avg = total / duration;
    var score = avg + hit*0.8 + rev*0.4 + off*0.6;
    recs.push({Start_Hour_TCT:start, Window_TCT:start+':00-'+v22Mod24_(start+duration)+':00', Duration_Hours:duration, Avg_Members:Math.round(avg*10)/10, Hitter_Slots:hit, Reviver_Slots:rev, Officer_Slots:off, Score:Math.round(score*10)/10, Member_Names:Object.keys(names).slice(0,20).join(', ')});
  }
  return recs.sort(function(a,b){return Number(b.Score)-Number(a.Score);}).slice(0,8);
}

function generateChainPlanV22_(warId) {
  warId = warId || (activeWar_() ? activeWar_().War_ID : 'GENERAL');
  var chain = latestChain_ ? latestChain_() : {};
  var current = Number(chain.Chain) || 0;
  var nextBonus = Number(chain.Next_Bonus) || (typeof nextChainBonus_ === 'function' ? nextChainBonus_(current) : 10);
  var hitsNeeded = Math.max(0, nextBonus - current);
  var recs = v22ChainStartRecommendations_();
  var best = recs[0] || {};
  var scorecards = readTable_(APP.SHEETS.MEMBER_SCORECARDS).sort(function(a,b){return Number(b.Faction_Value)-Number(a.Faction_Value);});
  var bonusHitter = scorecards[0] ? (scorecards[0].Name + ' [' + scorecards[0].Torn_ID + ']') : '';
  var pacing=[];
  if(best.Window_TCT) pacing.push('Best availability-based start window: '+best.Window_TCT+' TCT with avg '+best.Avg_Members+' available slots.');
  if(recs[1]) pacing.push('Backup window: '+recs[1].Window_TCT+' TCT, score '+recs[1].Score+'.');
  if(hitsNeeded <= 0) pacing.push('Bonus reached or chain count unavailable.');
  else if(hitsNeeded < 10) pacing.push('Hold random hits. Assign controlled hits only until bonus.');
  else if(hitsNeeded < 40) pacing.push('Use medium hitters and save top hitter for the bonus number.');
  else pacing.push('Use low-risk/safe hitters to build toward '+nextBonus+'; preserve strongest members for closeout.');
  pacing.push('Suggested bonus hitter: '+(bonusHitter||'assign manually'));
  if(best.Member_Names) pacing.push('Members seen in best window: '+best.Member_Names);
  var row={
    Plan_ID:'CHAIN-'+Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss'), Timestamp:nowIso_(), War_ID:warId,
    Current_Chain:current, Next_Bonus:nextBonus, Hits_Needed:hitsNeeded,
    Pacing_Plan:pacing.join('\n'), Reserved_Bonus_Hitter:bonusHitter, Danger_Level:chain.Danger_Level || '',
    Notes:(typeof generateChainAdvice_ === 'function' ? generateChainAdvice_(chain) : '') + '\nTop start windows: '+recs.map(function(r){return r.Window_TCT+' score '+r.Score;}).join('; ')
  };
  appendRowObject_(APP.SHEETS.CHAIN_PLANS,row); return {ok:true, plan:row, startWindows:recs};
}

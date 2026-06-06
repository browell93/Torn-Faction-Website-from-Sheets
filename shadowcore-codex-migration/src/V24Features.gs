/**
 * ShadowCore HQ v2.4 - Advisor / Member Intelligence Center
 * Turns existing HQ/scanner/API/gym/war data into member-facing advice, explanations,
 * weekly reports, faction needs, and officer coaching queues.
 */

var V24_VERSION = '2.4.0';
var V24_SHEETS = {
  ADVISOR_SETTINGS: 'Advisor_Settings',
  MEMBER_ADVISOR_SCORES: 'Member_Advisor_Scores',
  MEMBER_NEXT_ACTIONS: 'Member_Next_Actions',
  SMART_EXPLANATIONS: 'Smart_Explanations',
  WAR_READINESS_COACHING: 'War_Readiness_Coaching',
  TRAINING_ADVICE: 'Training_Advice',
  WAR_ROLE_ASSIGNMENTS: 'War_Role_Assignments',
  PERSONALIZED_GUIDES: 'Personalized_Guides',
  DATA_CONFIDENCE: 'Data_Confidence',
  MEMBER_TIMELINE: 'Member_Timeline',
  FACTION_NEEDS: 'Faction_Needs',
  ALERT_EXPLANATIONS: 'Alert_Explanations',
  ADVISOR_VISUALS: 'Advisor_Visuals',
  MEMBER_WEEKLY_REPORTS: 'Member_Weekly_Reports',
  OFFICER_COACHING_QUEUE: 'Officer_Coaching_Queue'
};

var V24_HEADERS = {};
V24_HEADERS[V24_SHEETS.ADVISOR_SETTINGS] = ['Key','Value','Description','Updated'];
V24_HEADERS[V24_SHEETS.MEMBER_ADVISOR_SCORES] = ['Torn_ID','Name','Informed_Score','War_Readiness','Training_Readiness','Scanner_Status','API_Status','Availability_Status','Knowledge_Status','Payout_Status','Support_Status','Top_Gap','Updated','Explanation'];
V24_HEADERS[V24_SHEETS.MEMBER_NEXT_ACTIONS] = ['Action_ID','Timestamp','Torn_ID','Name','Priority','Category','Action','Why','Impact','Status','Due','Source','Confidence'];
V24_HEADERS[V24_SHEETS.SMART_EXPLANATIONS] = ['Explanation_ID','Timestamp','Torn_ID','Name','Feature','Recommendation','Why','Data_Used','Confidence','Audience'];
V24_HEADERS[V24_SHEETS.WAR_READINESS_COACHING] = ['Coach_ID','Timestamp','Torn_ID','Name','Readiness_Score','Problems','Fixes','Role_Suggestion','War_ID','Updated'];
V24_HEADERS[V24_SHEETS.TRAINING_ADVICE] = ['Advice_ID','Timestamp','Torn_ID','Name','Best_Stat','Best_Gym','Recommended_Schedule','Projected_7_Day_Gain','Estimated_Cost','Goal_Time','Why','Confidence'];
V24_HEADERS[V24_SHEETS.WAR_ROLE_ASSIGNMENTS] = ['Assignment_ID','Timestamp','Torn_ID','Name','War_ID','Role','Job','Reason','Confidence','Status','Updated'];
V24_HEADERS[V24_SHEETS.PERSONALIZED_GUIDES] = ['Guide_ID','Timestamp','Torn_ID','Name','Article_ID','Title','Reason','Priority','Status'];
V24_HEADERS[V24_SHEETS.DATA_CONFIDENCE] = ['Data_ID','Timestamp','Torn_ID','Name','Data_Type','Value','Source','Confidence','Last_Updated','Needs_Refresh','Notes'];
V24_HEADERS[V24_SHEETS.MEMBER_TIMELINE] = ['Event_ID','Timestamp','Torn_ID','Name','Category','Event','Related_ID','Impact','Source','Visibility'];
V24_HEADERS[V24_SHEETS.FACTION_NEEDS] = ['Need_ID','Timestamp','Category','Need','Priority','Count_Needed','Evidence','Recommended_Action','Status','Updated'];
V24_HEADERS[V24_SHEETS.ALERT_EXPLANATIONS] = ['Alert_ID','Timestamp','Alert_Type','Title','Message','Why','Data_Used','Priority','Posted','Audience'];
V24_HEADERS[V24_SHEETS.ADVISOR_VISUALS] = ['Metric_ID','Timestamp','Metric','Label','Value','Group','Sort','Notes'];
V24_HEADERS[V24_SHEETS.MEMBER_WEEKLY_REPORTS] = ['Report_ID','Generated','Week_Start','Week_End','Torn_ID','Name','War_Hits','Respect','Payout_Earned','Support_Used','Awards','Training_Progress','Top_Action','Body','Status'];
V24_HEADERS[V24_SHEETS.OFFICER_COACHING_QUEUE] = ['Queue_ID','Timestamp','Torn_ID','Name','Issue','Severity','Recommended_Coach','Suggested_Message','Status','Assigned_To','Due_Date','Evidence','Updated'];

function setupShadowCoreV24AdvisorMiniStatus() {
  var existing = Object.keys(V24_HEADERS).filter(function(name) { return !!ss_().getSheetByName(name); });
  var missing = Object.keys(V24_HEADERS).filter(function(name) { return !ss_().getSheetByName(name); });
  return {ok:true, version:V24_VERSION, total:Object.keys(V24_HEADERS).length, existing_count:existing.length, missing_count:missing.length, complete:missing.length===0, missing:missing};
}

function setupShadowCoreV24AdvisorMiniNext() {
  var status = setupShadowCoreV24AdvisorMiniStatus();
  if (status.complete) return status;
  var name = status.missing[0];
  ensureSheet_(name, V24_HEADERS[name]);
  if (name === V24_SHEETS.ADVISOR_SETTINGS) seedV24AdvisorSettings_();
  return setupShadowCoreV24AdvisorMiniStatus();
}

function setupShadowCoreV24Advisor() {
  var names = Object.keys(V24_HEADERS);
  for (var i = 0; i < names.length; i++) ensureSheet_(names[i], V24_HEADERS[names[i]]);
  seedV24AdvisorSettings_();
  logAudit_('system','setupShadowCoreV24Advisor','Installed v2.4 Advisor sheets.');
  return {ok:true, version:V24_VERSION, sheets:names.length};
}

function seedV24AdvisorSettings_() {
  var rows = [
    {Key:'Advisor_Version', Value:V24_VERSION, Description:'Installed ShadowCore Advisor version.', Updated:nowIso_()},
    {Key:'Advisor_Min_War_Readiness', Value:'70', Description:'Readiness score below this creates a coaching action.', Updated:nowIso_()},
    {Key:'Advisor_Stale_Hours', Value:'24', Description:'Scanner/API data older than this is stale.', Updated:nowIso_()},
    {Key:'Advisor_Min_Informed_Score', Value:'75', Description:'Score below this creates education suggestions.', Updated:nowIso_()},
    {Key:'Advisor_Weekly_Report_Days', Value:'7', Description:'Default weekly report window.', Updated:nowIso_()}
  ];
  rows.forEach(function(r){ upsertRowByKey_(V24_SHEETS.ADVISOR_SETTINGS, 'Key', r.Key, r); });
}

function getV24State_(session) {
  setupV24IfMissing_();
  var tornId = session && session.tornId ? String(session.tornId) : '';
  var role = session ? session.roleValue : APP.ROLES.PUBLIC;
  var state = {
    version: V24_VERSION,
    my: {
      score: v24FindById_(V24_SHEETS.MEMBER_ADVISOR_SCORES, tornId, 'Torn_ID'),
      actions: v24RowsById_(V24_SHEETS.MEMBER_NEXT_ACTIONS, tornId, 'Torn_ID').slice(-25),
      explanations: v24RowsById_(V24_SHEETS.SMART_EXPLANATIONS, tornId, 'Torn_ID').slice(-25),
      warCoaching: v24RowsById_(V24_SHEETS.WAR_READINESS_COACHING, tornId, 'Torn_ID').slice(-10),
      trainingAdvice: v24RowsById_(V24_SHEETS.TRAINING_ADVICE, tornId, 'Torn_ID').slice(-10),
      role: v24RowsById_(V24_SHEETS.WAR_ROLE_ASSIGNMENTS, tornId, 'Torn_ID').slice(-10),
      guides: v24RowsById_(V24_SHEETS.PERSONALIZED_GUIDES, tornId, 'Torn_ID').slice(-25),
      confidence: v24RowsById_(V24_SHEETS.DATA_CONFIDENCE, tornId, 'Torn_ID').slice(-25),
      timeline: v24RowsById_(V24_SHEETS.MEMBER_TIMELINE, tornId, 'Torn_ID').slice(-50),
      weeklyReports: v24RowsById_(V24_SHEETS.MEMBER_WEEKLY_REPORTS, tornId, 'Torn_ID').slice(-8)
    },
    factionNeeds: v24SafeReadTable_(V24_SHEETS.FACTION_NEEDS).slice(-100),
    alertExplanations: v24SafeReadTable_(V24_SHEETS.ALERT_EXPLANATIONS).slice(-100),
    visuals: v24SafeReadTable_(V24_SHEETS.ADVISOR_VISUALS).slice(-500)
  };
  if (role >= APP.ROLES.OFFICER) {
    state.scores = v24SafeReadTable_(V24_SHEETS.MEMBER_ADVISOR_SCORES).slice(-500);
    state.coachingQueue = v24SafeReadTable_(V24_SHEETS.OFFICER_COACHING_QUEUE).slice(-500);
    state.nextActions = v24SafeReadTable_(V24_SHEETS.MEMBER_NEXT_ACTIONS).slice(-500);
    state.weeklyReports = v24SafeReadTable_(V24_SHEETS.MEMBER_WEEKLY_REPORTS).slice(-500);
    state.timeline = v24SafeReadTable_(V24_SHEETS.MEMBER_TIMELINE).slice(-500);
  }
  return state;
}

function generateV24AdvisorIntelligence(sessionId) {
  var session = requireRole_(sessionId, 'OFFICER');
  setupV24IfMissing_();
  var members = readTable_(APP.SHEETS.MEMBERS);
  var statuses = (typeof v22MergedMemberStatuses_ === 'function' ? v22MergedMemberStatuses_() : readTable_(APP.SHEETS.MEMBER_STATUS));
  var onboarding = readTable_(APP.SHEETS.ONBOARDING);
  var availability = readTable_(APP.SHEETS.AVAILABILITY_CALENDAR);
  var payouts = readTable_(APP.SHEETS.PAYOUTS);
  var awards = readTable_(APP.SHEETS.AWARDS);
  var requests = readTable_(APP.SHEETS.ARMORY_REQUESTS);
  var revive = readTable_(APP.SHEETS.REVIVE_BOARD);
  var guides = readTable_(APP.SHEETS.KNOWLEDGE_BASE).filter(function(g){ return String(g.Active).toUpperCase() === 'TRUE'; });
  var now = nowIso_();
  var generated = {scores:0, actions:0, coaching:0, needs:0, visuals:0};
  var scoreBuckets = {Excellent:0, Good:0, NeedsWork:0, Critical:0};
  var readinessBuckets = {Ready:0, Limited:0, NotReady:0, Unknown:0};
  members.forEach(function(m) {
    if (String(m.Active).toUpperCase() === 'FALSE') return;
    var id = String(m.Torn_ID || '');
    if (!id) return;
    var name = String(m.Name || 'Unknown');
    var st = v24LatestById_(statuses, id, 'Torn_ID') || {};
    var memOnb = onboarding.filter(function(o){ return String(o.Torn_ID) === id; });
    var memAvail = availability.filter(function(a){ return String(a.Torn_ID) === id && String(a.Active).toUpperCase() !== 'FALSE'; });
    var memPayouts = payouts.filter(function(p){ return String(p.Torn_ID) === id; });
    var unpaid = memPayouts.reduce(function(sum,p){ return String(p.Paid).toUpperCase()==='TRUE' ? sum : sum+(Number(p.Total)||0); },0);
    var reqOpen = requests.filter(function(r){ return String(r.Torn_ID) === id && ['pending','open','new'].indexOf(String(r.Status||'').toLowerCase()) !== -1; }).length + revive.filter(function(r){ return String(r.Torn_ID) === id && ['pending','open','new'].indexOf(String(r.Status||'').toLowerCase()) !== -1; }).length;
    var onbComplete = memOnb.length ? Math.round(100 * memOnb.filter(function(o){ return String(o.Status).toLowerCase()==='complete' || String(o.Completed).toUpperCase()==='TRUE'; }).length / memOnb.length) : 0;
    var scannerOk = v24HasRecentData_(st.Updated || st.Last_Action, Number(setting_('Advisor_Stale_Hours', 24)));
    var statusText = String(st.Status || '').toLowerCase();
    var cooldownBlocked = Number(st.Drug_Cooldown||0) > 0 || Number(st.Medical_Cooldown||0) > 0 || Number(st.Booster_Cooldown||0) > 0;
    var travelBlocked = statusText.indexOf('travel') !== -1 || statusText.indexOf('abroad') !== -1;
    var hospBlocked = statusText.indexOf('hospital') !== -1;
    var jailBlocked = statusText.indexOf('jail') !== -1;
    var barsKnown = st.Energy !== '' || st.Nerve !== '' || st.Happy !== '' || st.Life !== '';
    var warReadiness = 50;
    if (scannerOk) warReadiness += 15; else warReadiness -= 10;
    if (memAvail.length) warReadiness += 10; else warReadiness -= 8;
    if (travelBlocked || hospBlocked || jailBlocked) warReadiness -= 25;
    if (barsKnown) warReadiness += 10;
    if (cooldownBlocked) warReadiness -= 5;
    warReadiness = Math.max(0, Math.min(100, warReadiness));
    var knowledgeScore = Math.min(100, onbComplete + (guides.length ? 15 : 0));
    var informed = Math.round((warReadiness * 0.35) + (knowledgeScore * 0.25) + (scannerOk ? 15 : 0) + (memAvail.length ? 15 : 0) + (barsKnown ? 10 : 0));
    informed = Math.max(0, Math.min(100, informed));
    var topGap = !scannerOk ? 'Scanner/API data stale or missing' : (!memAvail.length ? 'Availability missing' : (onbComplete < 80 ? 'Onboarding/knowledge gaps' : (warReadiness < 70 ? 'War readiness issues' : 'None')));
    var scoreRow = {Torn_ID:id, Name:name, Informed_Score:informed, War_Readiness:warReadiness, Training_Readiness:barsKnown?'Known':'Missing bars/API', Scanner_Status:scannerOk?'Recent':'Stale/Missing', API_Status:barsKnown?'Bars/Cooldowns available':'No API snapshot', Availability_Status:memAvail.length?'Set':'Missing', Knowledge_Status:onbComplete + '% onboarding', Payout_Status:unpaid?('$'+unpaid):'No unpaid payout', Support_Status:reqOpen?'Open requests: '+reqOpen:'No open requests', Top_Gap:topGap, Updated:now, Explanation:v24ExplainScore_(informed, warReadiness, topGap)};
    upsertRowByKey_(V24_SHEETS.MEMBER_ADVISOR_SCORES, 'Torn_ID', id, scoreRow);
    generated.scores++;
    if (informed >= 85) scoreBuckets.Excellent++; else if (informed >= 70) scoreBuckets.Good++; else if (informed >= 45) scoreBuckets.NeedsWork++; else scoreBuckets.Critical++;
    if (warReadiness >= 75) readinessBuckets.Ready++; else if (warReadiness >= 50) readinessBuckets.Limited++; else if (scannerOk || st.Status) readinessBuckets.NotReady++; else readinessBuckets.Unknown++;
    var actions = v24BuildActions_(id, name, st, memAvail, memOnb, unpaid, reqOpen, scannerOk, warReadiness, onbComplete);
    actions.forEach(function(a){ appendRowObject_(V24_SHEETS.MEMBER_NEXT_ACTIONS, a); generated.actions++; });
    var coaching = v24BuildCoaching_(id, name, st, scannerOk, warReadiness, memAvail, onbComplete);
    if (coaching) { appendRowObject_(V24_SHEETS.WAR_READINESS_COACHING, coaching); generated.coaching++; }
    upsertRowByKey_(V24_SHEETS.WAR_ROLE_ASSIGNMENTS, 'Assignment_ID', 'ROLE-' + id, v24BuildRole_(id, name, warReadiness, st, memAvail));
    upsertRowByKey_(V24_SHEETS.TRAINING_ADVICE, 'Advice_ID', 'TRAIN-' + id, v24BuildTrainingAdvice_(id, name, st));
    v24SeedGuidesForMember_(id, name, topGap, guides);
    v24WriteConfidenceRows_(id, name, st, scannerOk, memAvail, onbComplete);
    v24WriteTimelineForMember_(id, name, st, unpaid, reqOpen, awards);
  });
  generated.needs = v24GenerateFactionNeeds_(members, statuses, onboarding, availability, payouts);
  generated.visuals = v24GenerateAdvisorVisuals_(scoreBuckets, readinessBuckets);
  v24GenerateAlertExplanations_();
  v24GenerateOfficerQueue_();
  logAudit_(session.name, 'generateV24AdvisorIntelligence', generated);
  return {ok:true, version:V24_VERSION, generated:generated};
}

function generateV24WeeklyMemberReports(sessionId) {
  var session = requireRole_(sessionId, 'OFFICER');
  setupV24IfMissing_();
  var members = readTable_(APP.SHEETS.MEMBERS);
  var attacks = readTable_(APP.SHEETS.WAR_ATTACKS);
  var payouts = readTable_(APP.SHEETS.PAYOUTS);
  var awards = readTable_(APP.SHEETS.AWARDS);
  var requests = readTable_(APP.SHEETS.ARMORY_REQUESTS);
  var training = readTable_(APP.SHEETS.TRAINING_TRACKER);
  var days = Number(setting_('Advisor_Weekly_Report_Days', 7)) || 7;
  var end = new Date(); var start = new Date(end.getTime() - days*24*3600*1000);
  var count = 0;
  members.forEach(function(m){
    if (String(m.Active).toUpperCase() === 'FALSE') return;
    var id = String(m.Torn_ID || ''); if (!id) return;
    var name = String(m.Name || 'Unknown');
    var hits = attacks.filter(function(a){ return String(a.Attacker_ID)===id && v24DateInRange_(a.Timestamp,start,end); });
    var respect = hits.reduce(function(s,a){ return s + (Number(a.Respect)||0); },0);
    var earned = payouts.filter(function(p){ return String(p.Torn_ID)===id; }).reduce(function(s,p){ return s+(Number(p.Total)||0); },0);
    var support = requests.filter(function(r){ return String(r.Torn_ID)===id && v24DateInRange_(r.Timestamp,start,end); }).length;
    var memAwards = awards.filter(function(a){ return String(a.Torn_ID)===id && v24DateInRange_(a.Timestamp,start,end); }).map(function(a){ return a.Award; }).join(', ');
    var tr = v24LatestById_(training, id, 'Torn_ID') || {};
    var topAction = (v24RowsById_(V24_SHEETS.MEMBER_NEXT_ACTIONS, id, 'Torn_ID').slice(-1)[0] || {}).Action || 'Check My Advisor for next steps.';
    var body = 'Your ShadowCore Weekly Report\n\nWar hits: '+hits.length+'\nRespect earned: '+respect.toFixed(2)+'\nPayout earned/tracked: $'+earned+'\nSupport requests: '+support+'\nAwards: '+(memAwards||'None')+'\nTraining progress: '+(tr.Current_Estimate||tr.Goal||'No recent training entry')+'\nRecommended next step: '+topAction;
    appendRowObject_(V24_SHEETS.MEMBER_WEEKLY_REPORTS, {Report_ID:'WEEK-'+id+'-'+Utilities.getUuid().slice(0,6), Generated:nowIso_(), Week_Start:start.toISOString(), Week_End:end.toISOString(), Torn_ID:id, Name:name, War_Hits:hits.length, Respect:respect, Payout_Earned:earned, Support_Used:support, Awards:memAwards, Training_Progress:tr.Current_Estimate||'', Top_Action:topAction, Body:body, Status:'Generated'});
    count++;
  });
  logAudit_(session.name, 'generateV24WeeklyMemberReports', {reports:count});
  return {ok:true, reports:count};
}

function updateV24ActionStatus(sessionId, actionId, status) {
  var session = requireSession_(sessionId);
  var rows = v24SafeReadTable_(V24_SHEETS.MEMBER_NEXT_ACTIONS);
  var found = rows.filter(function(r){ return String(r.Action_ID) === String(actionId); })[0];
  if (!found) throw new Error('Advisor action not found.');
  if (String(found.Torn_ID) !== String(session.tornId) && session.roleValue < APP.ROLES.OFFICER) throw new Error('Permission denied.');
  found.Status = status || 'Done';
  upsertRowByKey_(V24_SHEETS.MEMBER_NEXT_ACTIONS, 'Action_ID', actionId, found);
  appendRowObject_(V24_SHEETS.MEMBER_TIMELINE, {Event_ID:'TL-'+Utilities.getUuid().slice(0,8), Timestamp:nowIso_(), Torn_ID:found.Torn_ID, Name:found.Name, Category:'Advisor', Event:'Marked action '+found.Action+' as '+found.Status, Related_ID:actionId, Impact:'Member improved informed status.', Source:'Advisor', Visibility:'Member'});
  return {ok:true};
}

function updateV24CoachingStatus(sessionId, queueId, status, assignedTo) {
  var session = requireRole_(sessionId, 'OFFICER');
  var rows = v24SafeReadTable_(V24_SHEETS.OFFICER_COACHING_QUEUE);
  var found = rows.filter(function(r){ return String(r.Queue_ID) === String(queueId); })[0];
  if (!found) throw new Error('Coaching queue item not found.');
  found.Status = status || found.Status;
  found.Assigned_To = assignedTo || found.Assigned_To;
  found.Updated = nowIso_();
  upsertRowByKey_(V24_SHEETS.OFFICER_COACHING_QUEUE, 'Queue_ID', queueId, found);
  logAudit_(session.name, 'updateV24CoachingStatus', {queueId:queueId, status:status});
  return {ok:true};
}

function v24SafeReadTable_(sheetName) {
  try {
    if (!ss_().getSheetByName(sheetName)) return [];
    return readTable_(sheetName);
  } catch (err) {
    return [];
  }
}

function setupV24IfMissing_() {
  if (!ss_().getSheetByName(V24_SHEETS.ADVISOR_SETTINGS)) setupShadowCoreV24AdvisorMiniNext();
}

function v24RowsById_(sheet, id, key) {
  if (!id) return [];
  return v24SafeReadTable_(sheet).filter(function(r){ return String(r[key || 'Torn_ID']) === String(id); });
}
function v24FindById_(sheet, id, key) { var rows = v24RowsById_(sheet, id, key); return rows.length ? rows[rows.length-1] : null; }
function v24LatestById_(rows, id, key) { var out = rows.filter(function(r){ return String(r[key || 'Torn_ID']) === String(id); }); return out.length ? out[out.length-1] : null; }
function v24HasRecentData_(iso, hours) { var d = new Date(iso); if (!iso || isNaN(d.getTime())) return false; return (Date.now() - d.getTime()) <= (hours||24)*3600*1000; }
function v24DateInRange_(iso, start, end) { var d = new Date(iso); return !isNaN(d.getTime()) && d >= start && d <= end; }
function v24ExplainScore_(informed, ready, gap) { return 'Score blends war readiness ('+ready+'), onboarding/knowledge completion, scanner/API freshness, availability, and useful action completion. Top gap: '+gap+'.'; }

function v24BuildActions_(id, name, st, availability, onboarding, unpaid, reqOpen, scannerOk, warReadiness, onbComplete) {
  var out = [];
  function add(priority, category, action, why, impact, confidence) {
    out.push({Action_ID:'ACT-'+id+'-'+Utilities.getUuid().slice(0,8), Timestamp:nowIso_(), Torn_ID:id, Name:name, Priority:priority, Category:category, Action:action, Why:why, Impact:impact, Status:'Open', Due:'', Source:'Advisor v2.4', Confidence:confidence || 'Medium'});
  }
  if (!scannerOk) add('High','Setup','Open the scanner once and send a readiness/API snapshot.','Your status/API data is stale or missing.','Improves war planning, readiness, and support accuracy.','High');
  if (!availability.length) add('High','Availability','Submit your availability and timezone.','Leadership cannot plan chain/war windows without your availability.','Improves chain start recommendations and team coverage.','High');
  if (onbComplete < 80) add('Medium','Knowledge','Finish onboarding and recommended guides.','Your onboarding completion is '+onbComplete+'%.','Reduces confusion during wars and payouts.','Medium');
  if (warReadiness < 70) add('High','War','Fix war readiness blockers before the next war.','Readiness score is '+warReadiness+'.','Makes you more useful during ranked wars.','High');
  if (unpaid > 0) add('Low','Payout','Review your unpaid payout estimate: $'+unpaid+'.','You have unpaid tracked payouts.','Keeps payouts transparent.','High');
  if (reqOpen) add('Medium','Support','Check your open support requests.','You have '+reqOpen+' open support/revive/armory requests.','Helps leaders close requests faster.','Medium');
  if (!out.length) add('Low','Maintain','You look mostly ready. Keep scanner/API fresh and check Mobile War View during wars.','No major gaps detected.','Keeps your status current and helps war planning.','Medium');
  return out;
}

function v24BuildCoaching_(id, name, st, scannerOk, score, availability, onbComplete) {
  if (score >= 70 && scannerOk && availability.length && onbComplete >= 80) return null;
  var problems = [];
  var fixes = [];
  if (!scannerOk) { problems.push('Scanner/API data stale or missing'); fixes.push('Open scanner and send a readiness snapshot.'); }
  if (!availability.length) { problems.push('Availability missing'); fixes.push('Submit timezone and available hours.'); }
  if (onbComplete < 80) { problems.push('Onboarding/knowledge incomplete'); fixes.push('Finish onboarding and key guides.'); }
  if (score < 70) { problems.push('Low war readiness score'); fixes.push('Check status, travel, hospital, cooldowns, and Mobile War View.'); }
  return {Coach_ID:'COACH-'+id+'-'+Utilities.getUuid().slice(0,6), Timestamp:nowIso_(), Torn_ID:id, Name:name, Readiness_Score:score, Problems:problems.join('; '), Fixes:fixes.join('; '), Role_Suggestion:v24RoleFromScore_(score, st, availability), War_ID:'', Updated:nowIso_()};
}

function v24BuildRole_(id, name, score, st, availability) {
  var role = v24RoleFromScore_(score, st, availability);
  var job = role === 'Main Hitter' ? 'Take assigned high-value targets and follow war room orders.' : role === 'Chain Filler' ? 'Keep chain alive with safe targets and avoid reserved bonus hits.' : role === 'Late-Night Coverage' ? 'Cover weak faction activity windows.' : role === 'Scout' ? 'Scan enemy pages and add target notes.' : 'Focus on setup, scanner, availability, and safe support tasks.';
  return {Assignment_ID:'ROLE-'+id, Timestamp:nowIso_(), Torn_ID:id, Name:name, War_ID:'', Role:role, Job:job, Reason:'Based on readiness score, availability, and status.', Confidence:'Medium', Status:'Suggested', Updated:nowIso_()};
}
function v24RoleFromScore_(score, st, availability) {
  var status = String((st && st.Status)||'').toLowerCase();
  if (status.indexOf('hospital')!==-1 || status.indexOf('travel')!==-1 || status.indexOf('jail')!==-1) return 'Support / Unavailable';
  if (availability && availability.some(function(a){ return String(a.Time_Window||'').toLowerCase().indexOf('night')!==-1 || String(a.Role||'').toLowerCase().indexOf('night')!==-1; })) return 'Late-Night Coverage';
  if (score >= 85) return 'Main Hitter';
  if (score >= 65) return 'Chain Filler';
  if (score >= 45) return 'Scout';
  return 'Recruit / Setup Needed';
}

function v24BuildTrainingAdvice_(id, name, st) {
  var energy = Number(st.Energy || 0), happy = Number(st.Happy || 0);
  var stat = setting_('Default_Training_Focus','Defense');
  var schedule = energy >= 150 ? 'Train now; energy appears high.' : 'Use natural regen and plan Xanax/refills if your faction permits.';
  var why = happy ? 'Happy snapshot exists, so Gym Gains Lab can produce better estimates.' : 'Happy/API bars are missing; send scanner/API snapshot for better Vladar projections.';
  return {Advice_ID:'TRAIN-'+id, Timestamp:nowIso_(), Torn_ID:id, Name:name, Best_Stat:stat, Best_Gym:'Use Gym Gains Lab comparison', Recommended_Schedule:schedule, Projected_7_Day_Gain:'Run Gym Gains Lab', Estimated_Cost:'Use editable prices', Goal_Time:'Run goal estimator', Why:why, Confidence:happy?'Medium':'Low'};
}

function v24SeedGuidesForMember_(id, name, gap, guides) {
  var wants = [];
  if (gap.indexOf('Scanner')!==-1) wants.push('scanner');
  if (gap.indexOf('Availability')!==-1) wants.push('availability');
  if (gap.indexOf('Onboarding')!==-1 || gap.indexOf('knowledge')!==-1) wants.push('war');
  if (!wants.length) wants.push('war','payout','training');
  var picked = guides.filter(function(g){ var hay = String(g.Title+' '+g.Category+' '+g.Tags).toLowerCase(); return wants.some(function(w){ return hay.indexOf(w)!==-1; }); }).slice(0,5);
  if (!picked.length) picked = guides.slice(0,3);
  picked.forEach(function(g, idx){ upsertRowByKey_(V24_SHEETS.PERSONALIZED_GUIDES, 'Guide_ID', 'GUIDE-'+id+'-'+(g.Article_ID||idx), {Guide_ID:'GUIDE-'+id+'-'+(g.Article_ID||idx), Timestamp:nowIso_(), Torn_ID:id, Name:name, Article_ID:g.Article_ID||'', Title:g.Title||'', Reason:'Recommended because: '+gap, Priority:idx+1, Status:'Recommended'}); });
}

function v24WriteConfidenceRows_(id, name, st, scannerOk, availability, onbComplete) {
  var rows = [
    ['Status', st.Status || '', scannerOk?'Scanner/API snapshot':'Missing/stale snapshot', scannerOk?'High':'Low', st.Updated || st.Last_Action || '', !scannerOk, 'Bars and cooldowns depend on opt-in scanner/API data.'],
    ['Availability', availability.length?'Set':'Missing', 'Availability Calendar', availability.length?'High':'Low', availability.length ? (availability[availability.length-1].Updated||'') : '', !availability.length, 'Used for chain and war start planning.'],
    ['Knowledge', onbComplete+'%', 'Onboarding/Guides', onbComplete>=80?'Medium':'Low', nowIso_(), onbComplete<80, 'Used for informed score.']
  ];
  rows.forEach(function(r){ upsertRowByKey_(V24_SHEETS.DATA_CONFIDENCE, 'Data_ID', 'CONF-'+id+'-'+r[0], {Data_ID:'CONF-'+id+'-'+r[0], Timestamp:nowIso_(), Torn_ID:id, Name:name, Data_Type:r[0], Value:r[1], Source:r[2], Confidence:r[3], Last_Updated:r[4], Needs_Refresh:r[5]?'TRUE':'FALSE', Notes:r[6]}); });
}

function v24WriteTimelineForMember_(id, name, st, unpaid, reqOpen, awards) {
  if (st.Updated) upsertRowByKey_(V24_SHEETS.MEMBER_TIMELINE, 'Event_ID', 'TL-STATUS-'+id, {Event_ID:'TL-STATUS-'+id, Timestamp:st.Updated, Torn_ID:id, Name:name, Category:'Status', Event:'Status snapshot: '+(st.Status||'unknown'), Related_ID:'Member_Status', Impact:'Updates readiness score.', Source:'Scanner/API', Visibility:'Member'});
  if (unpaid > 0) upsertRowByKey_(V24_SHEETS.MEMBER_TIMELINE, 'Event_ID', 'TL-PAYOUT-'+id, {Event_ID:'TL-PAYOUT-'+id, Timestamp:nowIso_(), Torn_ID:id, Name:name, Category:'Payout', Event:'Unpaid payout tracked: $'+unpaid, Related_ID:'Payouts', Impact:'Member should review payout center.', Source:'Payouts', Visibility:'Member'});
  if (reqOpen > 0) upsertRowByKey_(V24_SHEETS.MEMBER_TIMELINE, 'Event_ID', 'TL-SUPPORT-'+id, {Event_ID:'TL-SUPPORT-'+id, Timestamp:nowIso_(), Torn_ID:id, Name:name, Category:'Support', Event:reqOpen+' open support requests.', Related_ID:'Armory/Revive', Impact:'Officer follow-up may be needed.', Source:'Support', Visibility:'Member'});
}

function v24GenerateFactionNeeds_(members, statuses, onboarding, availability, payouts) {
  var needs = [];
  var activeMembers = members.filter(function(m){ return String(m.Active).toUpperCase() !== 'FALSE'; });
  var availIds = {}; availability.forEach(function(a){ if(String(a.Active).toUpperCase()!=='FALSE') availIds[String(a.Torn_ID)] = true; });
  var statusIds = {}; statuses.forEach(function(s){ if (v24HasRecentData_(s.Updated || s.Last_Action, 24)) statusIds[String(s.Torn_ID)] = true; });
  var noAvail = activeMembers.filter(function(m){ return !availIds[String(m.Torn_ID)]; }).length;
  var stale = activeMembers.filter(function(m){ return !statusIds[String(m.Torn_ID)]; }).length;
  var unpaid = payouts.reduce(function(s,p){ return String(p.Paid).toUpperCase()==='TRUE'?s:s+(Number(p.Total)||0); },0);
  function add(cat, need, priority, count, evidence, action) { needs.push({Need_ID:'NEED-'+cat.replace(/\W/g,'')+'-'+Utilities.getUuid().slice(0,4), Timestamp:nowIso_(), Category:cat, Need:need, Priority:priority, Count_Needed:count, Evidence:evidence, Recommended_Action:action, Status:'Open', Updated:nowIso_()}); }
  if (noAvail) add('Availability','Members need to submit availability/timezone','High',noAvail,noAvail+' active members missing availability.','Post reminder and link Availability Calendar.');
  if (stale) add('Scanner/API','Members need fresh scanner/API readiness snapshots','High',stale,stale+' active members have stale/missing readiness data.','Ask members to open scanner and send snapshot.');
  if (unpaid) add('Payouts','Unpaid payout balance exists','Medium',unpaid,'Tracked unpaid payouts total $'+unpaid+'.','Review payout center and mark paid when complete.');
  if (!needs.length) add('General','No urgent faction-wide gaps detected','Low',0,'Advisor did not find major gaps.','Keep data fresh.');
  // Replace old open needs with fresh snapshot without clearing history: append rows and let UI show newest.
  needs.forEach(function(n){ appendRowObject_(V24_SHEETS.FACTION_NEEDS, n); });
  return needs.length;
}

function v24GenerateAdvisorVisuals_(scoreBuckets, readinessBuckets) {
  var ts = nowIso_(), count = 0;
  Object.keys(scoreBuckets).forEach(function(k, i){ appendRowObject_(V24_SHEETS.ADVISOR_VISUALS, {Metric_ID:'VIS-SCORE-'+Utilities.getUuid().slice(0,6), Timestamp:ts, Metric:'Informed Score Buckets', Label:k, Value:scoreBuckets[k], Group:'Member Education', Sort:i, Notes:'Generated by Advisor.'}); count++; });
  Object.keys(readinessBuckets).forEach(function(k, i){ appendRowObject_(V24_SHEETS.ADVISOR_VISUALS, {Metric_ID:'VIS-READY-'+Utilities.getUuid().slice(0,6), Timestamp:ts, Metric:'War Readiness Buckets', Label:k, Value:readinessBuckets[k], Group:'War', Sort:i, Notes:'Generated by Advisor.'}); count++; });
  return count;
}

function v24GenerateAlertExplanations_() {
  var needs = v24SafeReadTable_(V24_SHEETS.FACTION_NEEDS).slice(-10);
  needs.forEach(function(n){ appendRowObject_(V24_SHEETS.ALERT_EXPLANATIONS, {Alert_ID:'ALERT-'+Utilities.getUuid().slice(0,8), Timestamp:nowIso_(), Alert_Type:n.Category, Title:n.Need, Message:n.Recommended_Action, Why:n.Evidence, Data_Used:'Faction needs + member advisor data', Priority:n.Priority, Posted:'FALSE', Audience:'Leadership'}); });
}

function v24GenerateOfficerQueue_() {
  var scores = v24SafeReadTable_(V24_SHEETS.MEMBER_ADVISOR_SCORES);
  scores.forEach(function(s){
    var score = Number(s.Informed_Score)||0;
    var ready = Number(s.War_Readiness)||0;
    if (score >= 75 && ready >= 70) return;
    var issue = score < 75 ? 'Low informed score' : 'Low war readiness';
    var severity = score < 45 || ready < 45 ? 'High' : 'Medium';
    upsertRowByKey_(V24_SHEETS.OFFICER_COACHING_QUEUE, 'Queue_ID', 'COACHQ-'+s.Torn_ID, {Queue_ID:'COACHQ-'+s.Torn_ID, Timestamp:nowIso_(), Torn_ID:s.Torn_ID, Name:s.Name, Issue:issue, Severity:severity, Recommended_Coach:'Officer/Mentor', Suggested_Message:'Hey '+s.Name+', your ShadowCore Advisor shows: '+s.Top_Gap+'. Please check My Advisor and fix the top action.', Status:'Open', Assigned_To:'', Due_Date:'', Evidence:s.Explanation, Updated:nowIso_()});
  });
}

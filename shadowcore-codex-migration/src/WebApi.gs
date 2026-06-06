/**
 * ShadowCore HQ - Functions called by the web frontend.
 */

function getPublicState() {
  return {
    app: {name: factionName_() + ' HQ', version: APP.VERSION, factionId: factionId_()},
    announcements: readTable_(APP.SHEETS.ANNOUNCEMENTS).filter(function(a) { return String(a.Active).toUpperCase() === 'TRUE'; }).slice(-5),
    rules: readTable_(APP.SHEETS.RULES).filter(function(r) { return String(r.Active).toUpperCase() === 'TRUE'; }),
    knowledgeBasePublic: readTable_(APP.SHEETS.KNOWLEDGE_BASE).filter(function(a) { return String(a.Active).toUpperCase() === 'TRUE' && /public|all/i.test(String(a.Audience || 'All')); }).slice(-50),
    recruitMicrosite: readTable_(APP.SHEETS.RECRUIT_MICROSITE).filter(function(s) { return String(s.Active).toUpperCase() === 'TRUE'; }).sort(function(a,b){return Number(a.Sort)-Number(b.Sort);}),
    apiDisclosure: setting_('Required_Key_Disclosure', requiredCustomSelectionsText_()),
    privacyDisclosure: (typeof privacyDisclosureText_ === 'function') ? privacyDisclosureText_() : '',
    theme: {mode: setting_('Theme_Mode','Anthracite'), accent: setting_('Theme_Accent','#f59e0b'), background: setting_('Theme_Background','#05070a'), customDomain: setting_('Public_Custom_Domain','')},
    version: APP.VERSION
  };
}

function getAppState(sessionId) {
  var session = getSession_(sessionId);
  var publicState = getPublicState();
  if (!session) {
    return {public: publicState, session: null};
  }
  var role = session.roleValue;
  var data = {
    public: publicState,
    session: session,
    dashboard: dashboardSummary_(),
    myScorecard: myScorecard_(session.tornId),
    myStatus: myStatus_(session.tornId),
    myPayouts: readTable_(APP.SHEETS.PAYOUTS).filter(function(p) { return String(p.Torn_ID) === String(session.tornId); }).slice(-20),
    myRequests: readTable_(APP.SHEETS.ARMORY_REQUESTS).filter(function(r) { return String(r.Torn_ID) === String(session.tornId); }).slice(-20),
    events: readTable_(APP.SHEETS.EVENTS).slice(-100),
    reports: readTable_(APP.SHEETS.REPORTS).slice(-20),
    announcements: publicState.announcements,
    mobileWarView: session ? getMobileWarView_(session.tornId) : null,
    myAssignments: session ? readTable_(APP.SHEETS.WAR_TARGETS).filter(function(t) { return String(t.Assigned_To_ID) === String(session.tornId); }).slice(-20) : [],
    myTraining: session ? readTable_(APP.SHEETS.TRAINING_TRACKER).filter(function(t) { return String(t.Torn_ID) === String(session.tornId); }).slice(-10) : [],
    myAvailability: session ? readTable_(APP.SHEETS.MEMBER_AVAILABILITY).filter(function(a) { return String(a.Torn_ID) === String(session.tornId); }).slice(-10) : [],
    myFactionLife: session ? getMyFactionLife_(session.tornId) : null,
    myLoans: session ? readTable_(APP.SHEETS.LOAN_COLLATERAL).filter(function(l) { return String(l.Torn_ID) === String(session.tornId); }).slice(-20) : [],
    myRevives: session ? readTable_(APP.SHEETS.REVIVE_BOARD).filter(function(r) { return String(r.Torn_ID) === String(session.tornId); }).slice(-20) : [],
    myAwards: session ? readTable_(APP.SHEETS.AWARDS).filter(function(a) { return String(a.Torn_ID) === String(session.tornId); }).slice(-50) : [],
    myOnboarding: session ? readTable_(APP.SHEETS.ONBOARDING).filter(function(o) { return String(o.Torn_ID) === String(session.tornId); }).slice(-50) : [],
    myMentorships: session ? readTable_(APP.SHEETS.MENTORSHIPS).filter(function(m) { return String(m.Mentee_ID) === String(session.tornId) || String(m.Mentor_ID) === String(session.tornId); }).slice(-20) : [],
    myApiKeyHealth: session ? readTable_(APP.SHEETS.API_KEY_HEALTH).filter(function(h) { return String(h.Torn_ID) === String(session.tornId); }).slice(-3) : [],
    activePolls: session ? getActivePollsForSession_(session) : [],
    knowledgeBase: session ? readTable_(APP.SHEETS.KNOWLEDGE_BASE).filter(function(a) { return String(a.Active).toUpperCase() === 'TRUE'; }).slice(-100) : publicState.knowledgeBasePublic,
    v16Privacy: (typeof getPrivacyDisclosure === 'function') ? getPrivacyDisclosure() : null,
    v20: (typeof getV20State_ === 'function') ? getV20State_() : null,
    v22: (typeof getV22State_ === 'function') ? getV22State_(session) : null,
    v24: (typeof getV24State_ === 'function') ? getV24State_(session) : null,
    v25: (typeof getV25State_ === 'function') ? getV25State_(session) : null
  };
  if (role >= APP.ROLES.CORE) {
    data.warTargets = readTable_(APP.SHEETS.WAR_TARGETS).slice(-200);
    data.chainLog = readTable_(APP.SHEETS.CHAIN_LOG).slice(-50);
  }
  if (role >= APP.ROLES.OFFICER) {
    data.applications = readTable_(APP.SHEETS.APPLICATIONS).slice(-200);
    data.armoryRequests = readTable_(APP.SHEETS.ARMORY_REQUESTS).slice(-200);
    data.enemyPlayers = readTable_(APP.SHEETS.ENEMY_PLAYERS).slice(-200);
    data.ocPlanner = readTable_(APP.SHEETS.OC_PLANNER).slice(-200);
    data.warCommitments = readTable_(APP.SHEETS.WAR_COMMITMENTS).slice(-300);
    data.strikeTeams = readTable_(APP.SHEETS.STRIKE_TEAMS).slice(-500);
    data.discipline = readTable_(APP.SHEETS.DISCIPLINE).slice(-300);
    data.economyLedger = readTable_(APP.SHEETS.ECONOMY_LEDGER).slice(-500);
    data.trainingTracker = readTable_(APP.SHEETS.TRAINING_TRACKER).slice(-300);
    data.applicantVetting = readTable_(APP.SHEETS.APPLICANT_VETTING).slice(-300);
    data.chainPlans = readTable_(APP.SHEETS.CHAIN_PLANS).slice(-100);
    data.bbcodeSnippets = readTable_(APP.SHEETS.BBCODE_SNIPPETS).slice(-100);
    data.htmlSnippets = readTable_(APP.SHEETS.HTML_SNIPPETS).slice(-150);
    data.officerTasks = readTable_(APP.SHEETS.OFFICER_TASKS).slice(-300);
    data.ruleChecks = readTable_(APP.SHEETS.RULE_CHECKS).slice(-500);
    data.enemyFactions = readTable_(APP.SHEETS.ENEMY_FACTIONS).slice(-200);
    data.battlePlans = readTable_(APP.SHEETS.BATTLE_PLANS).slice(-100);
    data.bankLedger = readTable_(APP.SHEETS.BANK_LEDGER).slice(-500);
    data.treasuryReports = readTable_(APP.SHEETS.TREASURY_REPORTS).slice(-100);
    data.loans = readTable_(APP.SHEETS.LOAN_COLLATERAL).slice(-500);
    data.reviveBoard = readTable_(APP.SHEETS.REVIVE_BOARD).slice(-500);
    data.availabilityCalendar = readTable_(APP.SHEETS.AVAILABILITY_CALENDAR).slice(-500);
    data.promotions = readTable_(APP.SHEETS.PROMOTIONS).slice(-500);
    data.awards = readTable_(APP.SHEETS.AWARDS).slice(-500);
    data.onboarding = readTable_(APP.SHEETS.ONBOARDING).slice(-500);
    data.mentorships = readTable_(APP.SHEETS.MENTORSHIPS).slice(-500);
    data.knowledgeBase = readTable_(APP.SHEETS.KNOWLEDGE_BASE).slice(-500);
    data.apiKeyHealth = readTable_(APP.SHEETS.API_KEY_HEALTH).slice(-500);
    data.polls = readTable_(APP.SHEETS.POLLS).slice(-300);
    data.pollVotes = readTable_(APP.SHEETS.POLL_VOTES).slice(-1000);
    data.recruitMicrosite = readTable_(APP.SHEETS.RECRUIT_MICROSITE).slice(-100);
    data.v16Officer = (typeof getV16State_ === 'function') ? getV16State_() : null;
    data.v18 = (typeof getV18State_ === 'function') ? getV18State_() : null;
    data.v19 = (typeof getV19State_ === 'function') ? getV19State_() : null;
    data.v20 = (typeof getV20State_ === 'function') ? getV20State_() : null;
    data.v23 = (typeof getV23HtmlEditorState_ === 'function') ? getV23HtmlEditorState_() : null;
  }
  if (role >= APP.ROLES.LEADER) {
    data.members = readTable_(APP.SHEETS.MEMBERS).slice(-500);
    data.memberStatuses = (typeof v22MergedMemberStatuses_ === 'function' ? v22MergedMemberStatuses_() : readTable_(APP.SHEETS.MEMBER_STATUS)).slice(-500);
    data.scorecards = readTable_(APP.SHEETS.MEMBER_SCORECARDS).slice(-500);
    data.payouts = readTable_(APP.SHEETS.PAYOUTS).slice(-500);
    data.reports = readTable_(APP.SHEETS.REPORTS).slice(-50);
    data.wars = readTable_(APP.SHEETS.WARS).slice(-100);
    data.audit = readTable_(APP.SHEETS.AUDIT_LOG).slice(-80);
    data.settings = publicSettings_();
    data.errors = readTable_(APP.SHEETS.ERRORS).slice(-50);
    data.v16 = (typeof getV16State_ === 'function') ? getV16State_() : null;
    data.v18 = (typeof getV18State_ === 'function') ? getV18State_() : null;
    data.v19 = (typeof getV19State_ === 'function') ? getV19State_() : null;
    data.v20 = (typeof getV20State_ === 'function') ? getV20State_() : null;
    data.v23 = (typeof getV23HtmlEditorState_ === 'function') ? getV23HtmlEditorState_() : null;
  }
  return data;
}

function dashboardSummary_() {
  var members = readTable_(APP.SHEETS.MEMBERS);
  var statuses = readTable_(APP.SHEETS.MEMBER_STATUS);
  var payouts = readTable_(APP.SHEETS.PAYOUTS);
  var chain = readTable_(APP.SHEETS.CHAIN_LOG).slice(-1)[0] || {};
  var okay = 0, hosp = 0, jail = 0, travel = 0;
  statuses.forEach(function(s) {
    var t = String(s.Status || '').toLowerCase();
    if (t.indexOf('okay') !== -1 || t === 'ok') okay++;
    if (t.indexOf('hospital') !== -1) hosp++;
    if (t.indexOf('jail') !== -1) jail++;
    if (t.indexOf('travel') !== -1 || t.indexOf('abroad') !== -1) travel++;
  });
  var unpaid = payouts.filter(function(p) { return String(p.Paid).toUpperCase() !== 'TRUE'; })
    .reduce(function(sum, p) { return sum + (Number(p.Total) || 0); }, 0);
  return {
    members: members.length,
    available: okay,
    hospitalized: hosp,
    jailed: jail,
    traveling: travel,
    chain: chain.Chain || 0,
    chainDanger: chain.Danger_Level || '',
    nextBonus: chain.Next_Bonus || '',
    unpaidPayouts: unpaid,
    pendingApplications: readTable_(APP.SHEETS.APPLICATIONS).filter(function(a) { return !a.Status || String(a.Status).toLowerCase() === 'new'; }).length,
    pendingRequests: readTable_(APP.SHEETS.ARMORY_REQUESTS).filter(function(r) { return !r.Status || String(r.Status).toLowerCase() === 'pending'; }).length
  };
}

function myScorecard_(tornId) {
  var rows = readTable_(APP.SHEETS.MEMBER_SCORECARDS).filter(function(r) { return String(r.Torn_ID) === String(tornId); });
  return rows.length ? rows[0] : null;
}

function myStatus_(tornId) {
  var rows = readTable_(APP.SHEETS.MEMBER_STATUS).filter(function(r) { return String(r.Torn_ID) === String(tornId); });
  return rows.length ? rows[0] : null;
}

function publicSettings_() {
  var settings = getSettingsMap_();
  var safe = {};
  ['Faction_Name', 'Faction_ID', 'Api_Cache_Seconds', 'Enable_Discord_Alerts', 'Discord_Webhook_War', 'Discord_Webhook_Chain', 'Discord_Webhook_Applications', 'Discord_Webhook_Armory', 'Discord_Webhook_Leadership', 'Payout_Per_Hit', 'Payout_Per_Respect', 'Payout_Per_KO', 'Payout_Per_Assist', 'Chain_Danger_Seconds', 'Store_Member_Keys', 'Admin_Emails', 'Auth_Mode', 'War_Checkin_Required', 'Min_War_Hits', 'Inactivity_Days_Warn', 'Require_Discord', 'Require_API_Key', 'Default_Training_Focus', 'Mobile_War_Message', 'Theme_Mode', 'Theme_Accent', 'Theme_Background', 'Public_Custom_Domain', 'Safe_Mode', 'Setup_Wizard_Complete'].forEach(function(k) {
    safe[k] = settings[k] || '';
  });
  safe.Web_App_URL = appUrl_();
  return safe;
}

function submitApplication(form) {
  form = form || {};
  var id = 'APP-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  var row = {
    Application_ID: id,
    Timestamp: nowIso_(),
    Torn_ID: String(form.tornId || ''),
    Name: String(form.name || ''),
    Level: Number(form.level) || '',
    Age_Days: Number(form.ageDays) || '',
    Battle_Stats_Estimate: String(form.battleStats || ''),
    Activity: String(form.activity || ''),
    War_Availability: String(form.availability || ''),
    Discord: String(form.discord || ''),
    Previous_Faction: String(form.previousFaction || ''),
    API_Verified: 'FALSE',
    Score: '',
    Status: 'New',
    Reviewed_By: '',
    Notes: String(form.notes || '')
  };
  appendRowObject_(APP.SHEETS.APPLICATIONS, row);
  calculateApplicantScores();
  sendDiscordAlert('Applications', '📥 New ShadowCore application from ' + row.Name + ' [' + row.Torn_ID + '].', {});
  return {ok: true, applicationId: id};
}

function reviewApplication(sessionId, applicationId, status, note) {
  var session = requireRole_(sessionId, 'OFFICER');
  var rows = readTable_(APP.SHEETS.APPLICATIONS);
  var found = null;
  rows.forEach(function(r) {
    if (String(r.Application_ID) === String(applicationId)) found = r;
  });
  if (!found) throw new Error('Application not found.');
  found.Status = status;
  found.Reviewed_By = session.name;
  found.Notes = note || found.Notes;
  upsertRowByKey_(APP.SHEETS.APPLICATIONS, 'Application_ID', applicationId, found);
  appendRowObject_(APP.SHEETS.APPLICATION_NOTES, {Timestamp: nowIso_(), Application_ID: applicationId, By: session.name, Note: status + ': ' + (note || '')});
  logAudit_(session.name, 'reviewApplication', {applicationId: applicationId, status: status});
  return {ok: true};
}

function submitArmoryRequest(sessionId, form) {
  var session = requireSession_(sessionId);
  form = form || {};
  var id = 'REQ-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  var row = {
    Request_ID: id,
    Timestamp: nowIso_(),
    Torn_ID: session.tornId,
    Name: session.name,
    Request_Type: String(form.type || ''),
    Item: String(form.item || ''),
    Quantity: Number(form.quantity) || 1,
    Reason: String(form.reason || ''),
    Urgency: String(form.urgency || 'Normal'),
    Status: 'Pending',
    Reviewed_By: '',
    Fulfilled_Date: '',
    Notes: ''
  };
  appendRowObject_(APP.SHEETS.ARMORY_REQUESTS, row);
  sendDiscordAlert('Armory', '🧰 New request from ' + session.name + ': ' + row.Quantity + 'x ' + row.Item + ' (' + row.Urgency + ').', {});
  return {ok: true, requestId: id};
}

function reviewArmoryRequest(sessionId, requestId, status, notes) {
  var session = requireRole_(sessionId, 'OFFICER');
  var rows = readTable_(APP.SHEETS.ARMORY_REQUESTS);
  var found = null;
  rows.forEach(function(r) { if (String(r.Request_ID) === String(requestId)) found = r; });
  if (!found) throw new Error('Request not found.');
  found.Status = status;
  found.Reviewed_By = session.name;
  found.Fulfilled_Date = /fulfilled|approved/i.test(status) ? nowIso_() : found.Fulfilled_Date;
  found.Notes = notes || found.Notes;
  upsertRowByKey_(APP.SHEETS.ARMORY_REQUESTS, 'Request_ID', requestId, found);
  logAudit_(session.name, 'reviewArmoryRequest', {requestId: requestId, status: status});
  return {ok: true};
}

function saveEnemyPlayer(sessionId, enemy) {
  var session = requireRole_(sessionId, 'OFFICER');
  enemy = enemy || {};
  var id = String(enemy.Enemy_ID || enemy.enemyId || '');
  if (!id) throw new Error('Enemy ID required.');
  upsertRowByKey_(APP.SHEETS.ENEMY_PLAYERS, 'Enemy_ID', id, {
    Enemy_ID: id,
    Name: enemy.Name || enemy.name || '',
    Faction_ID: enemy.Faction_ID || enemy.factionId || '',
    Level: enemy.Level || enemy.level || '',
    Status: enemy.Status || enemy.status || 'Unknown',
    Last_Seen: enemy.Last_Seen || '',
    Known_Strength: enemy.Known_Strength || '',
    Good_Target: enemy.Good_Target || '',
    Avoid: enemy.Avoid || '',
    Best_Attackers: enemy.Best_Attackers || '',
    Notes: enemy.Notes || enemy.notes || '',
    Updated: nowIso_()
  });
  targetOptimizer();
  logAudit_(session.name, 'saveEnemyPlayer', id);
  return {ok: true};
}

function saveOcPlan(sessionId, oc) {
  var session = requireRole_(sessionId, 'OFFICER');
  oc = oc || {};
  var id = oc.OC_ID || ('OC-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  appendRowObject_(APP.SHEETS.OC_PLANNER, {
    OC_ID: id,
    Crime: oc.Crime || oc.crime || '',
    Planned_Time: oc.Planned_Time || oc.plannedTime || '',
    Slot: oc.Slot || oc.slot || '',
    Torn_ID: oc.Torn_ID || oc.tornId || '',
    Name: oc.Name || oc.name || '',
    Role: oc.Role || oc.role || '',
    Status: oc.Status || 'Planned',
    Reliability: oc.Reliability || '',
    Expected_Payout: oc.Expected_Payout || '',
    Actual_Payout: oc.Actual_Payout || '',
    Result: oc.Result || '',
    Notes: oc.Notes || oc.notes || ''
  });
  logAudit_(session.name, 'saveOcPlan', id);
  return {ok: true, ocId: id};
}

function manualSyncFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'LEADER');
  var result = syncAll_();
  logAudit_(session.name, 'manualSyncFromWeb', result);
  return result;
}

function recalcPayoutsFromWeb(sessionId, warId) {
  var session = requireRole_(sessionId, 'LEADER');
  var result = calculateWarPayouts(warId);
  logAudit_(session.name, 'recalcPayoutsFromWeb', result);
  return result;
}

function saveSettingFromWeb(sessionId, key, value) {
  var session = requireRole_(sessionId, 'LEADER');
  var blocked = ['Admin_Token'];
  if (blocked.indexOf(String(key)) !== -1) throw new Error('This setting cannot be changed from the web UI.');
  var result = saveSetting_(key, value, 'Updated from web UI by ' + session.name);
  logAudit_(session.name, 'saveSettingFromWeb', key);
  return result;
}

function storeFactionLeaderKeyFromWeb(sessionId, key) {
  var session = requireRole_(sessionId, 'LEADER');
  var result = setFactionLeaderKey(key);
  logAudit_(session.name, 'storeFactionLeaderKeyFromWeb', result.fingerprint);
  return result;
}

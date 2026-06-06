/**
 * ShadowCore HQ - Functions called by the web frontend.
 */

function getPublicState(read) {
  read = read || readTable_;
  return {
    app: {name: factionName_() + ' HQ', version: APP.VERSION, factionId: factionId_()},
    announcements: activeRows_(read(APP.SHEETS.ANNOUNCEMENTS)).slice(-5),
    rules: activeRows_(read(APP.SHEETS.RULES)),
    knowledgeBasePublic: activeRows_(read(APP.SHEETS.KNOWLEDGE_BASE)).filter(function(a) { return /public|all/i.test(String(a.Audience || 'All')); }).slice(-50),
    recruitMicrosite: activeRows_(read(APP.SHEETS.RECRUIT_MICROSITE)).sort(numericSort_('Sort')),
    apiDisclosure: setting_('Required_Key_Disclosure', requiredCustomSelectionsText_()),
    privacyDisclosure: (typeof privacyDisclosureText_ === 'function') ? privacyDisclosureText_() : '',
    theme: {mode: setting_('Theme_Mode','Anthracite'), accent: setting_('Theme_Accent','#f59e0b'), background: setting_('Theme_Background','#05070a'), customDomain: setting_('Public_Custom_Domain','')},
    version: APP.VERSION
  };
}

function buildTableReader_() {
  var cache = {};
  return function(sheetName) {
    if (!Object.prototype.hasOwnProperty.call(cache, sheetName)) cache[sheetName] = readTable_(sheetName);
    return cache[sheetName];
  };
}

function rowsForTornId_(rows, tornId, field) {
  field = field || 'Torn_ID';
  var id = String(tornId || '');
  return rows.filter(function(row) { return String(row[field]) === id; });
}

function activeRows_(rows) {
  return rows.filter(function(row) { return String(row.Active).toUpperCase() === 'TRUE'; });
}

function numericSort_(field) {
  return function(a, b) {
    var left = Number(a[field]);
    var right = Number(b[field]);
    if (!isFinite(left)) left = 0;
    if (!isFinite(right)) right = 0;
    return left - right;
  };
}

function getAppState(sessionId) {
  var session = getSession_(sessionId);
  var read = buildTableReader_();
  var publicState = getPublicState(read);
  if (!session) {
    return {public: publicState, session: null};
  }
  var role = Number(session.roleValue || 0);
  var tornId = String(session.tornId || '');
  var payouts = read(APP.SHEETS.PAYOUTS);
  var armoryRequests = read(APP.SHEETS.ARMORY_REQUESTS);
  var warTargets = read(APP.SHEETS.WAR_TARGETS);
  var trainingTracker = read(APP.SHEETS.TRAINING_TRACKER);
  var knowledgeBase = read(APP.SHEETS.KNOWLEDGE_BASE);
  var reports = read(APP.SHEETS.REPORTS);

  var data = {
    public: publicState,
    session: session,
    dashboard: dashboardSummary_(read),
    myScorecard: firstRowForTornId_(read(APP.SHEETS.MEMBER_SCORECARDS), tornId),
    myStatus: firstRowForTornId_(read(APP.SHEETS.MEMBER_STATUS), tornId),
    myPayouts: rowsForTornId_(payouts, tornId).slice(-20),
    myRequests: rowsForTornId_(armoryRequests, tornId).slice(-20),
    events: read(APP.SHEETS.EVENTS).slice(-100),
    reports: reports.slice(-20),
    announcements: publicState.announcements,
    mobileWarView: getMobileWarView_(tornId),
    myAssignments: rowsForTornId_(warTargets, tornId, 'Assigned_To_ID').slice(-20),
    myTraining: rowsForTornId_(trainingTracker, tornId).slice(-10),
    myAvailability: rowsForTornId_(read(APP.SHEETS.MEMBER_AVAILABILITY), tornId).slice(-10),
    myFactionLife: getMyFactionLife_(tornId),
    myLoans: rowsForTornId_(read(APP.SHEETS.LOAN_COLLATERAL), tornId).slice(-20),
    myRevives: rowsForTornId_(read(APP.SHEETS.REVIVE_BOARD), tornId).slice(-20),
    myAwards: rowsForTornId_(read(APP.SHEETS.AWARDS), tornId).slice(-50),
    myOnboarding: rowsForTornId_(read(APP.SHEETS.ONBOARDING), tornId).slice(-50),
    myMentorships: read(APP.SHEETS.MENTORSHIPS).filter(function(m) { return String(m.Mentee_ID) === tornId || String(m.Mentor_ID) === tornId; }).slice(-20),
    myApiKeyHealth: rowsForTornId_(read(APP.SHEETS.API_KEY_HEALTH), tornId).slice(-3),
    activePolls: getActivePollsForSession_(session),
    knowledgeBase: activeRows_(knowledgeBase).slice(-100),
    v16Privacy: (typeof getPrivacyDisclosure === 'function') ? getPrivacyDisclosure() : null,
    v20: (typeof getV20State_ === 'function') ? getV20State_() : null,
    v22: (typeof getV22State_ === 'function') ? getV22State_(session) : null,
    v24: (typeof getV24State_ === 'function') ? getV24State_(session) : null,
    v25: (typeof getV25State_ === 'function') ? getV25State_(session) : null
  };
  if (role >= APP.ROLES.CORE) {
    data.warTargets = warTargets.slice(-200);
    data.chainLog = read(APP.SHEETS.CHAIN_LOG).slice(-50);
  }
  if (role >= APP.ROLES.OFFICER) {
    data.applications = read(APP.SHEETS.APPLICATIONS).slice(-200);
    data.armoryRequests = armoryRequests.slice(-200);
    data.enemyPlayers = read(APP.SHEETS.ENEMY_PLAYERS).slice(-200);
    data.ocPlanner = read(APP.SHEETS.OC_PLANNER).slice(-200);
    data.warCommitments = read(APP.SHEETS.WAR_COMMITMENTS).slice(-300);
    data.strikeTeams = read(APP.SHEETS.STRIKE_TEAMS).slice(-500);
    data.discipline = read(APP.SHEETS.DISCIPLINE).slice(-300);
    data.economyLedger = read(APP.SHEETS.ECONOMY_LEDGER).slice(-500);
    data.trainingTracker = trainingTracker.slice(-300);
    data.applicantVetting = read(APP.SHEETS.APPLICANT_VETTING).slice(-300);
    data.chainPlans = read(APP.SHEETS.CHAIN_PLANS).slice(-100);
    data.bbcodeSnippets = read(APP.SHEETS.BBCODE_SNIPPETS).slice(-100);
    data.htmlSnippets = read(APP.SHEETS.HTML_SNIPPETS).slice(-150);
    data.officerTasks = read(APP.SHEETS.OFFICER_TASKS).slice(-300);
    data.ruleChecks = read(APP.SHEETS.RULE_CHECKS).slice(-500);
    data.enemyFactions = read(APP.SHEETS.ENEMY_FACTIONS).slice(-200);
    data.battlePlans = read(APP.SHEETS.BATTLE_PLANS).slice(-100);
    data.bankLedger = read(APP.SHEETS.BANK_LEDGER).slice(-500);
    data.treasuryReports = read(APP.SHEETS.TREASURY_REPORTS).slice(-100);
    data.loans = read(APP.SHEETS.LOAN_COLLATERAL).slice(-500);
    data.reviveBoard = read(APP.SHEETS.REVIVE_BOARD).slice(-500);
    data.availabilityCalendar = read(APP.SHEETS.AVAILABILITY_CALENDAR).slice(-500);
    data.promotions = read(APP.SHEETS.PROMOTIONS).slice(-500);
    data.awards = read(APP.SHEETS.AWARDS).slice(-500);
    data.onboarding = read(APP.SHEETS.ONBOARDING).slice(-500);
    data.mentorships = read(APP.SHEETS.MENTORSHIPS).slice(-500);
    data.knowledgeBase = knowledgeBase.slice(-500);
    data.apiKeyHealth = read(APP.SHEETS.API_KEY_HEALTH).slice(-500);
    data.polls = read(APP.SHEETS.POLLS).slice(-300);
    data.pollVotes = read(APP.SHEETS.POLL_VOTES).slice(-1000);
    data.recruitMicrosite = read(APP.SHEETS.RECRUIT_MICROSITE).slice(-100);
    data.v16Officer = (typeof getV16State_ === 'function') ? getV16State_() : null;
    data.v18 = (typeof getV18State_ === 'function') ? getV18State_() : null;
    data.v19 = (typeof getV19State_ === 'function') ? getV19State_() : null;
    data.v20 = (typeof getV20State_ === 'function') ? getV20State_() : null;
    data.v23 = (typeof getV23HtmlEditorState_ === 'function') ? getV23HtmlEditorState_() : null;
  }
  if (role >= APP.ROLES.LEADER) {
    data.members = read(APP.SHEETS.MEMBERS).slice(-500);
    data.memberStatuses = (typeof v22MergedMemberStatuses_ === 'function' ? v22MergedMemberStatuses_() : read(APP.SHEETS.MEMBER_STATUS)).slice(-500);
    data.scorecards = read(APP.SHEETS.MEMBER_SCORECARDS).slice(-500);
    data.payouts = payouts.slice(-500);
    data.reports = reports.slice(-50);
    data.wars = read(APP.SHEETS.WARS).slice(-100);
    data.audit = read(APP.SHEETS.AUDIT_LOG).slice(-80);
    data.settings = publicSettings_();
    data.errors = read(APP.SHEETS.ERRORS).slice(-50);
    data.v16 = (typeof getV16State_ === 'function') ? getV16State_() : null;
    data.v18 = (typeof getV18State_ === 'function') ? getV18State_() : null;
    data.v19 = (typeof getV19State_ === 'function') ? getV19State_() : null;
    data.v20 = (typeof getV20State_ === 'function') ? getV20State_() : null;
    data.v23 = (typeof getV23HtmlEditorState_ === 'function') ? getV23HtmlEditorState_() : null;
  }
  return data;
}

function dashboardSummary_(read) {
  read = read || readTable_;
  var members = read(APP.SHEETS.MEMBERS);
  var statuses = read(APP.SHEETS.MEMBER_STATUS);
  var payouts = read(APP.SHEETS.PAYOUTS);
  var applications = read(APP.SHEETS.APPLICATIONS);
  var armoryRequests = read(APP.SHEETS.ARMORY_REQUESTS);
  var chain = read(APP.SHEETS.CHAIN_LOG).slice(-1)[0] || {};
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
    pendingApplications: applications.filter(function(a) { return !a.Status || String(a.Status).toLowerCase() === 'new'; }).length,
    pendingRequests: armoryRequests.filter(function(r) { return !r.Status || String(r.Status).toLowerCase() === 'pending'; }).length
  };
}

function firstRowForTornId_(rows, tornId) {
  rows = rowsForTornId_(rows, tornId);
  return rows.length ? rows[0] : null;
}

function myScorecard_(tornId) {
  return firstRowForTornId_(readTable_(APP.SHEETS.MEMBER_SCORECARDS), tornId);
}

function myStatus_(tornId) {
  return firstRowForTornId_(readTable_(APP.SHEETS.MEMBER_STATUS), tornId);
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

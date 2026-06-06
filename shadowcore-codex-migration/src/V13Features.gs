/**
 * ShadowCore HQ v1.3 Feature Pack
 * Adds: Treasurer dashboard, loan/collateral system, revive support, availability calendar,
 * promotion/rank queue, awards, onboarding, mentorships, knowledge base, API key health,
 * polls/voting, My Faction Life, and public recruitment microsite.
 */

function seedV13Defaults_() {
  var settings = [
    ['Public_Recruitment_Open', 'TRUE', 'Show application form and recruitment microsite content to public visitors.'],
    ['Promotion_Min_Score', '75', 'Default faction value threshold for promotion recommendations.'],
    ['Promotion_Core_Score', '85', 'Suggested score for Core Member promotion.'],
    ['Onboarding_Default_Assignee', 'Officer', 'Default owner for onboarding checklist tasks.'],
    ['Onboarding_Steps', 'Join Discord|Connect API key|Read rules|Submit availability|Request mentor|Complete first war check-in|Review payout rules', 'Pipe-separated onboarding checklist steps.'],
    ['Loan_Default_Status', 'Requested', 'Default status for new loan requests.'],
    ['Revive_Default_Priority', 'Normal', 'Default priority for revive/hospital support requests.'],
    ['Poll_Default_Audience', 'Members', 'Default audience for faction polls.'],
    ['Recruit_Microsite_Tagline', 'Organized wars, fair payouts, active leadership, and member growth.', 'Main public recruiting tagline.']
  ];
  settings.forEach(function(r) { saveSetting_(r[0], r[1], r[2]); });

  var microsite = [
    {Section_ID: 'HERO', Sort: 1, Title: factionName_() + ' is Recruiting', Content: setting_('Recruit_Microsite_Tagline', 'Organized wars, fair payouts, active leadership, and member growth.'), Button_Text: 'Apply Now', Button_URL: '?page=recruiting', Active: 'TRUE', Updated: nowIso_()},
    {Section_ID: 'BENEFITS', Sort: 2, Title: 'What We Offer', Content: 'Fair ranked war payouts\nOrganized target calls\nDiscord alerts\nArmory/request support\nTraining and mentor help\nClear promotion path', Button_Text: '', Button_URL: '', Active: 'TRUE', Updated: nowIso_()},
    {Section_ID: 'EXPECTATIONS', Sort: 3, Title: 'What We Expect', Content: 'Stay active\nCommunicate during wars\nFollow assignments\nRespect the payout/rule system\nKeep leadership updated on availability', Button_Text: 'Read Rules', Button_URL: '?page=knowledge', Active: 'TRUE', Updated: nowIso_()}
  ];
  upsertRowsByKey_(APP.SHEETS.RECRUIT_MICROSITE, 'Section_ID', microsite);

  var kb = [
    {Article_ID: 'KB-WELCOME', Category: 'Onboarding', Title: 'Welcome to ' + factionName_(), Audience: 'All', Content: 'Use this HQ for war orders, payout stubs, requests, recruitment, training, and faction planning.', Tags: 'welcome,onboarding', Active: 'TRUE', Updated: nowIso_(), Updated_By: 'system'},
    {Article_ID: 'KB-API', Category: 'API', Title: 'API Key Safety', Audience: 'All', Content: 'Only enter Torn API keys, never passwords. Use the fewest selections needed. You can delete your stored key from the Admin/Self-Service area.', Tags: 'api,security', Active: 'TRUE', Updated: nowIso_(), Updated_By: 'system'},
    {Article_ID: 'KB-WAR', Category: 'War', Title: 'War Basics', Audience: 'Members', Content: 'Check in before war, follow assignments, communicate in Discord, and do not waste bonus hits without orders.', Tags: 'war,chain,targets', Active: 'TRUE', Updated: nowIso_(), Updated_By: 'system'}
  ];
  upsertRowsByKey_(APP.SHEETS.KNOWLEDGE_BASE, 'Article_ID', kb);
}

/** 1. Faction Bank / Treasurer Dashboard */
function saveBankEntryFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = form.entryId || ('BANK-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Entry_ID: id,
    Timestamp: nowIso_(),
    Torn_ID: String(form.tornId || ''),
    Name: String(form.name || ''),
    Type: String(form.type || 'General'),
    Direction: String(form.direction || 'Out'),
    Amount: Number(form.amount) || 0,
    Item: String(form.item || ''),
    Quantity: Number(form.quantity) || '',
    Related_ID: String(form.relatedId || ''),
    Status: String(form.status || 'Open'),
    Logged_By: session.name,
    Notes: String(form.notes || '')
  };
  upsertRowByKey_(APP.SHEETS.BANK_LEDGER, 'Entry_ID', id, row);
  logAudit_(session.name, 'saveBankEntryFromWeb', row);
  return {ok: true, entryId: id};
}

function treasurySummary_() {
  var bankRows = readTable_(APP.SHEETS.BANK_LEDGER);
  var economyRows = readTable_(APP.SHEETS.ECONOMY_LEDGER);
  var allRows = bankRows.concat(economyRows.map(function(e) {
    return {Direction: e.Direction, Amount: e.Amount, Status: e.Status, Type: e.Category, Related_ID: e.Related_War_ID, Timestamp: e.Timestamp};
  }));
  var payouts = readTable_(APP.SHEETS.PAYOUTS);
  var loans = readTable_(APP.SHEETS.LOAN_COLLATERAL);
  var out = {inflow: 0, outflow: 0, net: 0, openEntries: 0, openLoans: 0, collateralValue: 0, unpaidPayouts: 0, entries: allRows.length};
  allRows.forEach(function(r) {
    var amt = Number(r.Amount) || 0;
    if (/in|income|donation|deposit/i.test(String(r.Direction))) out.inflow += amt; else out.outflow += amt;
    if (!/closed|paid|complete|repaid/i.test(String(r.Status))) out.openEntries++;
  });
  loans.forEach(function(l) {
    if (!/repaid|closed|denied|cancel/i.test(String(l.Status))) out.openLoans += Number(l.Principal) || 0;
    out.collateralValue += Number(l.Collateral_Value) || 0;
  });
  payouts.forEach(function(p) {
    if (String(p.Paid).toUpperCase() !== 'TRUE') out.unpaidPayouts += Number(p.Total) || 0;
  });
  out.net = out.inflow - out.outflow;
  return out;
}

function generateTreasuryReport() {
  var t = treasurySummary_();
  var period = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var body = [
    factionName_() + ' Treasury Report - ' + period,
    'Inflow: $' + t.inflow,
    'Outflow: $' + t.outflow,
    'Net: $' + t.net,
    'Open loans: $' + t.openLoans,
    'Collateral value: $' + t.collateralValue,
    'Unpaid payouts: $' + t.unpaidPayouts,
    'Open ledger entries: ' + t.openEntries
  ].join('\n');
  var bb = '[b]' + factionName_() + ' Treasury Report[/b]\n' +
    '[b]Inflow:[/b] $' + t.inflow + '\n' +
    '[b]Outflow:[/b] $' + t.outflow + '\n' +
    '[b]Net:[/b] $' + t.net + '\n' +
    '[b]Open loans:[/b] $' + t.openLoans + '\n' +
    '[b]Unpaid payouts:[/b] $' + t.unpaidPayouts;
  var row = {
    Report_ID: 'TREAS-' + Utilities.getUuid().slice(0, 8).toUpperCase(),
    Timestamp: nowIso_(),
    Period: period,
    Inflow: t.inflow,
    Outflow: t.outflow,
    Net: t.net,
    Open_Loans: t.openLoans,
    Collateral_Value: t.collateralValue,
    Unpaid_Payouts: t.unpaidPayouts,
    Body: body,
    BBCode: bb,
    Created_By: 'system'
  };
  appendRowObject_(APP.SHEETS.TREASURY_REPORTS, row);
  return {ok: true, summary: t, report: row};
}

function generateTreasuryReportFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'LEADER');
  var result = generateTreasuryReport();
  result.report.Created_By = session.name;
  upsertRowByKey_(APP.SHEETS.TREASURY_REPORTS, 'Report_ID', result.report.Report_ID, result.report);
  logAudit_(session.name, 'generateTreasuryReportFromWeb', result.summary);
  return result;
}

/** 2. Loan + Collateral System */
function saveLoanFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = form.loanId || ('LOAN-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Loan_ID: id,
    Timestamp: nowIso_(),
    Torn_ID: String(form.tornId || ''),
    Name: String(form.name || ''),
    Principal: Number(form.principal) || 0,
    Item: String(form.item || ''),
    Quantity: Number(form.quantity) || '',
    Collateral: String(form.collateral || ''),
    Collateral_Value: Number(form.collateralValue) || 0,
    Due_Date: String(form.dueDate || ''),
    Status: String(form.status || setting_('Loan_Default_Status', 'Requested')),
    Approved_By: session.name,
    Repaid_Date: String(form.repaidDate || ''),
    Notes: String(form.notes || '')
  };
  upsertRowByKey_(APP.SHEETS.LOAN_COLLATERAL, 'Loan_ID', id, row);
  logAudit_(session.name, 'saveLoanFromWeb', row);
  return {ok: true, loanId: id};
}

function requestLoanFromWeb(sessionId, form) {
  var session = requireSession_(sessionId);
  form = form || {};
  form.tornId = session.tornId;
  form.name = session.name;
  form.status = 'Requested';
  var fakeOfficer = createSystemOfficerSession_(session);
  return saveLoanFromWeb(fakeOfficer.sessionId, form);
}

function updateLoanStatusFromWeb(sessionId, loanId, status, note) {
  var session = requireRole_(sessionId, 'OFFICER');
  var rows = readTable_(APP.SHEETS.LOAN_COLLATERAL);
  var found = null;
  rows.forEach(function(r) { if (String(r.Loan_ID) === String(loanId)) found = r; });
  if (!found) throw new Error('Loan not found: ' + loanId);
  found.Status = String(status || found.Status);
  if (/repaid|closed|paid/i.test(found.Status)) found.Repaid_Date = nowIso_();
  found.Notes = appendNote_(found.Notes, note || ('Status set to ' + found.Status));
  upsertRowByKey_(APP.SHEETS.LOAN_COLLATERAL, 'Loan_ID', loanId, found);
  logAudit_(session.name, 'updateLoanStatusFromWeb', {loanId: loanId, status: found.Status});
  return {ok: true, loan: found};
}

/** 3. Revive / Hospital Support Board */
function submitReviveRequestFromWeb(sessionId, form) {
  var session = requireSession_(sessionId);
  form = form || {};
  var id = form.requestId || ('REV-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Request_ID: id,
    Timestamp: nowIso_(),
    Torn_ID: session.tornId,
    Name: session.name,
    Hospital_Until: String(form.hospitalUntil || ''),
    Priority: String(form.priority || setting_('Revive_Default_Priority', 'Normal')),
    Status: String(form.status || 'Requested'),
    Assigned_To: String(form.assignedTo || ''),
    Completed: '',
    Cost: Number(form.cost) || 0,
    Notes: String(form.notes || '')
  };
  upsertRowByKey_(APP.SHEETS.REVIVE_BOARD, 'Request_ID', id, row);
  logAudit_(session.name, 'submitReviveRequestFromWeb', row);
  return {ok: true, requestId: id};
}

function saveReviveCaseFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = form.requestId || ('REV-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Request_ID: id,
    Timestamp: nowIso_(),
    Torn_ID: String(form.tornId || ''),
    Name: String(form.name || ''),
    Hospital_Until: String(form.hospitalUntil || ''),
    Priority: String(form.priority || 'Normal'),
    Status: String(form.status || 'Open'),
    Assigned_To: String(form.assignedTo || ''),
    Completed: /complete|done|fulfilled/i.test(String(form.status || '')) ? nowIso_() : String(form.completed || ''),
    Cost: Number(form.cost) || 0,
    Notes: String(form.notes || '')
  };
  upsertRowByKey_(APP.SHEETS.REVIVE_BOARD, 'Request_ID', id, row);
  logAudit_(session.name, 'saveReviveCaseFromWeb', row);
  return {ok: true, requestId: id};
}

function buildHospitalSupportBoardFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var statuses = readTable_(APP.SHEETS.MEMBER_STATUS);
  var added = 0;
  statuses.forEach(function(s) {
    if (!/hospital/i.test(String(s.Status || ''))) return;
    var id = 'HOSP-' + s.Torn_ID;
    upsertRowByKey_(APP.SHEETS.REVIVE_BOARD, 'Request_ID', id, {
      Request_ID: id,
      Timestamp: nowIso_(),
      Torn_ID: s.Torn_ID,
      Name: s.Name,
      Hospital_Until: s.Hospital_Until || '',
      Priority: 'War Support',
      Status: 'Open',
      Assigned_To: '',
      Completed: '',
      Cost: 0,
      Notes: 'Auto-created from Member_Status hospital state.'
    });
    added++;
  });
  logAudit_(session.name, 'buildHospitalSupportBoardFromWeb', {added: added});
  return {ok: true, added: added};
}

/** 4. Member Availability Calendar */
function saveAvailabilityCalendarFromWeb(sessionId, form) {
  var session = requireSession_(sessionId);
  form = form || {};
  var officer = session.roleValue >= APP.ROLES.OFFICER;
  var tornId = officer && form.tornId ? String(form.tornId) : session.tornId;
  var name = officer && form.name ? String(form.name) : session.name;
  var day = String(form.day || 'Any');
  var window = String(form.window || 'Any');
  var tz = String(form.timezone || setting_('Default_Member_Timezone','America/New_York') || 'America/New_York');
  var viewerTz = String(form.viewerTimezone || tz);
  var parsed = (typeof v22ParseTimeWindow_ === 'function') ? v22ParseTimeWindow_(window) : {start:'',end:'',valid:false};
  var startTct = (typeof v22UtcHourFromLocal_ === 'function') ? v22UtcHourFromLocal_(parsed.start || 0, tz) : '';
  var endTct = (typeof v22UtcHourFromLocal_ === 'function') ? v22UtcHourFromLocal_(parsed.end || 24, tz) : '';
  var off = (typeof v22TimezoneOffsetHours_ === 'function') ? v22TimezoneOffsetHours_(tz) : '';
  var voff = (typeof v22TimezoneOffsetHours_ === 'function') ? v22TimezoneOffsetHours_(viewerTz) : '';
  var id = tornId + '|' + day + '|' + window + '|' + String(form.warId || 'GENERAL');
  var row = {
    Availability_ID: id, Torn_ID: tornId, Name: name, Day_Of_Week: day, Time_Window: window, Timezone: tz,
    Timezone_Offset: (typeof v22OffsetLabel_ === 'function') ? v22OffsetLabel_(off) : String(off),
    Viewer_Offset: (off !== '' && voff !== '') ? ((off-voff>=0?'+':'') + (off-voff) + 'h') : '',
    Start_Hour_Local: parsed.start, End_Hour_Local: parsed.end, Start_Hour_TCT: startTct, End_Hour_TCT: endTct,
    Role: String(form.role || ''), War_ID: String(form.warId || ''), Active: String(form.active || 'TRUE'), Updated: nowIso_(), Notes: String(form.notes || '')
  };
  upsertRowByKey_(APP.SHEETS.AVAILABILITY_CALENDAR, 'Availability_ID', id, row);
  logAudit_(session.name, 'saveAvailabilityCalendarFromWeb', row);
  return {ok: true, availabilityId: id};
}

/** 5. Promotion / Rank System */
function savePromotionFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = form.promotionId || ('PROMO-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Promotion_ID: id,
    Timestamp: nowIso_(),
    Torn_ID: String(form.tornId || ''),
    Name: String(form.name || ''),
    Current_Rank: String(form.currentRank || ''),
    Proposed_Rank: String(form.proposedRank || ''),
    Score: Number(form.score) || 0,
    Criteria_Met: String(form.criteria || ''),
    Status: String(form.status || 'Proposed'),
    Proposed_By: session.name,
    Decision_Date: /approved|denied|closed/i.test(String(form.status || '')) ? nowIso_() : '',
    Notes: String(form.notes || '')
  };
  upsertRowByKey_(APP.SHEETS.PROMOTIONS, 'Promotion_ID', id, row);
  logAudit_(session.name, 'savePromotionFromWeb', row);
  return {ok: true, promotionId: id};
}

function generatePromotionQueueFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var scorecards = readTable_(APP.SHEETS.MEMBER_SCORECARDS);
  var members = indexBy_(readTable_(APP.SHEETS.MEMBERS), 'Torn_ID');
  var min = numberSetting_('Promotion_Min_Score', 75);
  var core = numberSetting_('Promotion_Core_Score', 85);
  var created = 0;
  scorecards.forEach(function(s) {
    var score = Number(s.Faction_Value) || 0;
    if (score < min) return;
    var m = members[String(s.Torn_ID)] || {};
    var proposed = score >= core ? 'Core Member' : 'Reliable Member';
    var id = 'PROMO-' + s.Torn_ID;
    upsertRowByKey_(APP.SHEETS.PROMOTIONS, 'Promotion_ID', id, {
      Promotion_ID: id,
      Timestamp: nowIso_(),
      Torn_ID: s.Torn_ID,
      Name: s.Name,
      Current_Rank: m.Rank || m.Role || '',
      Proposed_Rank: proposed,
      Score: score,
      Criteria_Met: 'Faction value ' + score + ', grade ' + (s.Grade || ''),
      Status: 'Suggested',
      Proposed_By: 'system',
      Decision_Date: '',
      Notes: 'Auto-generated promotion recommendation.'
    });
    created++;
  });
  logAudit_(session.name, 'generatePromotionQueueFromWeb', {created: created});
  return {ok: true, created: created};
}

/** 6. Awards / Achievements */
function saveAwardFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = form.awardId || ('AWD-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Award_ID: id,
    Timestamp: nowIso_(),
    Torn_ID: String(form.tornId || ''),
    Name: String(form.name || ''),
    Award: String(form.award || ''),
    Category: String(form.category || 'General'),
    Related_ID: String(form.relatedId || ''),
    Awarded_By: session.name,
    Public: String(form.public || 'TRUE'),
    Notes: String(form.notes || '')
  };
  if (!row.Award) throw new Error('Award name is required.');
  upsertRowByKey_(APP.SHEETS.AWARDS, 'Award_ID', id, row);
  logAudit_(session.name, 'saveAwardFromWeb', row);
  return {ok: true, awardId: id};
}

function generateWeeklyAwardsFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var sc = readTable_(APP.SHEETS.MEMBER_SCORECARDS).sort(function(a, b) { return Number(b.Faction_Value) - Number(a.Faction_Value); });
  var made = [];
  if (sc[0]) made.push(autoAward_(sc[0], 'Faction MVP', 'Weekly'));
  var war = sc.slice().sort(function(a, b) { return Number(b.War_Score) - Number(a.War_Score); })[0];
  if (war) made.push(autoAward_(war, 'Top War Contributor', 'War'));
  var rel = sc.slice().sort(function(a, b) { return Number(b.Reliability_Score) - Number(a.Reliability_Score); })[0];
  if (rel) made.push(autoAward_(rel, 'Most Reliable', 'Reliability'));
  logAudit_(session.name, 'generateWeeklyAwardsFromWeb', {created: made.length});
  return {ok: true, created: made.length, awards: made};
}

function autoAward_(member, award, category) {
  var id = 'AUTO-' + category + '-' + member.Torn_ID + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var row = {Award_ID: id, Timestamp: nowIso_(), Torn_ID: member.Torn_ID, Name: member.Name, Award: award, Category: category, Related_ID: '', Awarded_By: 'system', Public: 'TRUE', Notes: 'Auto-generated from scorecards.'};
  upsertRowByKey_(APP.SHEETS.AWARDS, 'Award_ID', id, row);
  return row;
}

/** 7. New Member Onboarding */
function createOnboardingPlanFromWeb(sessionId, tornId, name) {
  var session = requireRole_(sessionId, 'OFFICER');
  tornId = String(tornId || '');
  if (!tornId) throw new Error('Torn ID required.');
  name = String(name || (memberById_(tornId) || {}).Name || 'Member');
  var steps = String(setting_('Onboarding_Steps', '')).split('|').filter(Boolean);
  var assignee = setting_('Onboarding_Default_Assignee', 'Officer');
  var created = 0;
  steps.forEach(function(step, idx) {
    var id = tornId + '|STEP-' + (idx + 1);
    upsertRowByKey_(APP.SHEETS.ONBOARDING, 'Onboarding_ID', id, {
      Onboarding_ID: id,
      Torn_ID: tornId,
      Name: name,
      Step: step,
      Status: 'Open',
      Assigned_To: assignee,
      Due_Date: '',
      Completed: '',
      Updated: nowIso_(),
      Notes: 'Onboarding checklist item.'
    });
    created++;
  });
  logAudit_(session.name, 'createOnboardingPlanFromWeb', {tornId: tornId, created: created});
  return {ok: true, created: created};
}

function updateOnboardingStepFromWeb(sessionId, onboardingId, status, notes) {
  var session = requireSession_(sessionId);
  var rows = readTable_(APP.SHEETS.ONBOARDING);
  var row = null;
  rows.forEach(function(r) { if (String(r.Onboarding_ID) === String(onboardingId)) row = r; });
  if (!row) throw new Error('Onboarding item not found: ' + onboardingId);
  if (String(row.Torn_ID) !== String(session.tornId) && session.roleValue < APP.ROLES.OFFICER) throw new Error('Permission denied.');
  row.Status = String(status || row.Status);
  row.Completed = /done|complete/i.test(row.Status) ? nowIso_() : row.Completed;
  row.Updated = nowIso_();
  row.Notes = appendNote_(row.Notes, notes || ('Updated to ' + row.Status));
  upsertRowByKey_(APP.SHEETS.ONBOARDING, 'Onboarding_ID', onboardingId, row);
  logAudit_(session.name, 'updateOnboardingStepFromWeb', {onboardingId: onboardingId, status: row.Status});
  return {ok: true, onboarding: row};
}

/** 8. Mentor / Coaching System */
function saveMentorshipFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = form.mentorshipId || ('MENTOR-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Mentorship_ID: id,
    Mentee_ID: String(form.menteeId || ''),
    Mentee_Name: String(form.menteeName || ''),
    Mentor_ID: String(form.mentorId || ''),
    Mentor_Name: String(form.mentorName || ''),
    Status: String(form.status || 'Active'),
    Start_Date: String(form.startDate || nowIso_()),
    Checkin_Frequency: String(form.frequency || 'Weekly'),
    Last_Checkin: String(form.lastCheckin || ''),
    Next_Checkin: String(form.nextCheckin || ''),
    Goals: String(form.goals || ''),
    Notes: String(form.notes || '')
  };
  upsertRowByKey_(APP.SHEETS.MENTORSHIPS, 'Mentorship_ID', id, row);
  logAudit_(session.name, 'saveMentorshipFromWeb', row);
  return {ok: true, mentorshipId: id};
}

function logMentorCheckinFromWeb(sessionId, mentorshipId, note) {
  var session = requireSession_(sessionId);
  var rows = readTable_(APP.SHEETS.MENTORSHIPS);
  var row = null;
  rows.forEach(function(r) { if (String(r.Mentorship_ID) === String(mentorshipId)) row = r; });
  if (!row) throw new Error('Mentorship not found: ' + mentorshipId);
  if (String(row.Mentor_ID) !== String(session.tornId) && String(row.Mentee_ID) !== String(session.tornId) && session.roleValue < APP.ROLES.OFFICER) throw new Error('Permission denied.');
  row.Last_Checkin = nowIso_();
  row.Notes = appendNote_(row.Notes, note || 'Check-in logged.');
  upsertRowByKey_(APP.SHEETS.MENTORSHIPS, 'Mentorship_ID', mentorshipId, row);
  logAudit_(session.name, 'logMentorCheckinFromWeb', {mentorshipId: mentorshipId});
  return {ok: true, mentorship: row};
}

/** 9. Knowledge Base */
function saveKnowledgeArticleFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = form.articleId || ('KB-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Article_ID: id,
    Category: String(form.category || 'General'),
    Title: String(form.title || ''),
    Audience: String(form.audience || 'Members'),
    Content: String(form.content || ''),
    Tags: String(form.tags || ''),
    Active: String(form.active || 'TRUE'),
    Updated: nowIso_(),
    Updated_By: session.name
  };
  if (!row.Title) throw new Error('Article title is required.');
  upsertRowByKey_(APP.SHEETS.KNOWLEDGE_BASE, 'Article_ID', id, row);
  logAudit_(session.name, 'saveKnowledgeArticleFromWeb', row.Title);
  return {ok: true, articleId: id};
}

/** 10. API Key Health Center */
function runApiKeyHealthAudit() {
  var api = indexBy_(readTable_(APP.SHEETS.API_KEYS), 'Torn_ID');
  var members = readTable_(APP.SHEETS.MEMBERS);
  var count = 0;
  members.forEach(function(m) {
    var id = String(m.Torn_ID);
    var key = api[id];
    var stored = key ? String(key.Stored || '') : 'FALSE';
    var status = key ? String(key.Status || '') : 'Missing';
    var last = key ? String(key.Last_Checked || '') : '';
    var age = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : '';
    if (isNaN(age)) age = '';
    var missing = [];
    if (!key) missing.push('No API key row');
    if (key && !String(key.Selections || '').trim()) missing.push('Selections not listed');
    if (key && /full|unknown|not provided/i.test(String(key.Access_Level || '') + ' ' + String(key.Selections || ''))) missing.push('Review/minimize access level');
    var risk = !key ? 'High' : (/invalid|deleted|error/i.test(status) ? 'High' : (missing.length ? 'Medium' : 'Low'));
    var action = !key ? 'Ask member to connect key or mark as exempt' : (missing.length ? 'Review consent/selections' : 'OK');
    var row = {
      Check_ID: id,
      Timestamp: nowIso_(),
      Torn_ID: id,
      Name: m.Name,
      Stored: stored,
      Status: status,
      Last_Checked: last,
      Age_Days: age,
      Risk_Level: risk,
      Missing_Selections: missing.join('; '),
      Recommended_Action: action
    };
    upsertRowByKey_(APP.SHEETS.API_KEY_HEALTH, 'Check_ID', id, row);
    count++;
  });
  return {ok: true, checked: count};
}

function runApiKeyHealthAuditFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'LEADER');
  var result = runApiKeyHealthAudit();
  logAudit_(session.name, 'runApiKeyHealthAuditFromWeb', result);
  return result;
}

/** 11. Polls / Voting */
function createPollFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = form.pollId || ('POLL-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var options = String(form.options || '').split(/\r?\n|\|/).map(function(x) { return x.trim(); }).filter(Boolean);
  if (!form.title) throw new Error('Poll title is required.');
  if (options.length < 2) throw new Error('Poll needs at least two options.');
  var row = {
    Poll_ID: id,
    Title: String(form.title || ''),
    Description: String(form.description || ''),
    Options: options.join('|'),
    Audience: String(form.audience || setting_('Poll_Default_Audience', 'Members')),
    Status: String(form.status || 'Open'),
    Created: nowIso_(),
    Closes: String(form.closes || ''),
    Created_By: session.name,
    Results_JSON: '{}'
  };
  upsertRowByKey_(APP.SHEETS.POLLS, 'Poll_ID', id, row);
  logAudit_(session.name, 'createPollFromWeb', row.Title);
  return {ok: true, pollId: id};
}

function votePollFromWeb(sessionId, pollId, choice) {
  var session = requireSession_(sessionId);
  var poll = pollById_(pollId);
  if (!poll) throw new Error('Poll not found: ' + pollId);
  if (!/open/i.test(String(poll.Status))) throw new Error('Poll is not open.');
  var options = String(poll.Options || '').split('|');
  if (options.indexOf(String(choice)) === -1) throw new Error('Invalid poll choice.');
  var voteId = pollId + '|' + session.tornId;
  var row = {Vote_ID: voteId, Poll_ID: pollId, Torn_ID: session.tornId, Name: session.name, Choice: String(choice), Timestamp: nowIso_()};
  upsertRowByKey_(APP.SHEETS.POLL_VOTES, 'Vote_ID', voteId, row);
  updatePollResults_(pollId);
  logAudit_(session.name, 'votePollFromWeb', {pollId: pollId, choice: choice});
  return {ok: true, vote: row};
}

function closePollFromWeb(sessionId, pollId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var poll = pollById_(pollId);
  if (!poll) throw new Error('Poll not found: ' + pollId);
  poll.Status = 'Closed';
  updatePollResults_(pollId, poll);
  upsertRowByKey_(APP.SHEETS.POLLS, 'Poll_ID', pollId, poll);
  logAudit_(session.name, 'closePollFromWeb', pollId);
  return {ok: true};
}

function pollById_(pollId) {
  var rows = readTable_(APP.SHEETS.POLLS);
  for (var i = 0; i < rows.length; i++) if (String(rows[i].Poll_ID) === String(pollId)) return rows[i];
  return null;
}

function updatePollResults_(pollId, existingPoll) {
  var poll = existingPoll || pollById_(pollId);
  if (!poll) return null;
  var votes = readTable_(APP.SHEETS.POLL_VOTES).filter(function(v) { return String(v.Poll_ID) === String(pollId); });
  var results = {};
  String(poll.Options || '').split('|').forEach(function(o) { if (o) results[o] = 0; });
  votes.forEach(function(v) { results[String(v.Choice)] = (results[String(v.Choice)] || 0) + 1; });
  poll.Results_JSON = safeJson_({total: votes.length, results: results});
  upsertRowByKey_(APP.SHEETS.POLLS, 'Poll_ID', pollId, poll);
  return poll;
}

function getActivePollsForSession_(session) {
  var polls = readTable_(APP.SHEETS.POLLS).filter(function(p) { return /open/i.test(String(p.Status || 'Open')); });
  var votes = indexBy_(readTable_(APP.SHEETS.POLL_VOTES).filter(function(v) { return String(v.Torn_ID) === String(session.tornId); }), 'Poll_ID');
  return polls.map(function(p) {
    p.My_Vote = votes[String(p.Poll_ID)] ? votes[String(p.Poll_ID)].Choice : '';
    return p;
  });
}

/** 12. My Faction Life page */
function getMyFactionLife_(tornId) {
  var member = memberById_(tornId) || {};
  var status = myStatus_(tornId) || {};
  var scorecard = myScorecard_(tornId) || {};
  var payouts = readTable_(APP.SHEETS.PAYOUTS).filter(function(p) { return String(p.Torn_ID) === String(tornId); });
  var unpaid = 0, paid = 0;
  payouts.forEach(function(p) { if (String(p.Paid).toUpperCase() === 'TRUE') paid += Number(p.Total) || 0; else unpaid += Number(p.Total) || 0; });
  var loans = readTable_(APP.SHEETS.LOAN_COLLATERAL).filter(function(l) { return String(l.Torn_ID) === String(tornId); });
  var openLoans = loans.filter(function(l) { return !/repaid|closed|denied|cancel/i.test(String(l.Status)); });
  var requests = readTable_(APP.SHEETS.ARMORY_REQUESTS).filter(function(r) { return String(r.Torn_ID) === String(tornId); });
  var awards = readTable_(APP.SHEETS.AWARDS).filter(function(a) { return String(a.Torn_ID) === String(tornId); });
  var onboarding = readTable_(APP.SHEETS.ONBOARDING).filter(function(o) { return String(o.Torn_ID) === String(tornId); });
  var doneOnboarding = onboarding.filter(function(o) { return /done|complete/i.test(String(o.Status)); }).length;
  var apiHealth = readTable_(APP.SHEETS.API_KEY_HEALTH).filter(function(h) { return String(h.Torn_ID) === String(tornId); }).slice(-1)[0] || {};
  var training = readTable_(APP.SHEETS.TRAINING_TRACKER).filter(function(t) { return String(t.Torn_ID) === String(tornId); }).slice(-1)[0] || {};
  var mentors = readTable_(APP.SHEETS.MENTORSHIPS).filter(function(m) { return String(m.Mentee_ID) === String(tornId) || String(m.Mentor_ID) === String(tornId); });
  return {
    member: member,
    status: status,
    scorecard: scorecard,
    summary: {
      Paid_Payouts: paid,
      Unpaid_Payouts: unpaid,
      Open_Loans: openLoans.length,
      Open_Requests: requests.filter(function(r) { return !/fulfilled|denied|closed/i.test(String(r.Status)); }).length,
      Awards: awards.length,
      Onboarding_Progress: onboarding.length ? (doneOnboarding + '/' + onboarding.length) : 'Not started',
      API_Risk: apiHealth.Risk_Level || 'Unknown',
      Current_Goal: training.Goal || ''
    },
    payouts: payouts.slice(-10),
    loans: loans.slice(-10),
    awards: awards.slice(-20),
    onboarding: onboarding,
    mentors: mentors,
    training: training,
    apiHealth: apiHealth
  };
}

function getMyFactionLifeFromWeb(sessionId) {
  var session = requireSession_(sessionId);
  return getMyFactionLife_(session.tornId);
}

/** 13. Public Recruitment Microsite */
function saveRecruitmentMicrositeSectionFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = form.sectionId || ('SITE-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Section_ID: id,
    Sort: Number(form.sort) || 50,
    Title: String(form.title || ''),
    Content: String(form.content || ''),
    Button_Text: String(form.buttonText || ''),
    Button_URL: String(form.buttonUrl || ''),
    Active: String(form.active || 'TRUE'),
    Updated: nowIso_()
  };
  if (!row.Title) throw new Error('Section title is required.');
  upsertRowByKey_(APP.SHEETS.RECRUIT_MICROSITE, 'Section_ID', id, row);
  logAudit_(session.name, 'saveRecruitmentMicrositeSectionFromWeb', row.Title);
  return {ok: true, sectionId: id};
}

/** helper used by requestLoanFromWeb */
function createSystemOfficerSession_(session) {
  var id = 'TEMP_' + Utilities.getUuid();
  var temp = {sessionId: id, tornId: session.tornId, name: session.name, role: 'OFFICER', roleValue: APP.ROLES.OFFICER, user: {email: ''}};
  CacheService.getScriptCache().put('SESSION_' + id, safeJson_(temp), 60);
  return temp;
}

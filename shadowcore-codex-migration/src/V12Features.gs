/**
 * ShadowCore HQ v1.2 Mega Feature Pack
 * Adds all 15 requested expansion modules:
 * 1 battle plans, 2 war contracts, 3 strike teams, 4 discipline,
 * 5 economy ledger, 6 training tracker, 7 applicant vetting,
 * 8 enemy faction library, 9 chain bonus planner, 10 mobile war view,
 * 11 HTML code editor / legacy BBCode archive, 12 Discord embeds, 13 officer tasks,
 * 14 member self-service, 15 rule enforcement.
 */

function seedV12Defaults_() {
  var settings = [
    ['War_Checkin_Required', 'TRUE', 'Require a war commitment/check-in before ranked wars.'],
    ['Min_War_Hits', '5', 'Minimum expected successful hits during active wars.'],
    ['Inactivity_Days_Warn', '3', 'Create warnings when last action appears older than this many days.'],
    ['Require_Discord', 'TRUE', 'Rule compliance checks require a Discord name.'],
    ['Require_API_Key', 'TRUE', 'Rule compliance checks require a stored or verified API key.'],
    ['Default_Training_Focus', 'balanced battle stats and reliability', 'Default text for member training plans.'],
    ['Mobile_War_Message', 'Follow your assignment, communicate, and do not waste bonus hits.', 'Text shown on mobile war page.']
  ];
  settings.forEach(function(r) { saveSetting_(r[0], r[1], r[2]); });

  var starterTasks = [
    {Task_ID: 'TASK-SETUP-WAR', Created: nowIso_(), Title: 'Create first active war row', Assigned_To: 'Leader', Due_Date: '', Priority: 'High', Status: 'Open', Related_ID: '', Completed: '', Notes: 'Use War Room or Battle Plan page.'},
    {Task_ID: 'TASK-SETUP-RULES', Created: nowIso_(), Title: 'Review rule enforcement thresholds', Assigned_To: 'Leader', Due_Date: '', Priority: 'Medium', Status: 'Open', Related_ID: '', Completed: '', Notes: 'Check Settings: Min_War_Hits, Require_Discord, Require_API_Key.'}
  ];
  upsertRowsByKey_(APP.SHEETS.OFFICER_TASKS, 'Task_ID', starterTasks);
}

/** 1. War Battle Plan Generator */
function generateLatestWarBattlePlan() {
  var active = activeWar_();
  return generateWarBattlePlan(active ? active.War_ID : 'GENERAL');
}

function generateWarBattlePlan(warId) {
  warId = warId || (activeWar_() ? activeWar_().War_ID : 'GENERAL');
  var targets = readTable_(APP.SHEETS.WAR_TARGETS).filter(function(t) { return String(t.War_ID) === String(warId); });
  if (!targets.length) {
    targetOptimizer();
    targets = readTable_(APP.SHEETS.WAR_TARGETS).filter(function(t) { return String(t.War_ID) === String(warId); });
  }
  var members = readTable_(APP.SHEETS.MEMBER_SCORECARDS).sort(function(a, b) {
    return Number(b.Faction_Value) - Number(a.Faction_Value);
  });
  var chain = latestChain_();
  var high = targets.filter(function(t) { return String(t.Priority).toLowerCase() === 'high'; });
  var medium = targets.filter(function(t) { return String(t.Priority).toLowerCase() === 'medium'; });
  var avoid = targets.filter(function(t) { return Number(t.Score) < 35 || /avoid|hospital|travel|jail/i.test(String(t.Notes) + ' ' + String(t.Status)); });
  var assignments = [];
  var pool = high.concat(medium).slice(0, Math.max(1, members.length));
  pool.forEach(function(t, idx) {
    var m = members[idx % Math.max(1, members.length)] || {};
    assignments.push({targetId: t.Target_ID, enemy: t.Enemy_Name, priority: t.Priority, assignedToId: m.Torn_ID || '', assignedTo: m.Name || '', reason: 'Score ' + (t.Score || 0)});
  });
  var phase = determineWarPhase_(chain.Chain || 0);
  var summary = [
    'Phase: ' + phase,
    'Use high-priority safe targets first. Keep risky/avoid targets away from recruits.',
    'Recommended openers: ' + assignments.slice(0, 8).map(function(a) { return a.assignedTo + ' → ' + a.enemy; }).filter(Boolean).join('; '),
    'Avoid list: ' + avoid.slice(0, 10).map(function(t) { return t.Enemy_Name || t.Enemy_ID; }).join(', ')
  ].join('\n');
  var chainAdvice = generateChainAdvice_(chain);
  var row = {
    Plan_ID: 'PLAN-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss'),
    Timestamp: nowIso_(),
    War_ID: warId,
    Phase: phase,
    Summary: summary,
    Assignments_JSON: safeJson_(assignments).slice(0, 50000),
    Risk_Notes: avoid.length ? ('Avoid/risky targets: ' + avoid.slice(0, 20).map(function(t) { return t.Enemy_Name || t.Enemy_ID; }).join(', ')) : 'No avoid list yet.',
    Chain_Advice: chainAdvice,
    Status: 'Generated'
  };
  appendRowObject_(APP.SHEETS.BATTLE_PLANS, row);
  appendBBCodeSnippet_('BattlePlan', 'Battle Plan - ' + warId, battlePlanToBBCode_(row), row.Summary, 'system');
  return {ok: true, plan: row, assignments: assignments};
}

function generateWarBattlePlanFromWeb(sessionId, warId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var result = generateWarBattlePlan(warId || (activeWar_() ? activeWar_().War_ID : 'GENERAL'));
  logAudit_(session.name, 'generateWarBattlePlanFromWeb', result.plan.Plan_ID);
  return result;
}

function determineWarPhase_(chain) {
  chain = Number(chain) || 0;
  if (chain < 25) return 'Opening';
  if (chain < 100) return 'Pressure';
  if (chain < 250) return 'Build to bonus';
  return 'Closeout / bonus control';
}

function battlePlanToBBCode_(plan) {
  return '[center][b][size=18]' + factionName_() + ' Battle Plan[/size][/b][/center]\n' +
    '[b]War:[/b] ' + plan.War_ID + '\n' +
    '[b]Phase:[/b] ' + plan.Phase + '\n\n' +
    '[b]Summary:[/b]\n' + plan.Summary + '\n\n' +
    '[b]Chain advice:[/b]\n' + plan.Chain_Advice + '\n\n' +
    '[b]Risk notes:[/b]\n' + plan.Risk_Notes;
}

/** 2. Member War Contract / check-in */
function submitWarCommitment(sessionId, form) {
  var session = requireSession_(sessionId);
  form = form || {};
  var active = activeWar_();
  var warId = form.warId || (active ? active.War_ID : 'GENERAL');
  var row = {
    Commitment_ID: String(warId) + '|' + session.tornId,
    War_ID: warId,
    Torn_ID: session.tornId,
    Name: session.name,
    Available: String(form.available || 'TRUE'),
    Time_Windows: String(form.timeWindows || ''),
    Can_Hit: String(form.canHit || 'TRUE'),
    Can_Chain: String(form.canChain || 'TRUE'),
    Notes: String(form.notes || ''),
    Timestamp: nowIso_()
  };
  upsertRowByKey_(APP.SHEETS.WAR_COMMITMENTS, 'Commitment_ID', row.Commitment_ID, row);
  upsertRowByKey_(APP.SHEETS.MEMBER_AVAILABILITY, 'Availability_ID', row.Commitment_ID, {
    Availability_ID: row.Commitment_ID,
    War_ID: row.War_ID,
    Torn_ID: row.Torn_ID,
    Name: row.Name,
    Time_Windows: row.Time_Windows,
    Timezone: String(form.timezone || ''),
    Discord: String(form.discord || ''),
    Notes: row.Notes,
    Updated: nowIso_()
  });
  logAudit_(session.name, 'submitWarCommitment', row);
  return {ok: true, commitment: row};
}

function submitWarCommitmentFromWeb(sessionId, form) { return submitWarCommitment(sessionId, form); }

/** 3. Strike Team Builder */
function buildStrikeTeams(warId) {
  warId = warId || (activeWar_() ? activeWar_().War_ID : 'GENERAL');
  var scorecards = readTable_(APP.SHEETS.MEMBER_SCORECARDS).sort(function(a, b) { return Number(b.Faction_Value) - Number(a.Faction_Value); });
  var statuses = indexBy_(readTable_(APP.SHEETS.MEMBER_STATUS), 'Torn_ID');
  var teams = [
    {name: 'Alpha Team', role: 'Main hitter'},
    {name: 'Bravo Team', role: 'Chain support'},
    {name: 'Ghost Team', role: 'Late-night / reserve'},
    {name: 'Medic Team', role: 'Hospital/revive/support'},
    {name: 'Recruit Team', role: 'Safe low-risk targets'}
  ];
  var rows = [];
  scorecards.forEach(function(m, idx) {
    var st = statuses[String(m.Torn_ID)] || {};
    var statusText = String(st.Status || '').toLowerCase();
    var team = teams[idx % teams.length];
    if (/hospital|medical/.test(statusText)) team = teams[3];
    if (Number(m.Faction_Value) >= 85) team = teams[0];
    if (Number(m.Faction_Value) < 55) team = teams[4];
    var row = {
      Team_ID: String(warId) + '|' + team.name + '|' + m.Torn_ID,
      War_ID: warId,
      Team_Name: team.name,
      Captain_ID: '',
      Captain_Name: '',
      Torn_ID: m.Torn_ID,
      Name: m.Name,
      Role: team.role,
      Status: 'Active',
      Notes: 'Auto-built from scorecard ' + (m.Faction_Value || '') + ' and status ' + (st.Status || ''),
      Updated: nowIso_()
    };
    upsertRowByKey_(APP.SHEETS.STRIKE_TEAMS, 'Team_ID', row.Team_ID, row);
    rows.push(row);
  });
  return {ok: true, warId: warId, rows: rows.length};
}

function buildStrikeTeamsFromWeb(sessionId, warId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var result = buildStrikeTeams(warId);
  logAudit_(session.name, 'buildStrikeTeamsFromWeb', result);
  return result;
}

/** 4. Inactivity and discipline */
function logDisciplineCaseFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = form.caseId || ('CASE-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Case_ID: id,
    Timestamp: nowIso_(),
    Torn_ID: String(form.tornId || ''),
    Name: String(form.name || ''),
    Issue_Type: String(form.issueType || 'General'),
    Severity: String(form.severity || 'Medium'),
    Status: String(form.status || 'Open'),
    Action_Recommended: String(form.action || ''),
    Logged_By: session.name,
    Notes: String(form.notes || '')
  };
  upsertRowByKey_(APP.SHEETS.DISCIPLINE, 'Case_ID', id, row);
  logAudit_(session.name, 'logDisciplineCaseFromWeb', row);
  return {ok: true, caseId: id};
}

function generateDisciplineRecommendations() {
  var scorecards = readTable_(APP.SHEETS.MEMBER_SCORECARDS);
  var commitments = readTable_(APP.SHEETS.WAR_COMMITMENTS);
  var committed = {};
  commitments.forEach(function(c) { committed[String(c.War_ID) + '|' + String(c.Torn_ID)] = c; });
  var active = activeWar_();
  var warId = active ? active.War_ID : 'GENERAL';
  var created = 0;
  scorecards.forEach(function(s) {
    var issues = [];
    if (Number(s.Activity_Score) < 30) issues.push('Inactive/unavailable');
    if (active && boolSetting_('War_Checkin_Required', true) && !committed[String(warId) + '|' + String(s.Torn_ID)]) issues.push('No war check-in');
    if (active && Number(s.War_Score) < 10) issues.push('Low war contribution');
    if (!issues.length) return;
    var id = 'AUTO-' + String(warId) + '-' + s.Torn_ID;
    upsertRowByKey_(APP.SHEETS.DISCIPLINE, 'Case_ID', id, {
      Case_ID: id,
      Timestamp: nowIso_(),
      Torn_ID: s.Torn_ID,
      Name: s.Name,
      Issue_Type: issues.join('; '),
      Severity: issues.length > 1 ? 'High' : 'Medium',
      Status: 'Review',
      Action_Recommended: Number(s.Faction_Value) < 40 ? 'Warning or removal review' : 'Coach / remind',
      Logged_By: 'system',
      Notes: 'Auto-generated from scorecards and war commitments.'
    });
    created++;
  });
  return {ok: true, created: created};
}

function generateDisciplineRecommendationsFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var result = generateDisciplineRecommendations();
  logAudit_(session.name, 'generateDisciplineRecommendationsFromWeb', result);
  return result;
}

/** 5. Faction economy ledger */
function saveEconomyEntryFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = form.entryId || ('ECO-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Entry_ID: id,
    Timestamp: nowIso_(),
    Torn_ID: String(form.tornId || ''),
    Name: String(form.name || ''),
    Category: String(form.category || 'General'),
    Direction: String(form.direction || 'Out'),
    Amount: Number(form.amount) || 0,
    Item: String(form.item || ''),
    Quantity: Number(form.quantity) || '',
    Related_War_ID: String(form.warId || ''),
    Status: String(form.status || 'Open'),
    Logged_By: session.name,
    Notes: String(form.notes || '')
  };
  upsertRowByKey_(APP.SHEETS.ECONOMY_LEDGER, 'Entry_ID', id, row);
  logAudit_(session.name, 'saveEconomyEntryFromWeb', row);
  return {ok: true, entryId: id};
}

function economySummary_() {
  var rows = readTable_(APP.SHEETS.ECONOMY_LEDGER);
  var totals = {inflow: 0, outflow: 0, open: 0, entries: rows.length};
  rows.forEach(function(r) {
    var amt = Number(r.Amount) || 0;
    if (String(r.Direction).toLowerCase() === 'in') totals.inflow += amt; else totals.outflow += amt;
    if (String(r.Status).toLowerCase() !== 'closed' && String(r.Status).toLowerCase() !== 'paid') totals.open += amt;
  });
  totals.net = totals.inflow - totals.outflow;
  return totals;
}

/** 6. Training and growth tracker */
function saveTrainingGoalFromWeb(sessionId, form) {
  var session = requireSession_(sessionId);
  form = form || {};
  var tornId = form.tornId && session.roleValue >= APP.ROLES.OFFICER ? String(form.tornId) : session.tornId;
  var name = form.name && session.roleValue >= APP.ROLES.OFFICER ? String(form.name) : session.name;
  var id = String(tornId);
  var focus = String(form.focus || setting_('Default_Training_Focus', 'balanced battle stats and reliability'));
  var plan = generateTrainingPlanText_(focus, form.goal || '', form.currentEstimate || '', form.targetEstimate || '');
  var row = {
    Training_ID: id,
    Torn_ID: tornId,
    Name: name,
    Goal: String(form.goal || ''),
    Current_Estimate: String(form.currentEstimate || ''),
    Target_Estimate: String(form.targetEstimate || ''),
    Focus: focus,
    Plan: plan,
    Updated: nowIso_(),
    Notes: String(form.notes || '')
  };
  upsertRowByKey_(APP.SHEETS.TRAINING_TRACKER, 'Training_ID', id, row);
  logAudit_(session.name, 'saveTrainingGoalFromWeb', row);
  return {ok: true, training: row};
}

function generateTrainingPlanText_(focus, goal, currentEstimate, targetEstimate) {
  return [
    'Goal: ' + (goal || 'Grow into a reliable faction contributor.'),
    'Focus: ' + focus,
    'Current estimate: ' + (currentEstimate || 'not provided'),
    'Target estimate: ' + (targetEstimate || 'not provided'),
    'Plan: train consistently, keep cooldowns useful, join wars for safe targets, and update this tracker weekly.'
  ].join('\n');
}

/** 7. Applicant spy / vetting board */
function vetApplicantFromWeb(sessionId, applicationId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var apps = readTable_(APP.SHEETS.APPLICATIONS);
  var app = null;
  apps.forEach(function(a) { if (String(a.Application_ID) === String(applicationId)) app = a; });
  if (!app) throw new Error('Application not found: ' + applicationId);
  var score = Number(app.Score) || 0;
  var flags = [];
  var strengths = [];
  if (!app.Discord) flags.push('No Discord listed'); else strengths.push('Discord provided');
  if (String(app.API_Verified).toUpperCase() !== 'TRUE') flags.push('API not verified'); else strengths.push('API verified');
  if ((Number(app.Age_Days) || 0) < 30) flags.push('Very new Torn age');
  if (/daily/i.test(String(app.Activity))) strengths.push('Daily activity');
  if (String(app.War_Availability).trim()) strengths.push('War availability provided');
  var recommendation = score >= 75 && flags.length <= 1 ? 'Accept / Core trial' : (score >= 50 ? 'Trial member' : 'Interview or deny');
  var id = 'VET-' + applicationId;
  var row = {
    Vetting_ID: id,
    Application_ID: applicationId,
    Torn_ID: app.Torn_ID,
    Name: app.Name,
    Score: score,
    Red_Flags: flags.join('; '),
    Strengths: strengths.join('; '),
    Recommendation: recommendation,
    Reviewed_By: session.name,
    Updated: nowIso_()
  };
  upsertRowByKey_(APP.SHEETS.APPLICANT_VETTING, 'Vetting_ID', id, row);
  logAudit_(session.name, 'vetApplicantFromWeb', row);
  return {ok: true, vetting: row};
}

/** 8. Enemy faction library */
function saveEnemyFactionProfileFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = String(form.factionId || form.Faction_ID || '').trim();
  if (!id) throw new Error('Enemy faction ID required.');
  var row = {
    Faction_ID: id,
    Name: String(form.name || form.Name || ''),
    Last_War_ID: String(form.lastWarId || form.Last_War_ID || (activeWar_() ? activeWar_().War_ID : '')),
    War_Record: String(form.warRecord || form.War_Record || ''),
    Timezone_Pattern: String(form.timezonePattern || form.Timezone_Pattern || ''),
    Strength_Notes: String(form.strengthNotes || form.Strength_Notes || ''),
    Weakness_Notes: String(form.weaknessNotes || form.Weakness_Notes || ''),
    Updated: nowIso_()
  };
  upsertRowByKey_(APP.SHEETS.ENEMY_FACTIONS, 'Faction_ID', id, row);
  logAudit_(session.name, 'saveEnemyFactionProfileFromWeb', row);
  return {ok: true, faction: row};
}

/** 9. Chain bonus planner */
function generateChainPlan(warId) {
  if (typeof generateChainPlanV22_ === 'function') return generateChainPlanV22_(warId);
  warId = warId || (activeWar_() ? activeWar_().War_ID : 'GENERAL');
  var chain = latestChain_();
  var current = Number(chain.Chain) || 0;
  var nextBonus = Number(chain.Next_Bonus) || nextChainBonus_(current);
  var hitsNeeded = Math.max(0, nextBonus - current);
  var scorecards = readTable_(APP.SHEETS.MEMBER_SCORECARDS).sort(function(a, b) { return Number(b.Faction_Value) - Number(a.Faction_Value); });
  var bonusHitter = scorecards[0] ? (scorecards[0].Name + ' [' + scorecards[0].Torn_ID + ']') : '';
  var pacing = [];
  if (hitsNeeded <= 0) pacing.push('Bonus reached or chain count unavailable.');
  else if (hitsNeeded < 10) pacing.push('Hold random hits. Assign controlled hits only until bonus.');
  else if (hitsNeeded < 40) pacing.push('Use medium hitters and save top hitter for the bonus number.');
  else pacing.push('Use low-risk/safe hitters to build toward ' + nextBonus + '; preserve strongest members for closeout.');
  pacing.push('Suggested bonus hitter: ' + (bonusHitter || 'assign manually'));
  var row = {
    Plan_ID: 'CHAIN-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss'),
    Timestamp: nowIso_(),
    War_ID: warId,
    Current_Chain: current,
    Next_Bonus: nextBonus,
    Hits_Needed: hitsNeeded,
    Pacing_Plan: pacing.join('\n'),
    Reserved_Bonus_Hitter: bonusHitter,
    Danger_Level: chain.Danger_Level || '',
    Notes: generateChainAdvice_(chain)
  };
  appendRowObject_(APP.SHEETS.CHAIN_PLANS, row);
  return {ok: true, plan: row};
}

function generateChainPlanFromWeb(sessionId, warId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var result = generateChainPlan(warId);
  logAudit_(session.name, 'generateChainPlanFromWeb', result.plan.Plan_ID);
  return result;
}

function latestChain_() {
  var rows = readTable_(APP.SHEETS.CHAIN_LOG);
  return rows.length ? rows[rows.length - 1] : {Chain: 0, Next_Bonus: 10, Hits_Needed: 10, Danger_Level: 'Unknown'};
}

function generateChainAdvice_(chain) {
  chain = chain || latestChain_();
  var current = Number(chain.Chain) || 0;
  var nextBonus = Number(chain.Next_Bonus) || nextChainBonus_(current);
  var hits = Math.max(0, nextBonus - current);
  if (hits <= 5) return 'Very close to bonus. Stop casual hits and reserve the bonus number.';
  if (hits <= 25) return 'Controlled push. Assign reliable members and do not overhit past planned bonus timing.';
  return 'Build safely with lower-risk targets. Save strongest hitters for the final stretch.';
}

/** 10. Mobile-first war view */
function getMobileWarView_(tornId) {
  var active = activeWar_();
  var warId = active ? active.War_ID : 'GENERAL';
  var assignments = readTable_(APP.SHEETS.WAR_TARGETS).filter(function(t) { return String(t.Assigned_To_ID) === String(tornId); });
  var assignment = assignments.length ? assignments[assignments.length - 1] : null;
  var chain = latestChain_();
  return {
    warId: warId,
    message: setting_('Mobile_War_Message', 'Follow orders and communicate.'),
    assignment: assignment,
    chain: chain,
    quickLinks: assignment ? {
      targetProfile: 'https://www.torn.com/profiles.php?XID=' + assignment.Enemy_ID,
      factionWar: 'https://www.torn.com/factions.php?step=your'
    } : {}
  };
}

/** 11. HTML Code Editor / legacy BBCode archive */
function generateBBCodeSnippetFromWeb(sessionId, type, title, sourceId) {
  var session = requireRole_(sessionId, 'OFFICER');
  type = String(type || 'Recruitment');
  title = String(title || (factionName_() + ' ' + type));
  var bb = '';
  var plain = '';
  if (/recruit/i.test(type)) {
    plain = factionName_() + ' is recruiting active, loyal players for organized wars, fair payouts, Discord coordination, and growth support.';
    bb = '[center][b][size=20]' + factionName_() + ' is Recruiting[/size][/b][/center]\n\n' +
      '[b]We offer:[/b]\n- Organized ranked wars\n- Fair payouts\n- Active Discord\n- Armory/support requests\n- Growth coaching\n\n[b]Apply through ShadowCore HQ.[/b]';
  } else if (/payout/i.test(type)) {
    var report = generateWarReport(sourceId || (activeWar_() ? activeWar_().War_ID : 'GENERAL'));
    bb = report.bbcode;
    plain = report.body;
  } else if (/rules/i.test(type)) {
    var rules = readTable_(APP.SHEETS.RULES).filter(function(r) { return String(r.Active).toUpperCase() === 'TRUE'; });
    plain = rules.map(function(r) { return r.Category + ': ' + r.Rule; }).join('\n');
    bb = '[b]' + factionName_() + ' Rules[/b]\n' + rules.map(function(r) { return '[b]' + r.Category + ':[/b] ' + r.Rule; }).join('\n');
  } else if (/chain/i.test(type)) {
    var plan = generateChainPlan(sourceId || (activeWar_() ? activeWar_().War_ID : 'GENERAL')).plan;
    plain = plan.Pacing_Plan;
    bb = '[b]Chain Plan[/b]\nCurrent: ' + plan.Current_Chain + '\nNext bonus: ' + plan.Next_Bonus + '\nHits needed: ' + plan.Hits_Needed + '\n\n' + plan.Pacing_Plan;
  } else {
    plain = title + '\nGenerated by ShadowCore HQ.';
    bb = '[b]' + title + '[/b]\nGenerated by ShadowCore HQ.';
  }
  var row = appendBBCodeSnippet_(type, title, bb, plain, session.name);
  logAudit_(session.name, 'generateBBCodeSnippetFromWeb', row.Snippet_ID);
  return {ok: true, snippet: row};
}

function appendBBCodeSnippet_(type, title, bb, plain, by) {
  var row = {
    Snippet_ID: 'BB-' + Utilities.getUuid().slice(0, 8).toUpperCase(),
    Timestamp: nowIso_(),
    Type: type,
    Title: title,
    BBCode: bb,
    Plain_Text: plain,
    Created_By: by || 'system'
  };
  appendRowObject_(APP.SHEETS.BBCODE_SNIPPETS, row);
  return row;
}

/** 12. Discord embed alerts */
function sendDiscordEmbedFromWeb(sessionId, channelKey, title, description, fieldsText) {
  var session = requireRole_(sessionId, 'OFFICER');
  var fields = parseEmbedFields_(fieldsText || '');
  var embed = {
    title: String(title || factionName_() + ' HQ Alert'),
    description: String(description || ''),
    fields: fields,
    timestamp: nowIso_()
  };
  var result = sendDiscordAlert(channelKey || 'Leadership', '', {embeds: [embed]});
  logAudit_(session.name, 'sendDiscordEmbedFromWeb', {channelKey: channelKey, title: title});
  return result;
}

function parseEmbedFields_(text) {
  return String(text || '').split(/\r?\n/).map(function(line) {
    var parts = line.split(':');
    if (parts.length < 2) return null;
    return {name: parts.shift().trim().slice(0, 256), value: parts.join(':').trim().slice(0, 1024), inline: true};
  }).filter(Boolean).slice(0, 10);
}

/** 13. Officer task board */
function saveOfficerTaskFromWeb(sessionId, form) {
  var session = requireRole_(sessionId, 'OFFICER');
  form = form || {};
  var id = form.taskId || ('TASK-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Task_ID: id,
    Created: form.created || nowIso_(),
    Title: String(form.title || ''),
    Assigned_To: String(form.assignedTo || ''),
    Due_Date: String(form.dueDate || ''),
    Priority: String(form.priority || 'Medium'),
    Status: String(form.status || 'Open'),
    Related_ID: String(form.relatedId || ''),
    Completed: String(form.completed || ''),
    Notes: String(form.notes || '')
  };
  if (!row.Title) throw new Error('Task title is required.');
  if (/done|complete|closed/i.test(row.Status) && !row.Completed) row.Completed = nowIso_();
  upsertRowByKey_(APP.SHEETS.OFFICER_TASKS, 'Task_ID', id, row);
  logAudit_(session.name, 'saveOfficerTaskFromWeb', row);
  return {ok: true, taskId: id};
}

/** 14. Member self-service */
function updateSelfServiceProfileFromWeb(sessionId, form) {
  var session = requireSession_(sessionId);
  form = form || {};
  var member = memberById_(session.tornId) || {};
  member.Torn_ID = session.tornId;
  member.Name = session.name || member.Name;
  member.Discord = String(form.discord || member.Discord || '');
  member.Notes = appendNote_(member.Notes, String(form.notes || 'Self-service update'));
  upsertRowByKey_(APP.SHEETS.MEMBERS, 'Torn_ID', session.tornId, member);
  logAudit_(session.name, 'updateSelfServiceProfileFromWeb', {discord: member.Discord});
  return {ok: true, member: member};
}

/** 15. Faction rule enforcement dashboard */
function evaluateRuleCompliance() {
  var members = readTable_(APP.SHEETS.MEMBERS);
  var scorecards = indexBy_(readTable_(APP.SHEETS.MEMBER_SCORECARDS), 'Torn_ID');
  var apiKeys = indexBy_(readTable_(APP.SHEETS.API_KEYS), 'Torn_ID');
  var active = activeWar_();
  var warId = active ? active.War_ID : 'GENERAL';
  var commitments = indexBy_(readTable_(APP.SHEETS.WAR_COMMITMENTS).filter(function(c) { return String(c.War_ID) === String(warId); }), 'Torn_ID');
  var count = 0;
  members.forEach(function(m) {
    var id = String(m.Torn_ID);
    var sc = scorecards[id] || {};
    var checks = [];
    if (boolSetting_('Require_Discord', true)) checks.push({rule: 'Discord required', ok: !!String(m.Discord || '').trim(), evidence: m.Discord || 'Blank'});
    if (boolSetting_('Require_API_Key', true)) checks.push({rule: 'API key connected', ok: !!apiKeys[id], evidence: apiKeys[id] ? (apiKeys[id].Status || 'Found') : 'Missing'});
    if (active && boolSetting_('War_Checkin_Required', true)) checks.push({rule: 'War check-in required', ok: !!commitments[id], evidence: commitments[id] ? 'Checked in' : 'Missing check-in'});
    checks.push({rule: 'Activity score acceptable', ok: Number(sc.Activity_Score) >= 30 || !sc.Torn_ID, evidence: sc.Activity_Score || 'No scorecard'});
    checks.forEach(function(c) {
      var checkId = id + '|' + c.rule;
      upsertRowByKey_(APP.SHEETS.RULE_CHECKS, 'Check_ID', checkId, {
        Check_ID: checkId,
        Timestamp: nowIso_(),
        Torn_ID: id,
        Name: m.Name,
        Rule: c.rule,
        Status: c.ok ? 'OK' : 'Needs attention',
        Evidence: c.evidence,
        Recommended_Action: c.ok ? '' : 'Message member / log discipline if repeated'
      });
      count++;
    });
  });
  return {ok: true, checks: count};
}

function evaluateRuleComplianceFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var result = evaluateRuleCompliance();
  logAudit_(session.name, 'evaluateRuleComplianceFromWeb', result);
  return result;
}

function indexBy_(rows, key) {
  var map = {};
  (rows || []).forEach(function(r) { map[String(r[key])] = r; });
  return map;
}

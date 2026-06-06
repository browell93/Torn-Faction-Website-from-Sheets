/**
 * ShadowCore HQ - Scoring, payouts, target optimizer, reports.
 */

function calculateMemberScorecards() {
  var members = readTable_(APP.SHEETS.MEMBERS);
  var statuses = readTable_(APP.SHEETS.MEMBER_STATUS);
  var attacks = readTable_(APP.SHEETS.WAR_ATTACKS);
  var statusById = {};
  statuses.forEach(function(s) { statusById[String(s.Torn_ID)] = s; });

  var attackById = {};
  attacks.forEach(function(a) {
    var id = String(a.Attacker_ID);
    if (!attackById[id]) attackById[id] = {hits: 0, respect: 0, kos: 0};
    if (successfulAttack_(a.Result)) attackById[id].hits++;
    attackById[id].respect += Number(a.Respect) || 0;
    if (String(a.Is_KO).toUpperCase() === 'TRUE') attackById[id].kos++;
  });

  members.forEach(function(m) {
    var id = String(m.Torn_ID);
    var st = statusById[id] || {};
    var atk = attackById[id] || {hits: 0, respect: 0, kos: 0};
    var activity = scoreActivity_(st);
    var war = Math.min(100, atk.hits * 5 + atk.respect * 8 + atk.kos * 4);
    var reliability = scoreReliability_(id);
    var growth = 50; // Optional: improve with stat gain history if you enable member logs/battlestats.
    var factionValue = Math.round(activity * 0.30 + war * 0.35 + reliability * 0.25 + growth * 0.10);
    var grade = grade_(factionValue);
    var warnings = [];
    if (activity < 30) warnings.push('Inactive/unavailable');
    if (war < 10 && activeWar_()) warnings.push('Low war contribution');
    upsertRowByKey_(APP.SHEETS.MEMBER_SCORECARDS, 'Torn_ID', id, {
      Torn_ID: id,
      Name: m.Name,
      Activity_Score: activity,
      War_Score: Math.round(war),
      Reliability_Score: reliability,
      Growth_Score: growth,
      Faction_Value: factionValue,
      Grade: grade,
      Recommended_Role: factionValue >= 85 ? 'Core Hitter' : (factionValue >= 65 ? 'Member' : 'Needs coaching'),
      Warnings: warnings.join('; '),
      Updated: nowIso_()
    });
  });

  return {ok: true, members: members.length};
}

function scoreActivity_(status) {
  var text = String(status.Status || '').toLowerCase();
  var score = 50;
  if (text.indexOf('okay') !== -1 || text.indexOf('ok') !== -1) score += 35;
  if (text.indexOf('hospital') !== -1) score -= 40;
  if (text.indexOf('jail') !== -1) score -= 35;
  if (text.indexOf('travel') !== -1 || text.indexOf('abroad') !== -1) score -= 50;
  var last = String(status.Last_Action || '').toLowerCase();
  if (last.indexOf('minute') !== -1 || last.indexOf('second') !== -1) score += 15;
  if (last.indexOf('day') !== -1) score -= 35;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreReliability_(tornId) {
  var targets = readTable_(APP.SHEETS.WAR_TARGETS).filter(function(t) { return String(t.Assigned_To_ID) === String(tornId); });
  if (!targets.length) return 60;
  var complete = 0;
  targets.forEach(function(t) {
    if (String(t.Status).toLowerCase() === 'complete') complete++;
  });
  return Math.round((complete / targets.length) * 100);
}

function grade_(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function successfulAttack_(result) {
  result = String(result || '').toLowerCase();
  return result && !/lost|escape|stalemate|assist|timeout/.test(result);
}

function calculateWarPayouts(warId) {
  var active = activeWar_();
  warId = warId || (active ? active.War_ID : 'GENERAL');
  var attacks = readTable_(APP.SHEETS.WAR_ATTACKS).filter(function(a) {
    return String(a.War_ID || 'GENERAL') === String(warId);
  });
  var byMember = {};
  attacks.forEach(function(a) {
    var id = String(a.Attacker_ID || '');
    if (!id) return;
    if (!byMember[id]) byMember[id] = {name: a.Attacker_Name || '', hits: 0, respect: 0, kos: 0, assists: 0};
    if (successfulAttack_(a.Result)) byMember[id].hits++;
    byMember[id].respect += Number(a.Respect) || 0;
    if (String(a.Is_KO).toUpperCase() === 'TRUE') byMember[id].kos++;
    if (String(a.Is_Assist).toUpperCase() === 'TRUE') byMember[id].assists++;
  });

  var perHit = numberSetting_('Payout_Per_Hit', 250000);
  var perRespect = numberSetting_('Payout_Per_Respect', 75000);
  var perKo = numberSetting_('Payout_Per_KO', 1000000);
  var perAssist = numberSetting_('Payout_Per_Assist', 100000);
  var total = 0;
  Object.keys(byMember).forEach(function(id) {
    var m = byMember[id];
    var bonuses = (m.kos * perKo) + (m.assists * perAssist);
    var penalties = 0;
    var amount = Math.max(0, Math.round(m.hits * perHit + m.respect * perRespect + bonuses - penalties));
    total += amount;
    upsertRowByKey_(APP.SHEETS.PAYOUTS, 'War_ID', String(warId) + '|' + id, {
      War_ID: String(warId) + '|' + id,
      Torn_ID: id,
      Name: m.name,
      Hits: m.hits,
      Respect: round2_(m.respect),
      KOs: m.kos,
      Assists: m.assists,
      Bonuses: bonuses,
      Penalties: penalties,
      Total: amount,
      Paid: '',
      Paid_Date: '',
      Notes: 'War ' + warId
    });
  });

  logAudit_('system', 'calculateWarPayouts', {warId: warId, members: Object.keys(byMember).length, total: total});
  return {ok: true, warId: warId, members: Object.keys(byMember).length, total: total};
}

function round2_(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function markPayoutPaid(sessionId, payoutRowKey, note) {
  var session = requireRole_(sessionId, 'LEADER');
  var payouts = readTable_(APP.SHEETS.PAYOUTS);
  for (var i = 0; i < payouts.length; i++) {
    if (String(payouts[i].War_ID) === String(payoutRowKey)) {
      payouts[i].Paid = 'TRUE';
      payouts[i].Paid_Date = nowIso_();
      payouts[i].Notes = note || payouts[i].Notes || '';
      upsertRowByKey_(APP.SHEETS.PAYOUTS, 'War_ID', payoutRowKey, payouts[i]);
      appendRowObject_(APP.SHEETS.PAYOUT_HISTORY, {
        Timestamp: nowIso_(),
        War_ID: payouts[i].War_ID,
        Torn_ID: payouts[i].Torn_ID,
        Name: payouts[i].Name,
        Amount: payouts[i].Total,
        Action: 'Marked Paid',
        By: session.name,
        Notes: note || ''
      });
      return {ok: true};
    }
  }
  throw new Error('Payout row not found: ' + payoutRowKey);
}

function calculateApplicantScores() {
  var apps = readTable_(APP.SHEETS.APPLICATIONS);
  apps.forEach(function(a) {
    var score = 0;
    score += Math.min(25, Number(a.Level) || 0);
    score += Math.min(20, Math.floor((Number(a.Age_Days) || 0) / 30));
    if (String(a.Activity).toLowerCase().indexOf('daily') !== -1) score += 25;
    if (String(a.War_Availability).trim()) score += 15;
    if (String(a.API_Verified).toUpperCase() === 'TRUE') score += 15;
    a.Score = Math.min(100, score);
    upsertRowByKey_(APP.SHEETS.APPLICATIONS, 'Application_ID', a.Application_ID, a);
  });
  return {ok: true, applications: apps.length};
}

function targetOptimizer() {
  var enemies = readTable_(APP.SHEETS.ENEMY_PLAYERS);
  var members = readTable_(APP.SHEETS.MEMBER_SCORECARDS).sort(function(a,b) {
    return Number(b.Faction_Value) - Number(a.Faction_Value);
  });
  var active = activeWar_();
  var warId = active ? active.War_ID : 'GENERAL';
  var assigned = 0;
  enemies.forEach(function(e, idx) {
    var status = String(e.Status || '').toLowerCase();
    var score = 50;
    if (status.indexOf('okay') !== -1 || status === 'ok') score += 30;
    if (String(e.Good_Target).toUpperCase() === 'TRUE') score += 25;
    if (String(e.Avoid).toUpperCase() === 'TRUE') score -= 50;
    if (status.indexOf('hospital') !== -1 || status.indexOf('travel') !== -1 || status.indexOf('jail') !== -1) score -= 40;
    var member = members[idx % Math.max(1, members.length)] || {};
    upsertRowByKey_(APP.SHEETS.WAR_TARGETS, 'Target_ID', String(warId) + '|' + e.Enemy_ID, {
      Target_ID: String(warId) + '|' + e.Enemy_ID,
      War_ID: warId,
      Enemy_ID: e.Enemy_ID,
      Enemy_Name: e.Name,
      Status: e.Status,
      Priority: score >= 80 ? 'High' : (score >= 50 ? 'Medium' : 'Low'),
      Assigned_To_ID: member.Torn_ID || '',
      Assigned_To_Name: member.Name || '',
      Score: Math.max(0, score),
      Notes: e.Notes || '',
      Updated: nowIso_()
    });
    assigned++;
  });
  return {ok: true, targets: assigned};
}

function generateLatestWarReport() {
  var active = activeWar_();
  var warId = active ? active.War_ID : 'GENERAL';
  return generateWarReport(warId);
}

function generateWarReport(warId) {
  warId = warId || 'GENERAL';
  var payouts = readTable_(APP.SHEETS.PAYOUTS).filter(function(p) {
    return String(p.War_ID).indexOf(String(warId)) === 0;
  });
  var totalHits = 0, totalRespect = 0, totalPay = 0;
  payouts.forEach(function(p) {
    totalHits += Number(p.Hits) || 0;
    totalRespect += Number(p.Respect) || 0;
    totalPay += Number(p.Total) || 0;
  });
  var sorted = payouts.slice().sort(function(a,b) { return Number(b.Total) - Number(a.Total); });
  var top = sorted.slice(0, 5).map(function(p, i) {
    return (i + 1) + '. ' + p.Name + ' - ' + p.Hits + ' hits, ' + p.Respect + ' respect, $' + comma_(p.Total);
  }).join('\n');
  var title = factionName_() + ' War Report - ' + warId;
  var body = [
    title,
    '',
    'Total hits: ' + totalHits,
    'Total respect: ' + round2_(totalRespect),
    'Total payout: $' + comma_(totalPay),
    '',
    'Top contributors:',
    top || 'No payout data yet.'
  ].join('\n');
  var bb = '[center][b][size=20]' + title + '[/size][/b][/center]\n\n' +
    '[b]Total hits:[/b] ' + totalHits + '\n' +
    '[b]Total respect:[/b] ' + round2_(totalRespect) + '\n' +
    '[b]Total payout:[/b] $' + comma_(totalPay) + '\n\n' +
    '[b]Top contributors:[/b]\n' + (top || 'No payout data yet.');
  appendRowObject_(APP.SHEETS.REPORTS, {
    Timestamp: nowIso_(),
    Report_Type: 'War',
    War_ID: warId,
    Title: title,
    Body: body,
    BBCode: bb
  });
  return {ok: true, title: title, body: body, bbcode: bb};
}

function comma_(n) {
  n = Math.round(Number(n) || 0);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

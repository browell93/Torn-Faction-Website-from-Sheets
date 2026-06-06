/**
 * ShadowCore HQ - Sync jobs and timed triggers.
 */

function installShadowCoreTriggers() {
  var existing = ScriptApp.getProjectTriggers();
  existing.forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (['syncWarPulse', 'syncHourlyMaintenance', 'syncDailyReports'].indexOf(fn) !== -1) {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('syncWarPulse').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('syncHourlyMaintenance').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('syncDailyReports').timeBased().everyDays(1).atHour(6).create();
  logAudit_('system', 'installShadowCoreTriggers', 'Installed 5-minute, hourly, and daily triggers.');
  return {ok: true};
}

function manualFullSync() {
  var sessionUser = Session.getActiveUser().getEmail() || 'manual';
  var result = syncAll_();
  logAudit_(sessionUser, 'manualFullSync', result);
  return result;
}

function syncAll_() {
  var out = {};
  try { out.members = syncFactionMembers(); } catch (err) { logError_('syncFactionMembers', err, {}); out.membersError = err.message; }
  try { out.chain = syncChainData(); } catch (err2) { logError_('syncChainData', err2, {}); out.chainError = err2.message; }
  try { out.attacks = syncRecentWarAttacks(); } catch (err3) { logError_('syncRecentWarAttacks', err3, {}); out.attacksError = err3.message; }
  try { out.scorecards = calculateMemberScorecards(); } catch (err4) { logError_('calculateMemberScorecards', err4, {}); out.scorecardsError = err4.message; }
  try { out.payouts = calculateWarPayouts(); } catch (err5) { logError_('calculateWarPayouts', err5, {}); out.payoutsError = err5.message; }
  return out;
}

function syncWarPulse() {
  var result = {};
  try {
    result.members = syncFactionMembers();
    result.chain = syncChainData();
    result.attacks = syncRecentWarAttacks();
    calculateMemberScorecards();
    maybeSendChainDangerAlert_();
  } catch (err) {
    logError_('syncWarPulse', err, result);
  }
}

function syncHourlyMaintenance() {
  try {
    syncFactionMembers();
    calculateApplicantScores();
    calculateMemberScorecards();
    targetOptimizer();
    postPendingQueueAlerts_();
  } catch (err) {
    logError_('syncHourlyMaintenance', err, {});
  }
}

function syncDailyReports() {
  try {
    generateLatestWarReport();
  } catch (err) {
    logError_('syncDailyReports', err, {});
  }
}

function syncFactionMembers() {
  var data = getFactionBasic_();
  var timestamp = nowIso_();
  var membersObj = data.members || (data.faction && data.faction.members) || {};
  var count = 0;

  Object.keys(membersObj).forEach(function(id) {
    var m = membersObj[id] || {};
    var tornId = String(id || m.id || m.user_id || m.player_id);
    var name = m.name || m.player_name || '';
    var statusText = '';
    if (m.status) {
      statusText = typeof m.status === 'string' ? m.status : (m.status.description || m.status.state || m.status.status || '');
    }
    var lastAction = '';
    if (m.last_action) {
      lastAction = typeof m.last_action === 'string' ? m.last_action : (m.last_action.relative || m.last_action.timestamp || '');
    }

    upsertRowByKey_(APP.SHEETS.MEMBERS, 'Torn_ID', tornId, {
      Torn_ID: tornId,
      Name: name,
      Role: findMemberRole_(tornId) || 'MEMBER',
      Rank: m.position || m.rank || '',
      Joined: m.joined || '',
      Discord: '',
      Active: 'TRUE',
      Last_Seen: lastAction || timestamp,
      Faction_ID: factionId_(),
      Profile_URL: 'https://www.torn.com/profiles.php?XID=' + tornId,
      Notes: ''
    });

    upsertRowByKey_(APP.SHEETS.MEMBER_STATUS, 'Torn_ID', tornId, {
      Torn_ID: tornId,
      Name: name,
      Status: statusText || 'Unknown',
      Last_Action: lastAction,
      Life: valueOrBlank_(m.life),
      Energy: valueOrBlank_(m.energy),
      Nerve: valueOrBlank_(m.nerve),
      Happy: valueOrBlank_(m.happy),
      Hospital_Until: m.status && m.status.until ? m.status.until : '',
      Jail: /jail/i.test(statusText) ? 'TRUE' : 'FALSE',
      Travel: /travel|abroad/i.test(statusText) ? 'TRUE' : 'FALSE',
      Drug_Cooldown: '',
      Medical_Cooldown: '',
      Booster_Cooldown: '',
      Updated: timestamp
    });
    count++;
  });

  upsertRowByKey_(APP.SHEETS.FACTION_STATUS, 'Timestamp', timestamp, {
    Timestamp: timestamp,
    Faction_ID: factionId_(),
    Name: data.name || factionName_(),
    Members: count || data.members_count || '',
    Respect: data.respect || '',
    Chain: data.chain || '',
    Rank: data.rank || '',
    War_Status: activeWar_() ? 'Active/Tracked' : '',
    Notes: 'Synced from faction basic selection.'
  });

  return {ok: true, members: count};
}

function valueOrBlank_(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    if (value.current !== undefined && value.maximum !== undefined) return value.current + '/' + value.maximum;
    if (value.amount !== undefined) return value.amount;
    return safeJson_(value);
  }
  return value;
}

function syncRecentWarAttacks() {
  var wars = readTable_(APP.SHEETS.WARS);
  var active = activeWar_();
  var warId = active ? active.War_ID : 'GENERAL';
  var from = active && active.Start_Time ? Math.floor(new Date(active.Start_Time).getTime() / 1000) : unixNow_() - 86400;
  var to = unixNow_();
  var data = getFactionAttacks_(from, to);
  var attacks = data.attacks || data;
  var count = 0;

  if (Array.isArray(attacks)) {
    attacks.forEach(function(a, i) {
      saveAttack_(warId, a.id || a.attack_id || (warId + '-' + i + '-' + (a.timestamp || unixNow_())), a);
      count++;
    });
  } else if (typeof attacks === 'object') {
    Object.keys(attacks).forEach(function(id) {
      saveAttack_(warId, id, attacks[id]);
      count++;
    });
  }
  return {ok: true, attacks: count, warId: warId};
}

function saveAttack_(warId, attackId, a) {
  a = a || {};
  var attacker = a.attacker || {};
  var defender = a.defender || {};
  var timestamp = a.timestamp ? new Date(Number(a.timestamp) * 1000).toISOString() : (a.started ? new Date(Number(a.started) * 1000).toISOString() : nowIso_());
  var result = a.result || a.outcome || '';
  var respect = Number(a.respect_gain || a.respect || a.modifiers && a.modifiers.respect || 0) || 0;
  var chain = a.chain || a.chain_number || '';
  var attackerId = a.attacker_id || attacker.id || attacker.user_id || '';
  var attackerName = a.attacker_name || attacker.name || '';
  var defenderId = a.defender_id || defender.id || defender.user_id || '';
  var defenderName = a.defender_name || defender.name || '';
  upsertRowByKey_(APP.SHEETS.WAR_ATTACKS, 'Attack_ID', attackId, {
    Attack_ID: attackId,
    War_ID: warId,
    Timestamp: timestamp,
    Attacker_ID: attackerId,
    Attacker_Name: attackerName,
    Defender_ID: defenderId,
    Defender_Name: defenderName,
    Result: result,
    Respect: respect,
    Chain: chain,
    Is_KO: /hospitalized|mugged|left/i.test(String(result)) ? 'TRUE' : '',
    Is_Assist: '',
    Source: 'Torn API'
  });
}

function syncChainData() {
  var data = getFactionChain_();
  var chain = Number(data.chain || data.current || data.chain_current || data.faction && data.faction.chain || 0) || 0;
  var timeout = Number(data.timeout || data.chain_timeout || data.cooldown || 0) || 0;
  var nextBonus = nextChainBonus_(chain);
  var available = getAvailableMembers_().length;
  var danger = timeout && timeout < numberSetting_('Chain_Danger_Seconds', 120) ? 'HIGH' : (timeout < 300 ? 'MEDIUM' : 'LOW');
  appendRowObject_(APP.SHEETS.CHAIN_LOG, {
    Timestamp: nowIso_(),
    Chain: chain,
    Timeout_Sec: timeout,
    Next_Bonus: nextBonus,
    Hits_Needed: Math.max(0, nextBonus - chain),
    Available_Members: available,
    Danger_Level: danger,
    Notes: 'Synced from Torn API; exact fields depend on key/API version.'
  });
  return {ok: true, chain: chain, timeout: timeout, danger: danger};
}

function nextChainBonus_(chain) {
  var bonuses = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  for (var i = 0; i < bonuses.length; i++) {
    if (chain < bonuses[i]) return bonuses[i];
  }
  return Math.ceil(chain / 10000) * 10000 + 10000;
}

function activeWar_() {
  var wars = readTable_(APP.SHEETS.WARS);
  for (var i = 0; i < wars.length; i++) {
    if (String(wars[i].Status).toLowerCase() === 'active') return wars[i];
  }
  return null;
}

function getAvailableMembers_() {
  var statuses = readTable_(APP.SHEETS.MEMBER_STATUS);
  return statuses.filter(function(s) {
    var text = String(s.Status || '').toLowerCase();
    return text.indexOf('okay') !== -1 || text === 'ok' || text === 'available';
  });
}

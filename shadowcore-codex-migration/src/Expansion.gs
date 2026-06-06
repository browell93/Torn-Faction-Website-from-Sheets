/**
 * ShadowCore HQ v1.1 Expansion Pack
 * Adds leader web actions, war setup tools, reports/BBCode, bulk enemy import,
 * target assignments, event/announcement tools, and safer admin helpers.
 */

function createOrUpdateWarFromWeb(sessionId, war) {
  var session = requireRole_(sessionId, 'LEADER');
  war = war || {};
  var warId = String(war.warId || war.War_ID || '').trim();
  if (!warId) warId = 'WAR-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');
  var status = String(war.status || war.Status || 'Active').trim() || 'Active';
  if (status.toLowerCase() === 'active' && boolSetting_('Only_One_Active_War', true)) {
    var wars = readTable_(APP.SHEETS.WARS);
    wars.forEach(function(w) {
      if (String(w.War_ID) !== warId && String(w.Status).toLowerCase() === 'active') {
        w.Status = 'Paused';
        w.Notes = appendNote_(w.Notes, 'Auto-paused when ' + warId + ' was activated.');
        upsertRowByKey_(APP.SHEETS.WARS, 'War_ID', w.War_ID, w);
      }
    });
  }
  var row = {
    War_ID: warId,
    Enemy_Faction_ID: String(war.enemyFactionId || war.Enemy_Faction_ID || ''),
    Enemy_Name: String(war.enemyName || war.Enemy_Name || ''),
    Status: status,
    Start_Time: String(war.startTime || war.Start_Time || nowIso_()),
    End_Time: String(war.endTime || war.End_Time || ''),
    Our_Score: war.ourScore || war.Our_Score || '',
    Enemy_Score: war.enemyScore || war.Enemy_Score || '',
    Chain_Start: war.chainStart || war.Chain_Start || '',
    Chain_End: war.chainEnd || war.Chain_End || '',
    Payout_Locked: war.payoutLocked || war.Payout_Locked || '',
    Notes: String(war.notes || war.Notes || '')
  };
  upsertRowByKey_(APP.SHEETS.WARS, 'War_ID', warId, row);
  logAudit_(session.name, 'createOrUpdateWarFromWeb', row);
  sendDiscordAlert('War', '⚔️ War tracker updated: ' + row.War_ID + ' vs ' + (row.Enemy_Name || row.Enemy_Faction_ID || 'enemy') + ' — ' + row.Status + '.', {});
  return {ok: true, warId: warId, row: row};
}

function endActiveWarFromWeb(sessionId, note) {
  var session = requireRole_(sessionId, 'LEADER');
  var active = activeWar_();
  if (!active) throw new Error('No active war row found.');
  active.Status = 'Ended';
  active.End_Time = nowIso_();
  active.Notes = appendNote_(active.Notes, note || 'Ended from web UI.');
  upsertRowByKey_(APP.SHEETS.WARS, 'War_ID', active.War_ID, active);
  var payout = calculateWarPayouts(active.War_ID);
  var report = generateWarReport(active.War_ID);
  logAudit_(session.name, 'endActiveWarFromWeb', active.War_ID);
  sendDiscordAlert('War', '🏁 War tracker ended: ' + active.War_ID + '. Payout total: $' + comma_(payout.total) + '.', {});
  return {ok: true, warId: active.War_ID, payout: payout, report: report};
}

function appendNote_(oldNote, note) {
  oldNote = String(oldNote || '').trim();
  note = String(note || '').trim();
  if (!note) return oldNote;
  var stamped = '[' + nowIso_() + '] ' + note;
  return oldNote ? oldNote + '\n' + stamped : stamped;
}

function bulkImportEnemiesFromWeb(sessionId, text) {
  var session = requireRole_(sessionId, 'OFFICER');
  text = String(text || '').trim();
  if (!text) throw new Error('Paste at least one enemy line.');
  var active = activeWar_();
  var warId = active ? active.War_ID : 'GENERAL';
  var lines = text.split(/\r?\n/).map(function(x) { return x.trim(); }).filter(Boolean);
  var imported = 0;
  lines.forEach(function(line) {
    var parts = line.split(/[,\t|;]/).map(function(x) { return x.trim(); });
    // Accepted formats:
    // ID, Name, Level, Status, GoodTarget, Avoid, Notes
    // Name, ID, Level, Status, GoodTarget, Avoid, Notes
    var enemyId = '', name = '';
    if (/^\d+$/.test(parts[0])) {
      enemyId = parts[0]; name = parts[1] || ('Enemy ' + enemyId);
    } else {
      name = parts[0] || ''; enemyId = parts[1] || '';
    }
    if (!enemyId) return;
    var row = {
      Enemy_ID: enemyId,
      Name: name,
      Faction_ID: active ? active.Enemy_Faction_ID : '',
      Level: parts[2] || '',
      Status: parts[3] || 'Unknown',
      Last_Seen: '',
      Known_Strength: '',
      Good_Target: normalizeBoolText_(parts[4]),
      Avoid: normalizeBoolText_(parts[5]),
      Best_Attackers: '',
      Notes: parts.slice(6).join(' | '),
      Updated: nowIso_()
    };
    upsertRowByKey_(APP.SHEETS.ENEMY_PLAYERS, 'Enemy_ID', enemyId, row);
    imported++;
  });
  var opt = targetOptimizer();
  logAudit_(session.name, 'bulkImportEnemiesFromWeb', {imported: imported, warId: warId});
  return {ok: true, imported: imported, targetOptimizer: opt};
}

function normalizeBoolText_(v) {
  v = String(v || '').trim().toLowerCase();
  if (['true','yes','y','1','good'].indexOf(v) !== -1) return 'TRUE';
  if (['false','no','n','0','avoid'].indexOf(v) !== -1) return 'FALSE';
  return v ? v.toUpperCase() : '';
}

function updateTargetFromWeb(sessionId, targetId, fields) {
  var session = requireRole_(sessionId, 'OFFICER');
  fields = fields || {};
  if (!targetId) throw new Error('Target ID required.');
  var rows = readTable_(APP.SHEETS.WAR_TARGETS);
  var found = null;
  rows.forEach(function(r) { if (String(r.Target_ID) === String(targetId)) found = r; });
  if (!found) throw new Error('Target not found: ' + targetId);
  ['Status','Priority','Assigned_To_ID','Assigned_To_Name','Score','Notes'].forEach(function(k) {
    var camel = k.charAt(0).toLowerCase() + k.slice(1);
    if (fields[k] !== undefined) found[k] = fields[k];
    if (fields[camel] !== undefined) found[k] = fields[camel];
  });
  found.Updated = nowIso_();
  upsertRowByKey_(APP.SHEETS.WAR_TARGETS, 'Target_ID', targetId, found);
  logAudit_(session.name, 'updateTargetFromWeb', {targetId: targetId, fields: fields});
  return {ok: true, target: found};
}

function assignTargetFromWeb(sessionId, targetId, tornId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var member = memberById_(tornId);
  if (!member) throw new Error('Member not found: ' + tornId);
  return updateTargetFromWeb(sessionId, targetId, {
    Assigned_To_ID: member.Torn_ID,
    Assigned_To_Name: member.Name,
    Status: 'Assigned'
  });
}

function memberById_(tornId) {
  var members = readTable_(APP.SHEETS.MEMBERS);
  for (var i = 0; i < members.length; i++) {
    if (String(members[i].Torn_ID) === String(tornId)) return members[i];
  }
  return null;
}

function saveAnnouncementFromWeb(sessionId, ann) {
  var session = requireRole_(sessionId, 'OFFICER');
  ann = ann || {};
  var id = ann.announcementId || ann.Announcement_ID || ('A-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Announcement_ID: id,
    Timestamp: nowIso_(),
    Title: String(ann.title || ann.Title || ''),
    Message: String(ann.message || ann.Message || ''),
    Audience: String(ann.audience || ann.Audience || 'All'),
    Active: String(ann.active || ann.Active || 'TRUE')
  };
  if (!row.Title || !row.Message) throw new Error('Announcement title and message are required.');
  upsertRowByKey_(APP.SHEETS.ANNOUNCEMENTS, 'Announcement_ID', id, row);
  logAudit_(session.name, 'saveAnnouncementFromWeb', row.Title);
  return {ok: true, announcementId: id};
}

function saveEventFromWeb(sessionId, event) {
  var session = requireRole_(sessionId, 'OFFICER');
  event = event || {};
  var id = event.eventId || event.Event_ID || ('EV-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  var row = {
    Event_ID: id,
    Title: String(event.title || event.Title || ''),
    Type: String(event.type || event.Type || ''),
    Start_Time: String(event.startTime || event.Start_Time || ''),
    End_Time: String(event.endTime || event.End_Time || ''),
    Owner: String(event.owner || event.Owner || session.name),
    Status: String(event.status || event.Status || 'Planned'),
    Description: String(event.description || event.Description || '')
  };
  if (!row.Title) throw new Error('Event title required.');
  upsertRowByKey_(APP.SHEETS.EVENTS, 'Event_ID', id, row);
  logAudit_(session.name, 'saveEventFromWeb', row.Title);
  return {ok: true, eventId: id};
}

function generateReportFromWeb(sessionId, warId) {
  var session = requireRole_(sessionId, 'LEADER');
  var result = generateWarReport(warId || (activeWar_() ? activeWar_().War_ID : 'GENERAL'));
  logAudit_(session.name, 'generateReportFromWeb', result.title);
  return result;
}

function getLatestReportFromWeb(sessionId) {
  requireRole_(sessionId, 'MEMBER');
  var rows = readTable_(APP.SHEETS.REPORTS);
  return rows.length ? rows[rows.length - 1] : null;
}

function markPayoutPaidFromWeb(sessionId, payoutKey, note) {
  return markPayoutPaid(sessionId, payoutKey, note || 'Marked paid from web UI.');
}

function setMemberRoleFromWeb(sessionId, tornId, role, note) {
  var session = requireRole_(sessionId, 'LEADER');
  role = roleName_(role || 'MEMBER');
  var member = memberById_(tornId);
  if (!member) throw new Error('Member not found: ' + tornId);
  member.Role = role;
  member.Notes = appendNote_(member.Notes, note || ('Role set to ' + role));
  upsertRowByKey_(APP.SHEETS.MEMBERS, 'Torn_ID', tornId, member);
  logAudit_(session.name, 'setMemberRoleFromWeb', {tornId: tornId, role: role});
  return {ok: true, member: member};
}

function installTriggersFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'LEADER');
  var result = installShadowCoreTriggers();
  logAudit_(session.name, 'installTriggersFromWeb', result);
  return result;
}

function sendDiscordNoticeFromWeb(sessionId, channelKey, message) {
  var session = requireRole_(sessionId, 'OFFICER');
  if (!message) throw new Error('Message required.');
  var result = sendDiscordAlert(channelKey || 'Leadership', message, {});
  logAudit_(session.name, 'sendDiscordNoticeFromWeb', {channelKey: channelKey, message: message});
  return result;
}

function runTargetOptimizerFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'OFFICER');
  var result = targetOptimizer();
  logAudit_(session.name, 'runTargetOptimizerFromWeb', result);
  return result;
}

function exportPayoutCsvFromWeb(sessionId, warId) {
  requireRole_(sessionId, 'LEADER');
  warId = warId || (activeWar_() ? activeWar_().War_ID : 'GENERAL');
  var rows = readTable_(APP.SHEETS.PAYOUTS).filter(function(p) { return String(p.War_ID).indexOf(String(warId)) === 0; });
  var cols = ['War_ID','Torn_ID','Name','Hits','Respect','KOs','Assists','Bonuses','Penalties','Total','Paid','Paid_Date','Notes'];
  var csv = [cols.join(',')].concat(rows.map(function(r) {
    return cols.map(function(c) { return csvEscape_(r[c]); }).join(',');
  })).join('\n');
  return {ok: true, warId: warId, filename: 'shadowcore_payouts_' + warId + '.csv', csv: csv};
}

function csvEscape_(v) {
  v = v === undefined || v === null ? '' : String(v);
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

function saveSettingBulkFromWeb(sessionId, pairs) {
  var session = requireRole_(sessionId, 'LEADER');
  pairs = pairs || [];
  var blocked = {'Admin_Token': true};
  var changed = 0;
  pairs.forEach(function(p) {
    if (!p || !p.key) return;
    if (blocked[String(p.key)]) return;
    saveSetting_(String(p.key), String(p.value || ''), 'Bulk updated from web UI by ' + session.name);
    changed++;
  });
  logAudit_(session.name, 'saveSettingBulkFromWeb', {changed: changed});
  return {ok: true, changed: changed};
}

function getOperatorStateFromWeb(sessionId) {
  var session = requireRole_(sessionId, 'MEMBER');
  return getAppState(sessionId);
}

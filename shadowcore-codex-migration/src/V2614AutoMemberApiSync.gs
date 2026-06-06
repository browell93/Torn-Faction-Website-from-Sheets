/**
 * ShadowCore HQ v2.6.14 — Automatic Member API Sync
 * Purpose: no manual member data pulls. When a member logs in/connects with an API key,
 * store the key server-side in Script Properties, immediately sync current bars/cooldowns/status,
 * then keep member data fresh with a time-driven trigger.
 *
 * API keys are never written into sheets. The sheet stores only fingerprints/status.
 */

var SC2614 = {
  VERSION: '2.6.14',
  REGISTRY: 'Member_API_Registry',
  STATUS: 'Member_Status',
  SNAPSHOTS: 'Member_Readiness_Snapshots',
  HEALTH: 'API_Key_Health_Snapshots',
  SETTINGS: 'Settings',
  PROP_PREFIX: 'SC_MEMBER_API_KEY_',
  CURSOR_PROP: 'SC2614_AUTO_SYNC_CURSOR',
  DEFAULT_INTERVAL_MINUTES: 15,
  DEFAULT_BATCH_LIMIT: 15
};

function setupShadowCoreV2614AutoMemberApiSync() {
  sc2614EnsureSheet_(SC2614.REGISTRY, [
    'Torn_ID','Name','Stored','Key_Fingerprint','Source','Last_Sync','Last_Status','Last_Error','Auto_Sync','Updated'
  ]);
  sc2614EnsureSheet_(SC2614.STATUS, [
    'Torn_ID','Name','Status','Last_Action','Energy','Life','Nerve','Happy','Hospital_Until','Travel_Status',
    'Drug_Cooldown','Medical_Cooldown','Booster_Cooldown','Updated'
  ]);
  sc2614EnsureSheet_(SC2614.SNAPSHOTS, [
    'Snapshot_ID','Timestamp','Torn_ID','Name','Status','Last_Action','Energy','Life','Nerve','Happy','Hospital_Until','Travel_Status',
    'Drug_Cooldown','Medical_Cooldown','Booster_Cooldown','Source','Payload_JSON'
  ]);
  sc2614EnsureSheet_(SC2614.HEALTH, [
    'Timestamp','Torn_ID','Name','Source','Status','Selections','Error','Key_Fingerprint','Version'
  ]);
  sc2614SetSettingIfMissing_('Member_API_Auto_Sync', 'TRUE', 'v2.6.14: automatic opt-in member API sync');
  sc2614SetSettingIfMissing_('Member_API_Auto_Sync_Interval_Minutes', String(SC2614.DEFAULT_INTERVAL_MINUTES), 'v2.6.14');
  sc2614SetSettingIfMissing_('Member_API_Auto_Sync_Batch_Limit', String(SC2614.DEFAULT_BATCH_LIMIT), 'v2.6.14');
  return {ok:true, version:SC2614.VERSION, message:'v2.6.14 auto member API sync setup complete'};
}

function installShadowCoreV2614AutoMemberApiSyncTrigger() {
  var interval = Number(sc2614GetSetting_('Member_API_Auto_Sync_Interval_Minutes', SC2614.DEFAULT_INTERVAL_MINUTES)) || SC2614.DEFAULT_INTERVAL_MINUTES;
  // Apps Script supports everyMinutes values like 1,5,10,15,30. Normalize to safe values.
  if (interval <= 1) interval = 1;
  else if (interval <= 5) interval = 5;
  else if (interval <= 10) interval = 10;
  else if (interval <= 15) interval = 15;
  else interval = 30;

  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction && t.getHandlerFunction() === 'sc2614AutoSyncTick') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sc2614AutoSyncTick').timeBased().everyMinutes(interval).create();
  sc2614SetSetting_('Member_API_Auto_Sync_Last_Trigger_Install', new Date().toISOString(), 'v2.6.14');
  return {ok:true, handler:'sc2614AutoSyncTick', everyMinutes: interval};
}

function disableShadowCoreV2614AutoMemberApiSyncTrigger() {
  var count = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction && t.getHandlerFunction() === 'sc2614AutoSyncTick') { ScriptApp.deleteTrigger(t); count++; }
  });
  return {ok:true, deleted: count};
}

/**
 * Call this from API-key login after the key successfully verifies.
 * It stores the key, upserts registry, and syncs immediately.
 */
function sc2614RegisterMemberApiKeyForAutoSync(apiKey, source) {
  apiKey = String(apiKey || '').trim();
  if (!apiKey) throw new Error('Missing API key');
  source = source || 'api_login';

  var fetched = sc2614FetchOwnUser_(apiKey);
  var identity = sc2614ExtractIdentity_(fetched);
  if (!identity.tornId) throw new Error('Could not determine Torn ID from API response. Check key permissions.');

  var fp = sc2614Fingerprint_(apiKey);
  PropertiesService.getScriptProperties().setProperty(SC2614.PROP_PREFIX + identity.tornId, apiKey);

  sc2614Upsert_(SC2614.REGISTRY, 'Torn_ID', String(identity.tornId), {
    Torn_ID: String(identity.tornId),
    Name: identity.name || '',
    Stored: 'TRUE',
    Key_Fingerprint: fp,
    Source: source,
    Last_Sync: '',
    Last_Status: 'Stored',
    Last_Error: '',
    Auto_Sync: 'TRUE',
    Updated: new Date()
  });

  var sync = sc2614SyncMemberFromStoredKey(identity.tornId, 'login_auto_sync');
  return {ok:true, tornId:String(identity.tornId), name:identity.name || '', fingerprint:fp, sync:sync};
}

function sc2614RemoveStoredMemberApiKey(tornId) {
  tornId = String(tornId || '').trim();
  if (!tornId) throw new Error('Missing Torn ID');
  PropertiesService.getScriptProperties().deleteProperty(SC2614.PROP_PREFIX + tornId);
  sc2614Upsert_(SC2614.REGISTRY, 'Torn_ID', tornId, {
    Torn_ID: tornId, Stored:'FALSE', Last_Status:'Removed', Auto_Sync:'FALSE', Updated: new Date()
  });
  return {ok:true, tornId:tornId, removed:true};
}

function sc2614SyncMemberFromStoredKey(tornId, source) {
  tornId = String(tornId || '').trim();
  var key = PropertiesService.getScriptProperties().getProperty(SC2614.PROP_PREFIX + tornId);
  if (!key) throw new Error('No stored API key for Torn ID ' + tornId);
  source = source || 'auto_sync';
  var data = sc2614FetchOwnUser_(key);
  var row = sc2614BuildMemberStatusRow_(data, source);
  if (!row.Torn_ID) row.Torn_ID = tornId;

  sc2614Upsert_(SC2614.STATUS, 'Torn_ID', String(row.Torn_ID), row);
  sc2614Append_(SC2614.SNAPSHOTS, {
    Snapshot_ID: 'snap_' + String(row.Torn_ID) + '_' + Date.now(),
    Timestamp: new Date(),
    Torn_ID: String(row.Torn_ID),
    Name: row.Name || '',
    Status: row.Status || '',
    Last_Action: row.Last_Action || '',
    Energy: row.Energy || '',
    Life: row.Life || '',
    Nerve: row.Nerve || '',
    Happy: row.Happy || '',
    Hospital_Until: row.Hospital_Until || '',
    Travel_Status: row.Travel_Status || '',
    Drug_Cooldown: row.Drug_Cooldown || '',
    Medical_Cooldown: row.Medical_Cooldown || '',
    Booster_Cooldown: row.Booster_Cooldown || '',
    Source: source,
    Payload_JSON: JSON.stringify(sc2614SummarizePayload_(data))
  });
  sc2614Append_(SC2614.HEALTH, {
    Timestamp: new Date(), Torn_ID: String(row.Torn_ID), Name: row.Name || '', Source: source,
    Status: 'OK', Selections: 'profile,bars,cooldowns,travel,icons', Error: '',
    Key_Fingerprint: sc2614Fingerprint_(key), Version: SC2614.VERSION
  });
  sc2614Upsert_(SC2614.REGISTRY, 'Torn_ID', String(row.Torn_ID), {
    Torn_ID: String(row.Torn_ID), Name: row.Name || '', Stored:'TRUE', Last_Sync:new Date(), Last_Status:'OK', Last_Error:'', Updated:new Date()
  });
  return {ok:true, tornId:String(row.Torn_ID), name:row.Name || '', updated: row.Updated};
}

function sc2614AutoSyncTick() {
  if (String(sc2614GetSetting_('Member_API_Auto_Sync', 'TRUE')).toUpperCase() !== 'TRUE') {
    return {ok:true, skipped:true, reason:'Member_API_Auto_Sync is not TRUE'};
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return {ok:false, skipped:true, reason:'Could not acquire lock'};
  try {
    var rows = sc2614ReadObjects_(SC2614.REGISTRY).filter(function(r) {
      return String(r.Stored || '').toUpperCase() === 'TRUE' && String(r.Auto_Sync || 'TRUE').toUpperCase() !== 'FALSE' && r.Torn_ID;
    });
    var limit = Number(sc2614GetSetting_('Member_API_Auto_Sync_Batch_Limit', SC2614.DEFAULT_BATCH_LIMIT)) || SC2614.DEFAULT_BATCH_LIMIT;
    limit = Math.max(1, Math.min(25, limit));
    var cursor = Number(PropertiesService.getScriptProperties().getProperty(SC2614.CURSOR_PROP) || 0) || 0;
    var processed = 0, ok = 0, errors = [];
    for (var i = 0; i < rows.length && processed < limit; i++) {
      var idx = (cursor + i) % rows.length;
      var tornId = String(rows[idx].Torn_ID || '').trim();
      if (!tornId) continue;
      processed++;
      try {
        sc2614SyncMemberFromStoredKey(tornId, 'scheduled_auto_sync');
        ok++;
      } catch (err) {
        errors.push({tornId:tornId, error:String(err && err.message || err)});
        sc2614Upsert_(SC2614.REGISTRY, 'Torn_ID', tornId, {Torn_ID:tornId, Last_Status:'ERROR', Last_Error:String(err && err.message || err), Updated:new Date()});
        sc2614Append_(SC2614.HEALTH, {Timestamp:new Date(), Torn_ID:tornId, Source:'scheduled_auto_sync', Status:'ERROR', Error:String(err && err.message || err), Version:SC2614.VERSION});
      }
      Utilities.sleep(1100); // conservative 1/sec throttle
    }
    if (rows.length) PropertiesService.getScriptProperties().setProperty(SC2614.CURSOR_PROP, String((cursor + processed) % rows.length));
    return {ok:true, totalKeys:rows.length, processed:processed, synced:ok, errors:errors};
  } finally {
    lock.releaseLock();
  }
}

function sc2614StoredMemberApiKeyStatus(tornId) {
  tornId = String(tornId || '').trim();
  var key = PropertiesService.getScriptProperties().getProperty(SC2614.PROP_PREFIX + tornId);
  var row = sc2614ReadObjects_(SC2614.REGISTRY).filter(function(r){ return String(r.Torn_ID) === tornId; })[0] || {};
  return {ok:true, tornId:tornId, stored:!!key, fingerprint:key ? sc2614Fingerprint_(key) : '', registry:row};
}

function sc2614FetchOwnUser_(apiKey) {
  var url = 'https://api.torn.com/user/?selections=profile,bars,cooldowns,travel,icons&key=' + encodeURIComponent(apiKey);
  var res = UrlFetchApp.fetch(url, {muteHttpExceptions:true});
  var code = res.getResponseCode();
  var text = res.getContentText();
  var data;
  try { data = JSON.parse(text); } catch(e) { throw new Error('Non-JSON Torn API response HTTP ' + code); }
  if (data.error) throw new Error('Torn API error ' + data.error.code + ': ' + data.error.error);
  return data;
}

function sc2614ExtractIdentity_(data) {
  return {
    tornId: data.player_id || data.user_id || data.id || (data.profile && (data.profile.player_id || data.profile.user_id || data.profile.id)) || '',
    name: data.name || (data.profile && data.profile.name) || ''
  };
}

function sc2614BuildMemberStatusRow_(data, source) {
  var id = sc2614ExtractIdentity_(data);
  var energy = data.energy || (data.bars && data.bars.energy) || {};
  var nerve = data.nerve || (data.bars && data.bars.nerve) || {};
  var happy = data.happy || (data.bars && data.bars.happy) || {};
  var life = data.life || (data.bars && data.bars.life) || {};
  var cds = data.cooldowns || {};
  var status = data.status || {};
  var travel = data.travel || {};
  var last = data.last_action || {};
  return {
    Torn_ID: String(id.tornId || ''),
    Name: id.name || '',
    Status: status.description || status.state || data.status || '',
    Last_Action: last.relative || last.status || last.timestamp || '',
    Energy: sc2614Bar_(energy),
    Life: sc2614Bar_(life),
    Nerve: sc2614Bar_(nerve),
    Happy: sc2614Bar_(happy),
    Hospital_Until: status.until || status.hospital_until || '',
    Travel_Status: travel.destination || travel.status || travel.location || '',
    Drug_Cooldown: sc2614Cooldown_(cds.drug || cds.drugs),
    Medical_Cooldown: sc2614Cooldown_(cds.medical || cds.med),
    Booster_Cooldown: sc2614Cooldown_(cds.booster || cds.boosters),
    Updated: new Date()
  };
}

function sc2614Bar_(obj) {
  if (obj === null || obj === undefined || obj === '') return '';
  if (typeof obj === 'number' || typeof obj === 'string') return obj;
  var cur = obj.current !== undefined ? obj.current : obj.value;
  var max = obj.maximum !== undefined ? obj.maximum : obj.max;
  if (cur !== undefined && max !== undefined) return cur + '/' + max;
  if (cur !== undefined) return cur;
  return JSON.stringify(obj).slice(0, 80);
}

function sc2614Cooldown_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return v;
  if (v.timestamp) return v.timestamp;
  if (v.time_left) return v.time_left;
  if (v.remaining) return v.remaining;
  return JSON.stringify(v).slice(0, 80);
}

function sc2614SummarizePayload_(data) {
  return {
    player_id:data.player_id, name:data.name, status:data.status, last_action:data.last_action,
    energy:data.energy, nerve:data.nerve, happy:data.happy, life:data.life, cooldowns:data.cooldowns, travel:data.travel
  };
}

function sc2614EnsureSheet_(name, headers) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var current = sh.getLastColumn() ? sh.getRange(1,1,1,Math.max(1, sh.getLastColumn())).getValues()[0].map(String) : [];
  if (!current.length || current.every(function(x){return !x;})) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
  } else {
    var missing = headers.filter(function(h){ return current.indexOf(h) === -1; });
    if (missing.length) sh.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
  return sh;
}

function sc2614Headers_(sh) {
  if (!sh || !sh.getLastColumn()) return [];
  return sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
}

function sc2614ReadObjects_(sheetName) {
  var sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  var headers = sc2614Headers_(sh);
  return sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues().map(function(row) {
    var o = {}; headers.forEach(function(h,i){ o[h] = row[i]; }); return o;
  });
}

function sc2614Append_(sheetName, obj) {
  var sh = sc2614EnsureSheet_(sheetName, Object.keys(obj));
  var headers = sc2614Headers_(sh);
  var row = headers.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; });
  sh.appendRow(row);
}

function sc2614Upsert_(sheetName, keyHeader, keyValue, obj) {
  var headers = Object.keys(obj);
  if (headers.indexOf(keyHeader) === -1) headers.unshift(keyHeader);
  var sh = sc2614EnsureSheet_(sheetName, headers);
  var allHeaders = sc2614Headers_(sh);
  var keyCol = allHeaders.indexOf(keyHeader) + 1;
  var targetRow = 0;
  if (keyCol > 0 && sh.getLastRow() > 1) {
    var vals = sh.getRange(2,keyCol,sh.getLastRow()-1,1).getValues();
    for (var i=0;i<vals.length;i++) if (String(vals[i][0]) === String(keyValue)) { targetRow = i+2; break; }
  }
  if (!targetRow) targetRow = sh.getLastRow() + 1;
  allHeaders.forEach(function(h, i){
    if (obj[h] !== undefined) sh.getRange(targetRow, i+1).setValue(obj[h]);
  });
}

function sc2614Fingerprint_(key) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(key));
  return bytes.map(function(b){ var v=(b<0?b+256:b).toString(16); return v.length===1?'0'+v:v; }).join('').slice(0,12);
}

function sc2614GetSetting_(key, fallback) {
  var rows = sc2614ReadObjects_(SC2614.SETTINGS);
  for (var i=0;i<rows.length;i++) {
    var k = rows[i].Key || rows[i].Setting || rows[i].Name;
    if (String(k) === String(key)) return rows[i].Value;
  }
  return fallback;
}

function sc2614SetSetting_(key, value, notes) {
  sc2614EnsureSheet_(SC2614.SETTINGS, ['Key','Value','Notes','Updated']);
  sc2614Upsert_(SC2614.SETTINGS, 'Key', key, {Key:key, Value:value, Notes:notes || '', Updated:new Date()});
}

function sc2614SetSettingIfMissing_(key, value, notes) {
  var current = sc2614GetSetting_(key, null);
  if (current === null || current === undefined || current === '') sc2614SetSetting_(key, value, notes);
}

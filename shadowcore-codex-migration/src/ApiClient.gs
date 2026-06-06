/**
 * ShadowCore HQ - Torn API client.
 * Uses the classic official API format:
 * https://api.torn.com/faction/:ID?selections=:SELECTIONS&key=:KEY
 * Keep selections minimal and custom-key friendly.
 */

function tornRequest_(section, id, selections, key, params, options) {
  key = sanitizeKey_(key);
  params = params || {};
  options = options || {};
  var path = '/' + encodeURIComponent(section) + '/';
  if (id !== undefined && id !== null && id !== '') path += encodeURIComponent(String(id));
  var query = {
    selections: selections || '',
    key: key
  };
  Object.keys(params).forEach(function(k) {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') query[k] = params[k];
  });
  if (boolSetting_('Api_Bypass_Torn_Service_Cache', false) || options.bypassCache) {
    query.timestamp = unixNow_();
  }
  var qs = Object.keys(query).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]);
  }).join('&');
  var url = APP.API_BASE + path + '?' + qs;
  var cacheKey = 'TORN_' + Utilities.base64EncodeWebSafe(url).slice(0, 200);
  var cache = CacheService.getScriptCache();
  if (!options.bypassLocalCache) {
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  var response;
  try {
    response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {'User-Agent': 'ShadowCoreHQ-GoogleAppsScript/' + APP.VERSION}
    });
  } catch (err) {
    logError_('tornRequest fetch ' + section, err, {section: section, id: id, selections: selections});
    throw err;
  }

  var text = response.getContentText();
  var code = response.getResponseCode();
  var data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    logError_('tornRequest parse ' + section, err, {httpCode: code, body: text.slice(0, 1000)});
    throw new Error('Torn API returned non-JSON response. HTTP ' + code);
  }

  if (data && data.error) {
    handleTornError_(data.error, section, selections);
    throw new Error('Torn API error ' + data.error.code + ': ' + data.error.error);
  }

  cache.put(cacheKey, safeJson_(data), cacheSeconds_());
  return data;
}

function handleTornError_(error, section, selections) {
  logError_('Torn API ' + section, new Error(error.code + ': ' + error.error), {section: section, selections: selections});
  var code = Number(error.code);
  if ([2, 13, 16, 18].indexOf(code) !== -1) {
    appendRowObject_(APP.SHEETS.ERRORS, {
      Timestamp: nowIso_(),
      Source: 'Torn API key issue',
      Message: 'Key may be invalid, paused, inactive, or missing permission. Code ' + code,
      Stack: '',
      Payload: safeJson_({section: section, selections: selections})
    });
  }
}

function verifyApiKeyProfile_(key) {
  var keyInfo = {};
  try {
    keyInfo = tornRequest_('key', '', 'info', key, {}, {bypassLocalCache: true});
  } catch (err) {
    // Some keys/versions may fail key/info. Fall back to user profile.
    logError_('verify key info fallback', err, {});
  }
  var userData = {};
  try {
    userData = tornRequest_('user', '', 'profile,basic', key, {}, {bypassLocalCache: true});
  } catch (err2) {
    // profile may not be available on very minimal keys.
    userData = {};
  }

  var user = (keyInfo && keyInfo.user) || (keyInfo && keyInfo.info && keyInfo.info.user) || {};
  return {
    tornId: user.id || user.user_id || keyInfo.player_id || userData.player_id || userData.user_id || userData.profile && userData.profile.id || '',
    name: user.name || keyInfo.name || userData.name || userData.player_name || '',
    faction_id: user.faction_id || (userData.faction && userData.faction.faction_id) || userData.faction_id || '',
    rawKeyInfo: keyInfo,
    rawUser: userData
  };
}

function fetchFaction_(selections, params) {
  return tornRequest_('faction', factionId_(), selections, getFactionLeaderKey_(), params || {});
}

function fetchUserWithStoredKey_(tornId, selections, params) {
  var key = getStoredApiKey_('MEMBER', tornId);
  if (!key) throw new Error('No stored member key for Torn ID ' + tornId);
  return tornRequest_('user', '', selections, key, params || {});
}

function fetchUserByIdWithLeaderKey_(tornId, selections, params) {
  return tornRequest_('user', tornId, selections, getFactionLeaderKey_(), params || {});
}

function getFactionBasic_() {
  return fetchFaction_('basic', {});
}

function getFactionAttacks_(from, to) {
  var params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (boolSetting_('Use_AttacksFull_First', false)) {
    try {
      return fetchFaction_('attacksfull', params);
    } catch (err) {
      logError_('getFactionAttacks_ attacksfull fallback', err, {from: from, to: to});
    }
  }
  return fetchFaction_('attacks', params);
}

function getFactionChain_() {
  // Selection names vary between API versions/permissions. Try common choices in order.
  var attempts = ['chain', 'chains', 'basic'];
  var lastErr = null;
  for (var i = 0; i < attempts.length; i++) {
    try {
      return fetchFaction_(attempts[i], {});
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Unable to fetch chain data.');
}

function testFactionKey() {
  var data = fetchFaction_('basic', {});
  return {ok: true, name: data.name || data.faction && data.faction.name || '', rawKeys: Object.keys(data)};
}

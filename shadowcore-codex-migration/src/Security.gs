/**
 * ShadowCore HQ - Authentication and API key safety helpers.
 * Full-file build v2.6.14a: includes automatic member API sync registration.
 */

function sanitizeKey_(key) {
  key = String(key || '').trim();
  if (!/^[A-Za-z0-9]{8,64}$/.test(key)) {
    throw new Error('API key format looks invalid. Paste only the Torn API key, no spaces.');
  }
  return key;
}

function keyFingerprint_(key) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sanitizeKey_(key));
  return digest.map(function(b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('').slice(0, 16);
}

function propKeyForApiKey_(type, tornId) {
  return 'TORN_KEY_' + String(type || 'MEMBER').toUpperCase() + '_' + String(tornId || 'UNKNOWN');
}

function storeApiKey_(type, tornId, key) {
  key = sanitizeKey_(key);
  var pkey = propKeyForApiKey_(type, tornId);
  getScriptProps_().setProperty(pkey, key);
  return keyFingerprint_(key);
}

function getStoredApiKey_(type, tornId) {
  return getScriptProps_().getProperty(propKeyForApiKey_(type, tornId));
}

function deleteStoredApiKey_(type, tornId) {
  getScriptProps_().deleteProperty(propKeyForApiKey_(type, tornId));
}

function setFactionLeaderKey(key) {
  key = sanitizeKey_(key);
  var fp = storeApiKey_('FACTION_LEADER', 'PRIMARY', key);
  upsertRowByKey_(APP.SHEETS.API_KEYS, 'Torn_ID', 'FACTION_LEADER', {
    Torn_ID: 'FACTION_LEADER',
    Name: 'Faction Leader Key',
    Role: 'LEADER',
    Key_Type: 'FACTION_LEADER',
    Stored: 'TRUE',
    Access_Level: 'Custom/Leader',
    Selections: 'faction basic,attacks,chain/contributors as enabled',
    Status: 'Stored',
    Last_Checked: nowIso_(),
    Key_Fingerprint: fp,
    Owner_Email: Session.getActiveUser().getEmail() || '',
    Consent: 'Leader provided key',
    Notes: 'Actual key is stored in Script Properties, not in this sheet.'
  });
  logAudit_(Session.getActiveUser().getEmail() || 'leader', 'setFactionLeaderKey', 'Stored faction leader key fingerprint ' + fp);
  return {ok: true, fingerprint: fp};
}

function getFactionLeaderKey_() {
  var key = getStoredApiKey_('FACTION_LEADER', 'PRIMARY');
  if (key) return key;
  var apiRows = readTable_(APP.SHEETS.API_KEYS);
  for (var i = 0; i < apiRows.length; i++) {
    if (String(apiRows[i].Key_Type).toUpperCase() === 'FACTION_LEADER') {
      return getStoredApiKey_('FACTION_LEADER', 'PRIMARY');
    }
  }
  throw new Error('No faction leader API key stored. Run setFactionLeaderKey("YOUR_KEY") or submit one through the leader panel.');
}

function adminEmailAllowed_() {
  var email = Session.getActiveUser().getEmail();
  if (!email) return false;
  var allowed = String(setting_('Admin_Emails', '')).split(',').map(function(x) { return x.trim().toLowerCase(); }).filter(Boolean);
  return allowed.indexOf(email.toLowerCase()) !== -1;
}

function isAdminToken_(token) {
  token = String(token || '').trim();
  return token && token === String(setting_('Admin_Token', ''));
}

function createSession_(user) {
  user = user || {};
  var sessionId = Utilities.getUuid();
  var persistentSeconds = sessionPersistentSeconds_();
  var requestedRole = String(user.role || 'PUBLIC').toUpperCase();
  // Apps Script deployments in this repo historically used ADMIN for leader
  // token sessions, but APP.ROLES does not define ADMIN. Normalize it here so
  // the server-side session and the browser badge agree after navigation.
  if (requestedRole === 'ADMIN') requestedRole = 'LEADER';
  var authSource = String(user.authSource || user.authMode || '').toUpperCase();
  var payload = {
    sessionId: sessionId,
    tornId: String(user.tornId || ''),
    name: user.name || '',
    role: roleName_(requestedRole || 'PUBLIC'),
    roleValue: roleValue_(requestedRole || 'PUBLIC'),
    email: user.email || Session.getActiveUser().getEmail() || '',
    authSource: authSource || (user.apiLogin ? 'TORN_API_KEY' : (user.memberTokenLogin ? 'MEMBER_TOKEN' : (requestedRole === 'LEADER' ? 'ADMIN_TOKEN' : 'UNKNOWN'))),
    apiLogin: !!user.apiLogin,
    adminToken: !!user.adminToken,
    memberTokenLogin: !!user.memberTokenLogin,
    lastLogin: nowIso_(),
    created: nowIso_(),
    expires: new Date(Date.now() + persistentSeconds * 1000).toISOString(),
    persistent: true
  };

  // CacheService is fast but temporary; it may evict early and can be lost after
  // deployments. Store the same session in Script Properties so members/admins
  // stay logged in across navigation, refreshes, and redeploys.
  var json = safeJson_(payload);
  CacheService.getScriptCache().put('SESSION_' + sessionId, json, Math.min(APP.SESSION_SECONDS || 21600, 21600));
  PropertiesService.getScriptProperties().setProperty('SESSION_' + sessionId, json);
  cleanupExpiredPersistentSessions_();
  return {sessionId: sessionId, user: payload, expiresInSeconds: persistentSeconds};
}

function getSession_(sessionId) {
  if (!sessionId) return null;
  var key = 'SESSION_' + String(sessionId);
  var raw = CacheService.getScriptCache().get(key);
  if (!raw) raw = PropertiesService.getScriptProperties().getProperty(key);
  if (!raw) return null;

  try {
    var session = JSON.parse(raw);
    session.sessionId = String(session.sessionId || sessionId);
    if (String(session.role || '').toUpperCase() === 'ADMIN') {
      session.role = 'LEADER';
      session.roleValue = roleValue_('LEADER');
      session.authSource = session.authSource || 'ADMIN_TOKEN';
    }
    if (!session.authSource) {
      session.authSource = session.apiLogin ? 'TORN_API_KEY' : (session.memberTokenLogin ? 'MEMBER_TOKEN' : (Number(session.roleValue || 0) >= roleValue_('LEADER') ? 'ADMIN_TOKEN' : 'UNKNOWN'));
    }
    if (session.expires && new Date(session.expires).getTime() < Date.now()) {
      CacheService.getScriptCache().remove(key);
      PropertiesService.getScriptProperties().deleteProperty(key);
      return null;
    }
    // Re-warm the cache so normal page loads stay fast.
    CacheService.getScriptCache().put(key, safeJson_(session), Math.min(APP.SESSION_SECONDS || 21600, 21600));
    return session;
  } catch (e) {
    CacheService.getScriptCache().remove(key);
    PropertiesService.getScriptProperties().deleteProperty(key);
    return null;
  }
}

function sessionPersistentSeconds_() {
  var days = Number(setting_('Session_Remember_Days', '30') || 30);
  if (!isFinite(days) || days < 1) days = 30;
  if (days > 90) days = 90;
  return Math.floor(days * 24 * 60 * 60);
}

function cleanupExpiredPersistentSessions_() {
  // Light cleanup only, to avoid slowing logins.
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var now = Date.now();
  var removed = 0;
  Object.keys(all).forEach(function(k) {
    if (removed >= 25 || k.indexOf('SESSION_') !== 0) return;
    try {
      var s = JSON.parse(all[k] || '{}');
      if (s.expires && new Date(s.expires).getTime() < now) {
        props.deleteProperty(k);
        removed++;
      }
    } catch (e) {
      props.deleteProperty(k);
      removed++;
    }
  });
}

function requireSession_(sessionId) {
  var session = getSession_(sessionId);
  if (!session) throw new Error('Login session expired or missing.');
  return session;
}

function requireRole_(sessionId, minRole) {
  var session = requireSession_(sessionId);
  if (session.roleValue < roleValue_(minRole)) {
    throw new Error('Permission denied. Required role: ' + roleName_(minRole));
  }
  return session;
}

function leaderLogin(token) {
  var mode = String(setting_('Auth_Mode', 'EmailOrToken')).toLowerCase();
  var okByEmail = adminEmailAllowed_();
  var okByToken = isAdminToken_(token);
  if (mode === 'emailonly' && !okByEmail) throw new Error('Leader login requires an allowed Google email.');
  if (mode === 'tokenonly' && !okByToken) throw new Error('Leader login requires the Admin_Token.');
  if (mode === 'emailortoken' && !(okByEmail || okByToken)) throw new Error('Leader login failed. Use an allowed Google email or the Admin_Token.');
  var session = createSession_({tornId: 'LEADER', name: 'Leader', role: 'LEADER'});
  logAudit_(session.user.email || 'leader', 'leaderLogin', 'Leader session created.');
  return session;
}

function logout(sessionId) {
  if (sessionId) {
    CacheService.getScriptCache().remove('SESSION_' + sessionId);
    PropertiesService.getScriptProperties().deleteProperty('SESSION_' + sessionId);
  }
  return {ok: true};
}

function connectApiKey(key, consent) {
  key = sanitizeKey_(key);
  consent = consent || {};
  if (!consent.accepted) {
    throw new Error('You must accept the API disclosure before connecting a key.');
  }
  var profile = verifyApiKeyProfile_(key);
  var tornId = String(profile.tornId || profile.player_id || profile.user_id || '');
  var name = profile.name || profile.player_name || ('Torn ' + tornId);
  var role = findMemberRole_(tornId) || 'MEMBER';
  var storeKeys = boolSetting_('Store_Member_Keys', true);
  var fp = keyFingerprint_(key);
  if (storeKeys) storeApiKey_('MEMBER', tornId, key);

  upsertRowByKey_(APP.SHEETS.API_KEYS, 'Torn_ID', tornId, {
    Torn_ID: tornId,
    Name: name,
    Role: role,
    Key_Type: 'MEMBER',
    Stored: storeKeys ? 'TRUE' : 'FALSE',
    Access_Level: consent.accessLevel || 'Custom/Unknown',
    Selections: consent.selections || 'Not provided',
    Status: 'Verified',
    Last_Checked: nowIso_(),
    Key_Fingerprint: fp,
    Owner_Email: Session.getActiveUser().getEmail() || '',
    Consent: safeJson_(consent).slice(0, 5000),
    Notes: 'Key verified through Torn API. Actual key is not written into this sheet.'
  });

  upsertRowByKey_(APP.SHEETS.MEMBERS, 'Torn_ID', tornId, {
    Torn_ID: tornId,
    Name: name,
    Role: role,
    Rank: '',
    Joined: '',
    Discord: consent.discord || '',
    Active: 'TRUE',
    Last_Seen: nowIso_(),
    Faction_ID: profile.faction_id || '',
    Profile_URL: 'https://www.torn.com/profiles.php?XID=' + tornId,
    Notes: ''
  });

  var autoSyncResult = null;
  try {
    if (typeof sc2614RegisterMemberApiKeyForAutoSync === 'function') {
      autoSyncResult = sc2614RegisterMemberApiKeyForAutoSync(key, 'api_login');
    }
  } catch (syncErr) {
    autoSyncResult = {ok:false, error:String(syncErr && syncErr.message || syncErr)};
    try { Logger.log('v2.6.14 auto member API sync failed: ' + autoSyncResult.error); } catch (logErr) {}
  }

  var session = createSession_({tornId: tornId, name: name, role: role});
  session.autoMemberApiSync = autoSyncResult;
  logAudit_(name, 'connectApiKey', 'Verified key fingerprint ' + fp + ', stored=' + storeKeys + ', autoSync=' + safeJson_(autoSyncResult || {}).slice(0, 500));
  return session;
}

function deleteMyKey(sessionId) {
  var session = requireSession_(sessionId);
  deleteStoredApiKey_('MEMBER', session.tornId);
  try {
    if (typeof sc2614RemoveStoredMemberApiKey === 'function') sc2614RemoveStoredMemberApiKey(session.tornId);
  } catch (syncErr) {
    try { Logger.log('v2.6.14 remove auto-sync key failed: ' + syncErr); } catch (logErr) {}
  }
  upsertRowByKey_(APP.SHEETS.API_KEYS, 'Torn_ID', session.tornId, {
    Torn_ID: session.tornId,
    Name: session.name,
    Role: session.role,
    Key_Type: 'MEMBER',
    Stored: 'FALSE',
    Status: 'Deleted by member',
    Last_Checked: nowIso_(),
    Notes: 'Member removed stored key.'
  });
  logAudit_(session.name, 'deleteMyKey', 'Member removed stored API key.');
  return {ok: true};
}

function findMemberRole_(tornId) {
  var members = readTable_(APP.SHEETS.MEMBERS);
  for (var i = 0; i < members.length; i++) {
    if (String(members[i].Torn_ID) === String(tornId)) return members[i].Role || 'MEMBER';
  }
  return null;
}


/**
 * v2.6.15 - Unique auth entry points.
 * The client calls these names so older duplicate login functions cannot return null.
 */
function sc2615SessionResult_(session, source) {
  if (!session || typeof session !== 'object') throw new Error((source || 'Login') + ' failed: no session object returned.');
  if (!session.sessionId) throw new Error((source || 'Login') + ' failed: sessionId was not created.');
  session.user = session.user || {};
  return session;
}

function sc2615LeaderLogin(token) {
  var mode = String(setting_('Auth_Mode', 'EmailOrToken')).toLowerCase();
  var okByEmail = adminEmailAllowed_();
  var okByToken = isAdminToken_(token);
  if (mode === 'emailonly' && !okByEmail) throw new Error('Leader login requires an allowed Google email.');
  if (mode === 'tokenonly' && !okByToken) throw new Error('Leader login requires the Admin_Token.');
  if (mode === 'emailortoken' && !(okByEmail || okByToken)) throw new Error('Leader login failed. Use an allowed Google email or the Admin_Token.');
  var session = createSession_({tornId: 'LEADER', name: 'Leader', role: 'ADMIN'});
  session.user = session.user || {};
  session.user.adminToken = !!okByToken;
  session.user.role = 'ADMIN';
  session.user.roleValue = roleValue_('ADMIN');
  logAudit_(session.user.email || 'leader', 'sc2615LeaderLogin', 'Leader/admin session created.');
  return sc2615SessionResult_(session, 'Leader token login');
}

function sc2615ConnectApiKey(key, consent) {
  key = sanitizeKey_(key);
  consent = consent || {};
  if (!consent.accepted) throw new Error('You must accept the API disclosure before connecting a key.');

  var profile = verifyApiKeyProfile_(key) || {};
  var tornId = String(profile.tornId || profile.player_id || profile.user_id || profile.id || '').trim();
  if (!tornId) throw new Error('API key verified, but Torn ID could not be read from the API response. Check key selections/permissions.');

  var name = profile.name || profile.player_name || ('Torn ' + tornId);
  var role = findMemberRole_(tornId) || 'MEMBER';
  var storeKeys = boolSetting_('Store_Member_Keys', true);
  var fp = keyFingerprint_(key);
  if (storeKeys) storeApiKey_('MEMBER', tornId, key);

  upsertRowByKey_(APP.SHEETS.API_KEYS, 'Torn_ID', tornId, {
    Torn_ID: tornId,
    Name: name,
    Role: role,
    Key_Type: 'MEMBER',
    Stored: storeKeys ? 'TRUE' : 'FALSE',
    Access_Level: consent.accessLevel || 'Custom/Member',
    Selections: consent.selections || 'Not provided',
    Status: 'Verified',
    Last_Checked: nowIso_(),
    Key_Fingerprint: fp,
    Owner_Email: Session.getActiveUser().getEmail() || '',
    Consent: safeJson_(consent).slice(0, 5000),
    Notes: 'Key verified through Torn API. Actual key is stored in Script Properties, not this sheet.'
  });

  upsertRowByKey_(APP.SHEETS.MEMBERS, 'Torn_ID', tornId, {
    Torn_ID: tornId,
    Name: name,
    Role: role,
    Rank: '',
    Joined: '',
    Discord: consent.discord || '',
    Active: 'TRUE',
    Last_Seen: nowIso_(),
    Faction_ID: profile.faction_id || '',
    Profile_URL: 'https://www.torn.com/profiles.php?XID=' + tornId,
    Notes: ''
  });

  var autoSyncResult = null;
  try {
    if (typeof sc2614RegisterMemberApiKeyForAutoSync === 'function') {
      autoSyncResult = sc2614RegisterMemberApiKeyForAutoSync(key, 'api_login');
    }
  } catch (syncErr) {
    autoSyncResult = {ok:false, error:String(syncErr && syncErr.message || syncErr)};
    try { Logger.log('v2.6.15 auto member API sync failed: ' + autoSyncResult.error); } catch (logErr) {}
  }

  var session = createSession_({tornId: tornId, name: name, role: role});
  session.autoMemberApiSync = autoSyncResult;
  logAudit_(name, 'sc2615ConnectApiKey', 'Verified key fingerprint ' + fp + ', stored=' + storeKeys + ', autoSync=' + safeJson_(autoSyncResult || {}).slice(0, 500));
  return sc2615SessionResult_(session, 'API login');
}

function testSc2615LeaderLogin(token) {
  var session = sc2615LeaderLogin(token);
  return {ok:true, hasSessionId: !!session.sessionId, user: session.user};
}

/**
 * v2.6.16 - Collision-proof login endpoints.
 * These use new function names so no older duplicate auth functions can override them.
 * They also return a small, plain, serializable session object to avoid google.script.run returning null.
 */
function sc2616PlainSessionResponse_(session, source) {
  if (!session || !session.sessionId) {
    throw new Error((source || 'Login') + ' failed internally: no sessionId was created.');
  }
  var user = session.user || {};
  return {
    ok: true,
    sessionId: String(session.sessionId || ''),
    expiresInSeconds: Number(session.expiresInSeconds || session.expires_in_seconds || sessionPersistentSeconds_()),
    user: {
      tornId: String(user.tornId || user.Torn_ID || ''),
      name: String(user.name || user.Name || ''),
      role: String(user.role || user.Role || 'MEMBER'),
      roleValue: Number(user.roleValue || user.Role_Value || roleValue_(user.role || 'MEMBER')),
      email: String(user.email || ''),
      adminToken: !!user.adminToken,
      apiLogin: !!user.apiLogin
    },
    autoMemberApiSync: session.autoMemberApiSync || null,
    source: source || 'login',
    version: '2.6.16'
  };
}

function sc2616LeaderLogin(token) {
  var mode = String(setting_('Auth_Mode', 'EmailOrToken')).toLowerCase();
  var okByEmail = adminEmailAllowed_();
  var okByToken = isAdminToken_(token);
  if (mode === 'emailonly' && !okByEmail) throw new Error('Leader login requires an allowed Google email.');
  if (mode === 'tokenonly' && !okByToken) throw new Error('Leader login requires the Admin_Token.');
  if (mode === 'emailortoken' && !(okByEmail || okByToken)) throw new Error('Leader login failed. Use an allowed Google email or the Admin_Token.');

  var session = createSession_({tornId: 'LEADER', name: 'Leader', role: 'ADMIN'});
  session.user = session.user || {};
  session.user.adminToken = !!okByToken;
  session.user.apiLogin = false;
  session.user.role = 'ADMIN';
  session.user.roleValue = roleValue_('ADMIN');
  logAudit_(session.user.email || 'leader', 'sc2616LeaderLogin', 'Leader/admin session created.');
  return sc2616PlainSessionResponse_(session, 'Leader token login');
}

function sc2616ConnectApiKey(key, consent) {
  key = sanitizeKey_(key);
  consent = consent || {};
  if (!consent.accepted) throw new Error('You must accept the API disclosure before connecting a key.');

  var profile = verifyApiKeyProfile_(key) || {};
  var tornId = String(profile.tornId || profile.Torn_ID || profile.player_id || profile.user_id || profile.id || '').trim();
  if (!tornId) throw new Error('API key verified, but Torn ID could not be read from the API response. Check key selections/permissions.');

  var name = profile.name || profile.Name || profile.player_name || ('Torn ' + tornId);
  var role = findMemberRole_(tornId) || 'MEMBER';
  var storeKeys = boolSetting_('Store_Member_Keys', true);
  var fp = keyFingerprint_(key);
  if (storeKeys) storeApiKey_('MEMBER', tornId, key);

  upsertRowByKey_(APP.SHEETS.API_KEYS, 'Torn_ID', tornId, {
    Torn_ID: tornId,
    Name: name,
    Role: role,
    Key_Type: 'MEMBER',
    Stored: storeKeys ? 'TRUE' : 'FALSE',
    Access_Level: consent.accessLevel || 'Custom/Member',
    Selections: consent.selections || 'Not provided',
    Status: 'Verified',
    Last_Checked: nowIso_(),
    Key_Fingerprint: fp,
    Owner_Email: Session.getActiveUser().getEmail() || '',
    Consent: safeJson_(consent).slice(0, 5000),
    Notes: 'Key verified through Torn API. Actual key is stored in Script Properties, not this sheet.'
  });

  upsertRowByKey_(APP.SHEETS.MEMBERS, 'Torn_ID', tornId, {
    Torn_ID: tornId,
    Name: name,
    Role: role,
    Rank: '',
    Joined: '',
    Discord: consent.discord || '',
    Active: 'TRUE',
    Last_Seen: nowIso_(),
    Faction_ID: profile.faction_id || profile.factionID || '',
    Profile_URL: 'https://www.torn.com/profiles.php?XID=' + tornId,
    Notes: ''
  });

  var autoSyncResult = null;
  try {
    if (typeof sc2614RegisterMemberApiKeyForAutoSync === 'function') {
      autoSyncResult = sc2614RegisterMemberApiKeyForAutoSync(key, 'api_login');
    }
  } catch (syncErr) {
    autoSyncResult = {ok:false, error:String(syncErr && syncErr.message || syncErr)};
    try { Logger.log('v2.6.16 auto member API sync failed: ' + autoSyncResult.error); } catch (logErr) {}
  }

  var session = createSession_({tornId: tornId, name: name, role: role});
  session.user = session.user || {};
  session.user.apiLogin = true;
  session.user.adminToken = false;
  session.autoMemberApiSync = autoSyncResult;
  logAudit_(name, 'sc2616ConnectApiKey', 'Verified key fingerprint ' + fp + ', stored=' + storeKeys + ', autoSync=' + safeJson_(autoSyncResult || {}).slice(0, 500));
  return sc2616PlainSessionResponse_(session, 'API login');
}

function sc2616ValidateSession(sessionId) {
  var session = getSession_(sessionId);
  if (!session) return {ok:false, error:'No valid session found for that sessionId.'};
  return sc2616PlainSessionResponse_({sessionId: sessionId, user: session, expiresInSeconds: sessionPersistentSeconds_()}, 'Validate session');
}

function testSc2616LeaderLogin(token) {
  return sc2616LeaderLogin(token);
}

function debugSc2616AuthConfig() {
  return {
    ok: true,
    version: '2.6.16',
    authMode: String(setting_('Auth_Mode', 'EmailOrToken')),
    adminTokenSet: !!String(setting_('Admin_Token', '') || ''),
    storeMemberKeys: boolSetting_('Store_Member_Keys', true),
    sessionRememberDays: String(setting_('Session_Remember_Days', '30')),
    hasAutoSyncFunction: typeof sc2614RegisterMemberApiKeyForAutoSync === 'function'
  };
}



/**
 * v2.6.17 - API login verification repair.
 * Leader login was already working. This version keeps the same leader flow and
 * replaces API-key verification with a tolerant one-selection-at-a-time verifier.
 *
 * Why: Some custom Torn keys fail when profile,basic are requested together, or
 * when one selected field is unavailable. This verifier tries key/info, then
 * user profile and user basic separately, then extracts owner identity from any
 * shape Torn returns.
 */

function sc2617LeaderLogin(token) {
  // Keep the known-working v2.6.16 leader flow.
  return sc2616LeaderLogin(token);
}

function sc2617ConnectApiKey(key, consent) {
  key = sanitizeKey_(key);
  consent = consent || {};
  if (!consent.accepted) throw new Error('You must accept the API disclosure before connecting a key.');

  var verified = sc2617VerifyApiKeyProfile_(key);
  var profile = verified.profile || {};
  var tornId = String(profile.tornId || profile.Torn_ID || profile.player_id || profile.user_id || profile.id || '').trim();
  if (!tornId) {
    throw new Error('API key checked, but Torn ID could not be read. Create/use a Torn API key that includes user -> basic or user -> profile, then try again.');
  }

  var name = String(profile.name || profile.Name || profile.player_name || ('Torn ' + tornId)).trim();
  var role = findMemberRole_(tornId) || 'MEMBER';
  var storeKeys = boolSetting_('Store_Member_Keys', true);
  var fp = keyFingerprint_(key);

  if (storeKeys) storeApiKey_('MEMBER', tornId, key);

  upsertRowByKey_(APP.SHEETS.API_KEYS, 'Torn_ID', tornId, {
    Torn_ID: tornId,
    Name: name,
    Role: role,
    Key_Type: 'MEMBER',
    Stored: storeKeys ? 'TRUE' : 'FALSE',
    Access_Level: verified.accessLevel || consent.accessLevel || 'Custom/Member',
    Selections: verified.selectionsSummary || consent.selections || 'Verified from Torn API',
    Status: 'Verified',
    Last_Checked: nowIso_(),
    Key_Fingerprint: fp,
    Owner_Email: Session.getActiveUser().getEmail() || '',
    Consent: safeJson_(consent).slice(0, 5000),
    Notes: 'v2.6.17 verified. Actual key is stored in Script Properties, not this sheet.'
  });

  upsertRowByKey_(APP.SHEETS.MEMBERS, 'Torn_ID', tornId, {
    Torn_ID: tornId,
    Name: name,
    Role: role,
    Rank: '',
    Joined: '',
    Discord: consent.discord || '',
    Active: 'TRUE',
    Last_Seen: nowIso_(),
    Faction_ID: profile.faction_id || profile.factionID || '',
    Profile_URL: 'https://www.torn.com/profiles.php?XID=' + tornId,
    Notes: ''
  });

  var autoSyncResult = null;
  try {
    if (typeof sc2614RegisterMemberApiKeyForAutoSync === 'function') {
      autoSyncResult = sc2614RegisterMemberApiKeyForAutoSync(key, 'api_login_v2617');
    }
  } catch (syncErr) {
    // Do NOT fail login if bars/cooldowns auto-sync lacks permissions.
    autoSyncResult = {ok:false, error:String(syncErr && syncErr.message || syncErr)};
    try { Logger.log('v2.6.17 auto member API sync failed, login still allowed: ' + autoSyncResult.error); } catch (logErr) {}
  }

  var session = createSession_({tornId: tornId, name: name, role: role});
  session.user = session.user || {};
  session.user.apiLogin = true;
  session.user.adminToken = false;
  session.autoMemberApiSync = autoSyncResult;
  session.apiVerify = {
    ok: true,
    method: verified.method,
    warnings: verified.warnings || []
  };

  logAudit_(name, 'sc2617ConnectApiKey', 'Verified key fingerprint ' + fp + ', method=' + verified.method + ', stored=' + storeKeys + ', autoSync=' + safeJson_(autoSyncResult || {}).slice(0, 500));
  return sc2616PlainSessionResponse_(session, 'API login v2.6.17');
}

function sc2617VerifyApiKeyProfile_(key) {
  key = sanitizeKey_(key);
  var warnings = [];
  var keyInfo = null;
  var keyInfoErr = null;

  try {
    keyInfo = sc2617TornRequestRaw_('key', '', 'info', key);
  } catch (e0) {
    keyInfoErr = String(e0 && e0.message || e0);
    warnings.push('key/info failed: ' + keyInfoErr);
  }

  var tries = [
    {section:'user', id:'', selections:'profile'},
    {section:'user', id:'', selections:'basic'},
    {section:'user', id:'', selections:'profile,basic'}
  ];

  var lastErr = '';
  for (var i = 0; i < tries.length; i++) {
    try {
      var t = tries[i];
      var data = sc2617TornRequestRaw_(t.section, t.id, t.selections, key);
      var profile = sc2617ExtractProfile_(data, keyInfo);
      if (profile && (profile.tornId || profile.player_id || profile.user_id || profile.id)) {
        return {
          ok: true,
          method: t.section + ':' + t.selections,
          profile: profile,
          keyInfo: keyInfo,
          accessLevel: sc2617AccessLabel_(keyInfo),
          selectionsSummary: sc2617SelectionsSummary_(keyInfo),
          warnings: warnings
        };
      }
      warnings.push(t.selections + ' returned JSON but no readable player id.');
    } catch (e1) {
      lastErr = String(e1 && e1.message || e1);
      warnings.push(tries[i].selections + ' failed: ' + lastErr);
    }
  }

  // If an older Torn key/info shape includes user owner data, accept that.
  var keyProfile = sc2617ExtractProfile_({}, keyInfo);
  if (keyProfile && (keyProfile.tornId || keyProfile.player_id || keyProfile.user_id || keyProfile.id)) {
    return {
      ok: true,
      method: 'key:info owner',
      profile: keyProfile,
      keyInfo: keyInfo,
      accessLevel: sc2617AccessLabel_(keyInfo),
      selectionsSummary: sc2617SelectionsSummary_(keyInfo),
      warnings: warnings
    };
  }

  throw new Error(
    'API key could not identify your Torn account. Your key may be missing user -> basic or user -> profile, paused/invalid, or Torn returned an API error. Last error: ' +
    (lastErr || keyInfoErr || 'No readable profile returned.')
  );
}

function sc2617TornRequestRaw_(section, id, selections, key) {
  var path = '/' + encodeURIComponent(section) + '/';
  if (id !== undefined && id !== null && id !== '') path += encodeURIComponent(String(id));
  var url = 'https://api.torn.com' + path + '?selections=' + encodeURIComponent(selections || '') + '&key=' + encodeURIComponent(key) + '&timestamp=' + Math.floor(Date.now() / 1000);
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {'User-Agent': 'ShadowCoreHQ-GoogleAppsScript/2.6.17'}
  });
  var code = response.getResponseCode();
  var text = response.getContentText() || '';
  var data;
  try {
    data = JSON.parse(text);
  } catch (parseErr) {
    throw new Error('Torn API returned non-JSON response. HTTP ' + code + '. Body: ' + text.slice(0, 250));
  }
  if (data && data.error) {
    throw new Error('Torn API error ' + data.error.code + ': ' + data.error.error + ' [' + section + ':' + selections + ']');
  }
  return data || {};
}

function sc2617ExtractProfile_(userData, keyInfo) {
  userData = userData || {};
  keyInfo = keyInfo || {};

  var profile = {};
  var candidates = [
    userData,
    userData.profile,
    userData.basic,
    userData.user,
    userData.personalstats,
    keyInfo.user,
    keyInfo.info && keyInfo.info.user,
    keyInfo.owner,
    keyInfo.player
  ].filter(function(x) { return x && typeof x === 'object'; });

  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (!profile.tornId) profile.tornId = c.player_id || c.user_id || c.torn_id || c.id || c.ID || c.Torn_ID || '';
    if (!profile.name) profile.name = c.name || c.player_name || c.username || c.Name || '';
    if (!profile.faction_id) {
      profile.faction_id =
        c.faction_id ||
        c.factionID ||
        (c.faction && (c.faction.faction_id || c.faction.id || c.faction.ID)) ||
        '';
    }
  }

  // Classic v1 profile often places player_id and name at top level.
  if (!profile.tornId) profile.tornId = userData.player_id || userData.user_id || userData.id || '';
  if (!profile.name) profile.name = userData.name || userData.player_name || '';

  return profile;
}

function sc2617AccessLabel_(keyInfo) {
  keyInfo = keyInfo || {};
  return String(keyInfo.access_type || keyInfo.accessType || keyInfo.type || keyInfo.access_level || keyInfo.accessLevel || '');
}

function sc2617SelectionsSummary_(keyInfo) {
  keyInfo = keyInfo || {};
  var selections = keyInfo.selections || (keyInfo.info && keyInfo.info.selections) || null;
  if (!selections) return '';
  try {
    if (typeof selections === 'string') return selections.slice(0, 1000);
    var parts = [];
    Object.keys(selections).forEach(function(section) {
      var vals = selections[section];
      if (Array.isArray(vals)) parts.push(section + ':' + vals.join('|'));
    });
    return parts.join(', ').slice(0, 1000);
  } catch (e) {
    return safeJson_(selections).slice(0, 1000);
  }
}

function debugSc2617AuthConfig() {
  return {
    ok: true,
    version: '2.6.17',
    authMode: String(setting_('Auth_Mode', 'EmailOrToken')),
    adminTokenSet: !!String(setting_('Admin_Token', '') || ''),
    storeMemberKeys: boolSetting_('Store_Member_Keys', true),
    hasAutoSyncFunction: typeof sc2614RegisterMemberApiKeyForAutoSync === 'function'
  };
}

function testSc2617ApiLogin(key) {
  var verified = sc2617VerifyApiKeyProfile_(key);
  return {
    ok: true,
    method: verified.method,
    profile: verified.profile,
    accessLevel: verified.accessLevel,
    selectionsSummary: verified.selectionsSummary,
    warnings: verified.warnings
  };
}

/**
 * ShadowCore HQ v2.6.18 - API login v1/v2 endpoint repair.
 *
 * Purpose:
 * - Leader-token login was already working, so it stays on the stable path.
 * - API-key login now tries Torn API v2 user endpoints first for basic/profile,
 *   then v1 legacy endpoints, and returns useful debug/error text instead of null.
 * - This is a full-file replacement build; do not paste this file into HTML.
 */

function sc2618LeaderLogin(token) {
  return sc2616LeaderLogin(token);
}

function sc2618ConnectApiKey(key, consent) {
  key = sanitizeKey_(key);
  consent = consent || {};
  if (!consent.accepted) throw new Error('You must accept the API disclosure before connecting a key.');

  var verified = sc2618VerifyApiKeyProfile_(key);
  var profile = verified.profile || {};
  var tornId = String(profile.tornId || profile.Torn_ID || profile.player_id || profile.user_id || profile.id || profile.ID || '').trim();
  if (!tornId) {
    throw new Error('API key checked, but Torn ID could not be read. Use a Torn API key with user -> basic or user -> profile access, then try again. Debug: ' + safeJson_(verified).slice(0, 800));
  }

  var name = String(profile.name || profile.Name || profile.player_name || profile.username || ('Torn ' + tornId)).trim();
  var role = findMemberRole_(tornId) || 'MEMBER';
  var storeKeys = boolSetting_('Store_Member_Keys', true);
  var fp = keyFingerprint_(key);

  if (storeKeys) storeApiKey_('MEMBER', tornId, key);

  upsertRowByKey_(APP.SHEETS.API_KEYS, 'Torn_ID', tornId, {
    Torn_ID: tornId,
    Name: name,
    Role: role,
    Key_Type: 'MEMBER',
    Stored: storeKeys ? 'TRUE' : 'FALSE',
    Access_Level: verified.accessLevel || consent.accessLevel || 'Custom/Member',
    Selections: verified.selectionsSummary || consent.selections || 'Verified from Torn API v1/v2',
    Status: 'Verified',
    Last_Checked: nowIso_(),
    Key_Fingerprint: fp,
    Owner_Email: Session.getActiveUser().getEmail() || '',
    Consent: safeJson_(consent).slice(0, 5000),
    Notes: 'v2.6.18 verified via ' + verified.method + '. Actual key is stored in Script Properties, not this sheet.'
  });

  upsertRowByKey_(APP.SHEETS.MEMBERS, 'Torn_ID', tornId, {
    Torn_ID: tornId,
    Name: name,
    Role: role,
    Rank: '',
    Joined: '',
    Discord: consent.discord || '',
    Active: 'TRUE',
    Last_Seen: nowIso_(),
    Faction_ID: profile.faction_id || profile.factionID || (profile.faction && (profile.faction.id || profile.faction.faction_id)) || '',
    Profile_URL: 'https://www.torn.com/profiles.php?XID=' + tornId,
    Notes: ''
  });

  var autoSyncResult = null;
  try {
    if (typeof sc2614RegisterMemberApiKeyForAutoSync === 'function') {
      autoSyncResult = sc2614RegisterMemberApiKeyForAutoSync(key, 'api_login_v2618');
    }
  } catch (syncErr) {
    autoSyncResult = {ok:false, error:String(syncErr && syncErr.message || syncErr)};
    try { Logger.log('v2.6.18 auto member API sync failed, login still allowed: ' + autoSyncResult.error); } catch (logErr) {}
  }

  var session = createSession_({tornId: tornId, name: name, role: role});
  session.user = session.user || {};
  session.user.apiLogin = true;
  session.user.adminToken = false;
  session.autoMemberApiSync = autoSyncResult;
  session.apiVerify = {ok:true, method: verified.method, warnings: verified.warnings || []};

  logAudit_(name, 'sc2618ConnectApiKey', 'Verified key fingerprint ' + fp + ', method=' + verified.method + ', stored=' + storeKeys + ', autoSync=' + safeJson_(autoSyncResult || {}).slice(0, 500));
  return sc2616PlainSessionResponse_(session, 'API login v2.6.18');
}

function sc2618VerifyApiKeyProfile_(key) {
  key = sanitizeKey_(key);
  var warnings = [];
  var keyInfo = null;
  try {
    keyInfo = sc2618TornRequestRawUrl_('https://api.torn.com/key/?selections=info&key=' + encodeURIComponent(key) + '&timestamp=' + Math.floor(Date.now()/1000), 'v1 key/info');
  } catch (e0) {
    warnings.push('v1 key/info failed: ' + String(e0 && e0.message || e0));
    try {
      keyInfo = sc2618TornRequestRawUrl_('https://api.torn.com/v2/key?selections=info&key=' + encodeURIComponent(key) + '&timestamp=' + Math.floor(Date.now()/1000), 'v2 key/info');
    } catch (e0b) {
      warnings.push('v2 key/info failed: ' + String(e0b && e0b.message || e0b));
    }
  }

  var tries = [
    {label:'v2 user/basic', url:'https://api.torn.com/v2/user?selections=basic&key=' + encodeURIComponent(key)},
    {label:'v2 user/profile', url:'https://api.torn.com/v2/user?selections=profile&key=' + encodeURIComponent(key)},
    {label:'v2 user/basic,profile', url:'https://api.torn.com/v2/user?selections=basic,profile&key=' + encodeURIComponent(key)},
    {label:'v1 user/profile', url:'https://api.torn.com/user/?selections=profile&key=' + encodeURIComponent(key)},
    {label:'v1 user/basic', url:'https://api.torn.com/user/?selections=basic&key=' + encodeURIComponent(key)},
    {label:'v1 user/default', url:'https://api.torn.com/user/?selections=&key=' + encodeURIComponent(key)}
  ];

  var lastErr = '';
  for (var i = 0; i < tries.length; i++) {
    try {
      var data = sc2618TornRequestRawUrl_(tries[i].url + '&timestamp=' + Math.floor(Date.now()/1000), tries[i].label);
      var profile = sc2618ExtractProfile_(data, keyInfo);
      if (profile && (profile.tornId || profile.player_id || profile.user_id || profile.id || profile.ID)) {
        return {
          ok: true,
          method: tries[i].label,
          profile: profile,
          keyInfo: keyInfo,
          accessLevel: sc2618AccessLabel_(keyInfo),
          selectionsSummary: sc2618SelectionsSummary_(keyInfo),
          warnings: warnings
        };
      }
      warnings.push(tries[i].label + ' returned JSON but no readable Torn ID. Keys: ' + Object.keys(data || {}).slice(0, 20).join(','));
    } catch (e1) {
      lastErr = String(e1 && e1.message || e1);
      warnings.push(tries[i].label + ' failed: ' + lastErr);
    }
  }

  var keyProfile = sc2618ExtractProfile_({}, keyInfo);
  if (keyProfile && (keyProfile.tornId || keyProfile.player_id || keyProfile.user_id || keyProfile.id || keyProfile.ID)) {
    return {
      ok: true,
      method: 'key/info owner',
      profile: keyProfile,
      keyInfo: keyInfo,
      accessLevel: sc2618AccessLabel_(keyInfo),
      selectionsSummary: sc2618SelectionsSummary_(keyInfo),
      warnings: warnings
    };
  }

  throw new Error('API key could not identify your Torn account. Make a custom key with user -> basic or user -> profile enabled. Last error: ' + (lastErr || warnings[warnings.length - 1] || 'No readable profile returned.'));
}

function sc2618TornRequestRawUrl_(url, label) {
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {'User-Agent': 'ShadowCoreHQ-GoogleAppsScript/2.6.18'}
  });
  var code = response.getResponseCode();
  var text = response.getContentText() || '';
  var data;
  try { data = JSON.parse(text); }
  catch (parseErr) { throw new Error(label + ' returned non-JSON. HTTP ' + code + '. Body: ' + text.slice(0, 250)); }
  if (data && data.error) {
    throw new Error(label + ' Torn API error ' + data.error.code + ': ' + data.error.error);
  }
  return data || {};
}

function sc2618ExtractProfile_(userData, keyInfo) {
  userData = userData || {};
  keyInfo = keyInfo || {};
  var profile = {};

  var candidates = [];
  function pushObj(o) { if (o && typeof o === 'object') candidates.push(o); }
  pushObj(userData);
  pushObj(userData.user);
  pushObj(userData.profile);
  pushObj(userData.basic);
  pushObj(userData.player);
  pushObj(userData.data);
  pushObj(userData.data && userData.data.user);
  pushObj(userData.data && userData.data.profile);
  pushObj(userData.data && userData.data.basic);
  pushObj(keyInfo);
  pushObj(keyInfo.user);
  pushObj(keyInfo.profile);
  pushObj(keyInfo.basic);
  pushObj(keyInfo.info);
  pushObj(keyInfo.info && keyInfo.info.user);
  pushObj(keyInfo.owner);
  pushObj(keyInfo.player);

  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (!profile.tornId) profile.tornId = c.player_id || c.user_id || c.torn_id || c.tornId || c.id || c.ID || c.Torn_ID || c.userID || '';
    if (!profile.name) profile.name = c.name || c.player_name || c.username || c.Name || c.Player_Name || '';
    if (!profile.faction_id) {
      profile.faction_id = c.faction_id || c.factionID || (c.faction && (c.faction.faction_id || c.faction.id || c.faction.ID)) || '';
    }
  }
  return profile;
}

function sc2618AccessLabel_(keyInfo) {
  keyInfo = keyInfo || {};
  return keyInfo.access_level || keyInfo.accessLevel || keyInfo.level || (keyInfo.access && keyInfo.access.level) || 'Unknown';
}

function sc2618SelectionsSummary_(keyInfo) {
  try {
    if (!keyInfo) return '';
    if (keyInfo.selections) return safeJson_(keyInfo.selections).slice(0, 500);
    if (keyInfo.access && keyInfo.access.selections) return safeJson_(keyInfo.access.selections).slice(0, 500);
    if (keyInfo.permissions) return safeJson_(keyInfo.permissions).slice(0, 500);
  } catch (e) {}
  return '';
}

function debugSc2618AuthConfig() {
  return {
    ok: true,
    version: '2.6.18',
    adminTokenSet: !!getSetting_('Admin_Token', ''),
    hasAutoSync: typeof sc2614RegisterMemberApiKeyForAutoSync === 'function'
  };
}

function testSc2618ApiLogin(key) {
  return sc2618ConnectApiKey(key, {accepted:true, discord:'test', selections:'test'});
}

function testSc2618LeaderLogin(token) {
  return sc2618LeaderLogin(token);
}


/**
 * ShadowCore HQ v2.6.19 - Auth Mode Isolation Fix
 * API login must replace admin/leader login, not fall back to it.
 */
function sc2619LeaderLogin(token) {
  return sc2618LeaderLogin(token);
}

function sc2619ConnectApiKey(key, consent) {
  // Uses the repaired v2.6.18 API verifier, but exposed under a unique endpoint
  // so the client cannot accidentally call older duplicated login paths.
  var session = sc2618ConnectApiKey(key, consent);
  session.authMode = 'API';
  if (session.user) {
    session.user.authMode = 'API';
    session.user.adminToken = false;
    session.user.apiLogin = true;
  }
  return session;
}

function debugSc2619AuthConfig() {
  var out = debugSc2618AuthConfig ? debugSc2618AuthConfig() : {};
  out.version = '2.6.19';
  out.hasSc2619Api = true;
  return out;
}

function testSc2619ApiLogin(key) {
  return sc2619ConnectApiKey(key, {accepted:true, discord:'test', selections:'test'});
}

function testSc2619LeaderLogin(token) {
  return sc2619LeaderLogin(token);
}


/**
 * v2.6.20 - Canonical auth/session flow.
 * Keep older sc26xx functions for compatibility, but route the web client through
 * this single entry point and this single session validator.
 */
function scAuthSetLastError_(message) {
  try { getScriptProps_().setProperty('AUTH_LAST_ERROR', String(message || '').slice(0, 2000)); } catch (e) {}
}

function scAuthGetLastError_() {
  try { return getScriptProps_().getProperty('AUTH_LAST_ERROR') || ''; } catch (e) { return ''; }
}

function scAuthClearLastError_() {
  try { getScriptProps_().deleteProperty('AUTH_LAST_ERROR'); } catch (e) {}
}

function scAuthSerializable_(obj) {
  // google.script.run can return null if a payload contains Apps Script host
  // objects, Dates, or other non-plain values. Force every auth response through
  // JSON so login never succeeds server-side but arrives in the browser as null.
  return JSON.parse(safeJson_(obj || {}));
}

function scAuthSummarizeAutoSync_(autoMemberApiSync) {
  if (!autoMemberApiSync) return null;
  return {
    ok: autoMemberApiSync.ok === true,
    tornId: String(autoMemberApiSync.tornId || ''),
    name: String(autoMemberApiSync.name || ''),
    error: String(autoMemberApiSync.error || ''),
    warning: String(autoMemberApiSync.warning || ''),
    status: String(autoMemberApiSync.status || autoMemberApiSync.Last_Status || '')
  };
}

function scAuthSummarizeApiVerify_(apiVerify) {
  if (!apiVerify) return null;
  var warnings = apiVerify.warnings || [];
  if (!Array.isArray(warnings)) warnings = [String(warnings || '')];
  return {
    ok: apiVerify.ok === true,
    method: String(apiVerify.method || ''),
    warningCount: warnings.length,
    warnings: warnings.slice(0, 5).map(function(w) { return String(w || '').slice(0, 250); })
  };
}

function scAuthSessionResponse_(session, source, extra) {
  if (!session || !session.sessionId) throw new Error((source || 'Login') + ' failed internally: no sessionId was created.');
  var user = session.user || session;
  var authSource = String(user.authSource || session.authSource || source || '').toUpperCase();
  var out = {
    ok: true,
    sessionId: String(session.sessionId || user.sessionId || ''),
    expiresInSeconds: Number(session.expiresInSeconds || sessionPersistentSeconds_()),
    user: {
      sessionId: String(session.sessionId || user.sessionId || ''),
      tornId: String(user.tornId || user.Torn_ID || ''),
      name: String(user.name || user.Name || ''),
      role: roleName_(user.role || 'MEMBER'),
      roleValue: Number(user.roleValue || roleValue_(user.role || 'MEMBER')),
      email: String(user.email || ''),
      authSource: authSource,
      lastLogin: String(user.lastLogin || user.created || nowIso_()),
      adminToken: authSource === 'ADMIN_TOKEN' || !!user.adminToken,
      apiLogin: authSource === 'TORN_API_KEY' || !!user.apiLogin,
      memberTokenLogin: authSource === 'MEMBER_TOKEN' || !!user.memberTokenLogin
    },
    authSource: authSource,
    source: source || authSource,
    lastAuthError: scAuthGetLastError_(),
    version: '2.6.21'
  };
  if (extra) {
    if (extra.autoMemberApiSync !== undefined) out.autoMemberApiSync = scAuthSummarizeAutoSync_(extra.autoMemberApiSync);
    if (extra.apiVerify !== undefined) out.apiVerify = scAuthSummarizeApiVerify_(extra.apiVerify);
    if (extra.oneTimeDataSync !== undefined) out.oneTimeDataSync = scAuthSerializable_(extra.oneTimeDataSync || null);
  }
  return scAuthSerializable_(out);
}

function scAuthCreateAdminSession_(token) {
  var mode = String(setting_('Auth_Mode', 'EmailOrToken')).toLowerCase();
  var okByEmail = adminEmailAllowed_();
  var okByToken = isAdminToken_(token);
  if (mode === 'emailonly' && !okByEmail) throw new Error('Leader login requires an allowed Google email.');
  if (mode === 'tokenonly' && !okByToken) throw new Error('Leader login requires the Admin_Token.');
  if (mode === 'emailortoken' && !(okByEmail || okByToken)) throw new Error('Leader login failed. Use an allowed Google email or the Admin_Token.');
  var session = createSession_({tornId:'LEADER', name:'Leader', role:'LEADER', authSource:'ADMIN_TOKEN', adminToken:!!okByToken, apiLogin:false});
  logAudit_(session.user.email || 'leader', 'scAuthLogin.ADMIN_TOKEN', 'Leader/admin session created.');
  return session;
}


function scAuthRecordApiKeyHealth_(tornId, name, stored, status, warning) {
  try {
    var checkId = 'LOGIN-' + String(tornId || 'UNKNOWN') + '-' + Utilities.getUuid().slice(0, 8);
    upsertRowByKey_(APP.SHEETS.API_KEY_HEALTH, 'Check_ID', checkId, {
      Check_ID: checkId,
      Timestamp: nowIso_(),
      Torn_ID: String(tornId || ''),
      Name: String(name || ''),
      Stored: stored ? 'TRUE' : 'FALSE',
      Status: String(status || 'Login verified'),
      Last_Checked: nowIso_(),
      Age_Days: '0',
      Risk_Level: warning ? 'Warning' : 'OK',
      Missing_Selections: String(warning || ''),
      Recommended_Action: warning ? 'Login is active. Enable bars/cooldowns/status selections and opt into auto-sync if you want live My Faction Life data.' : 'None'
    });
  } catch (e) {}
}

function scAuthHydrateApiLoginData_(key, tornId, name, stored) {
  // Use the just-submitted key once, in memory, to populate the member-facing
  // sheets that My Faction Life reads. This does not store the API key unless
  // the separate auto-sync consent path already did so.
  var result = {ok:false, warning:'Live member data was not checked.', stored:!!stored};
  try {
    var row = null;
    if (typeof sc2614FetchOwnUser_ === 'function' && typeof sc2614BuildMemberStatusRow_ === 'function') {
      var data = sc2614FetchOwnUser_(key);
      row = sc2614BuildMemberStatusRow_(data, 'api_login_one_time');
    }
    if (!row) row = {Torn_ID:String(tornId || ''), Name:String(name || ''), Status:'API login verified', Last_Action:'', Updated:nowIso_()};
    if (!row.Torn_ID) row.Torn_ID = String(tornId || '');
    if (!row.Name) row.Name = String(name || '');
    if (!row.Status) row.Status = 'API login verified';
    row.Updated = row.Updated || nowIso_();
    upsertRowByKey_(APP.SHEETS.MEMBER_STATUS, 'Torn_ID', String(row.Torn_ID), row);
    scAuthRecordApiKeyHealth_(tornId, name, stored, 'OK', '');
    result = {ok:true, tornId:String(row.Torn_ID), name:String(row.Name || ''), status:String(row.Status || ''), stored:!!stored};
  } catch (err) {
    var warning = String(err && err.message || err);
    // Bars/cooldowns/status may be missing from a custom key. Keep login/data
    // bridge alive by writing a minimal status row keyed by Torn_ID.
    try {
      upsertRowByKey_(APP.SHEETS.MEMBER_STATUS, 'Torn_ID', String(tornId || ''), {
        Torn_ID:String(tornId || ''),
        Name:String(name || ''),
        Status:'API login verified; live bars/cooldowns unavailable',
        Last_Action:'',
        Energy:'', Life:'', Nerve:'', Happy:'', Hospital_Until:'', Travel_Status:'',
        Drug_Cooldown:'', Medical_Cooldown:'', Booster_Cooldown:'', Updated:nowIso_()
      });
    } catch (rowErr) {}
    scAuthRecordApiKeyHealth_(tornId, name, stored, 'Login verified; live data unavailable', warning);
    result = {ok:false, tornId:String(tornId || ''), name:String(name || ''), warning:warning, stored:!!stored};
  }
  return result;
}

function scAuthCreateApiSession_(key, consent) {
  key = sanitizeKey_(key);
  consent = consent || {};
  if (!consent.accepted) throw new Error('You must accept the API disclosure before connecting a key.');

  var verified = sc2618VerifyApiKeyProfile_(key);
  var profile = verified.profile || {};
  var tornId = String(profile.tornId || profile.Torn_ID || profile.player_id || profile.user_id || profile.id || profile.ID || '').trim();
  if (!tornId) throw new Error('API key checked, but Torn ID could not be read. Use a Torn API key with user -> basic or user -> profile access, then try again.');

  var name = String(profile.name || profile.Name || profile.player_name || profile.username || ('Torn ' + tornId)).trim();
  var role = findMemberRole_(tornId) || 'MEMBER';
  var autoSyncConsent = consent.autoSync === true || String(consent.autoSync || '').toUpperCase() === 'TRUE';
  var storeKeys = autoSyncConsent && boolSetting_('Store_Member_Keys', true);
  var fp = keyFingerprint_(key);
  if (storeKeys) storeApiKey_('MEMBER', tornId, key);

  upsertRowByKey_(APP.SHEETS.API_KEYS, 'Torn_ID', tornId, {
    Torn_ID: tornId,
    Name: name,
    Role: role,
    Key_Type: 'MEMBER',
    Stored: storeKeys ? 'TRUE' : 'FALSE',
    Access_Level: verified.accessLevel || consent.accessLevel || 'Custom/Member',
    Selections: verified.selectionsSummary || consent.selections || 'Verified from Torn API v1/v2',
    Status: 'Verified',
    Last_Checked: nowIso_(),
    Key_Fingerprint: fp,
    Owner_Email: Session.getActiveUser().getEmail() || '',
    Consent: safeJson_({accepted:!!consent.accepted, autoSync:autoSyncConsent, discord:consent.discord || '', selections:consent.selections || ''}).slice(0, 5000),
    Notes: storeKeys ? 'v2.6.20 verified and stored server-side for opted-in auto-sync. Actual key is stored in Script Properties, not this sheet.' : 'v2.6.20 verified for login only. API key was not stored.'
  });

  upsertRowByKey_(APP.SHEETS.MEMBERS, 'Torn_ID', tornId, {
    Torn_ID: tornId,
    Name: name,
    Role: role,
    Rank: '',
    Joined: '',
    Discord: consent.discord || '',
    Active: 'TRUE',
    Last_Seen: nowIso_(),
    Faction_ID: profile.faction_id || profile.factionID || (profile.faction && (profile.faction.id || profile.faction.faction_id)) || '',
    Profile_URL: 'https://www.torn.com/profiles.php?XID=' + tornId,
    Notes: ''
  });

  var autoSyncResult = null;
  if (storeKeys) {
    try {
      if (typeof sc2614RegisterMemberApiKeyForAutoSync === 'function') autoSyncResult = sc2614RegisterMemberApiKeyForAutoSync(key, 'api_login_v2620');
    } catch (syncErr) {
      autoSyncResult = {ok:false, error:String(syncErr && syncErr.message || syncErr)};
      try { Logger.log('v2.6.20 auto member API sync failed, login still allowed: ' + autoSyncResult.error); } catch (logErr) {}
    }
  } else if (autoSyncConsent && !boolSetting_('Store_Member_Keys', true)) {
    autoSyncResult = {ok:false, warning:'Auto-sync consent was given, but Store_Member_Keys is disabled in Settings.'};
  }

  var session = createSession_({tornId:tornId, name:name, role:role, authSource:'TORN_API_KEY', apiLogin:true, adminToken:false});
  session.autoMemberApiSync = autoSyncResult;
  session.apiVerify = {ok:true, method:verified.method, warnings:verified.warnings || []};
  session.oneTimeDataSync = scAuthHydrateApiLoginData_(key, tornId, name, storeKeys);
  logAudit_(name, 'scAuthLogin.TORN_API_KEY', 'Verified key fingerprint ' + fp + ', method=' + verified.method + ', stored=' + storeKeys + ', autoSync=' + safeJson_(autoSyncResult || {}).slice(0, 500) + ', oneTimeData=' + safeJson_(session.oneTimeDataSync || {}).slice(0, 500));
  return session;
}

function scAuthCreateMemberTokenSession_(token) {
  var fp = fingerprint_(String(token || ''));
  var raw = getScriptProps_().getProperty('MEMBER_TOKEN_' + fp);
  if (!raw) throw new Error('Invalid member token.');
  var data = JSON.parse(raw);
  if (new Date(data.expires).getTime() < Date.now()) throw new Error('Expired member token.');
  var rows = readTable_(APP.SHEETS.MEMBER_TOKENS), row = null;
  rows.forEach(function(r) { if (String(r.Token_Fingerprint) === fp) row = r; });
  if (row && String(row.Status).toLowerCase() !== 'active') throw new Error('Token is not active.');
  if (row) { row.Last_Used = nowIso_(); upsertRowByKey_(APP.SHEETS.MEMBER_TOKENS, 'Token_ID', row.Token_ID, row); }
  var session = createSession_({tornId:data.tornId, name:data.name || ('Player ' + data.tornId), role:data.role || 'MEMBER', email:'', authSource:'MEMBER_TOKEN', memberTokenLogin:true, adminToken:false, apiLogin:false});
  logAudit_(session.user.name || session.user.tornId, 'scAuthLogin.MEMBER_TOKEN', 'Member token session created.');
  return session;
}

function scAuthLogin(mode, credential, consent, previousSessionId) {
  mode = String(mode || '').toUpperCase();
  try {
    if (previousSessionId) logout(previousSessionId);
    var session;
    if (mode === 'ADMIN_TOKEN') session = scAuthCreateAdminSession_(credential);
    else if (mode === 'TORN_API_KEY') session = scAuthCreateApiSession_(credential, consent || {});
    else if (mode === 'MEMBER_TOKEN') session = scAuthCreateMemberTokenSession_(credential);
    else throw new Error('Unsupported auth mode: ' + mode + '. Expected ADMIN_TOKEN, MEMBER_TOKEN, or TORN_API_KEY.');
    scAuthClearLastError_();
    return scAuthSessionResponse_(session, mode, {autoMemberApiSync:session.autoMemberApiSync || null, apiVerify:session.apiVerify || null, oneTimeDataSync:session.oneTimeDataSync || null});
  } catch (err) {
    scAuthSetLastError_(mode + ': ' + String(err && err.message || err));
    throw err;
  }
}

function scAuthLoginLean(mode, credential, consent, previousSessionId) {
  // Emergency-compatible login endpoint used only if google.script.run receives
  // a null payload from scAuthLogin. It returns the smallest possible plain
  // object while still using the same canonical auth/session creation path.
  mode = String(mode || '').toUpperCase();
  try {
    if (previousSessionId) logout(previousSessionId);
    var session;
    if (mode === 'ADMIN_TOKEN') session = scAuthCreateAdminSession_(credential);
    else if (mode === 'TORN_API_KEY') session = scAuthCreateApiSession_(credential, consent || {});
    else if (mode === 'MEMBER_TOKEN') session = scAuthCreateMemberTokenSession_(credential);
    else throw new Error('Unsupported auth mode: ' + mode + '.');
    scAuthClearLastError_();
    var user = session.user || {};
    return scAuthSerializable_({
      ok:true,
      sessionId:String(session.sessionId || ''),
      user:{
        sessionId:String(session.sessionId || ''),
        tornId:String(user.tornId || ''),
        name:String(user.name || ''),
        role:String(user.role || ''),
        roleValue:Number(user.roleValue || 0),
        authSource:String(user.authSource || mode),
        lastLogin:String(user.lastLogin || user.created || nowIso_()),
        adminToken:!!user.adminToken,
        apiLogin:!!user.apiLogin,
        memberTokenLogin:!!user.memberTokenLogin
      },
      authSource:String(user.authSource || mode),
      version:'2.6.21-lean'
    });
  } catch (err) {
    scAuthSetLastError_(mode + ': ' + String(err && err.message || err));
    throw err;
  }
}

function validateAuthSession_(sessionId) {
  var session = getSession_(sessionId);
  if (!session) return {ok:false, error:'No valid session found for that sessionId.', session:null, lastAuthError:scAuthGetLastError_()};
  if (typeof v2612NormalizeSession_ === 'function') session = v2612NormalizeSession_(session);
  session.sessionId = String(session.sessionId || sessionId || '');
  session.authSource = session.authSource || (session.apiLogin ? 'TORN_API_KEY' : (session.memberTokenLogin ? 'MEMBER_TOKEN' : (Number(session.roleValue || 0) >= roleValue_('LEADER') ? 'ADMIN_TOKEN' : 'UNKNOWN')));
  return {ok:true, session:session, lastAuthError:scAuthGetLastError_()};
}

function scAuthValidateSession(sessionId) {
  var validated = validateAuthSession_(sessionId);
  if (!validated.ok) return validated;
  return scAuthSessionResponse_({sessionId:sessionId, user:validated.session, expiresInSeconds:sessionPersistentSeconds_()}, 'VALIDATE_SESSION');
}

// Compatibility wrappers: old client deployments keep working, but all roads now
// use the canonical login implementation above.
function sc2619LeaderLogin(token) { return scAuthLogin('ADMIN_TOKEN', token, {}, ''); }
function sc2619ConnectApiKey(key, consent) { return scAuthLogin('TORN_API_KEY', key, consent || {}, ''); }
function memberTokenLogin(token) { return scAuthLogin('MEMBER_TOKEN', token, {}, ''); }

function getAuthDebugState(sessionId, page) {
  var validated = validateAuthSession_(sessionId);
  var session = validated.session;
  var roleValue = session ? Number(session.roleValue || 0) : 0;
  if (!session || roleValue < roleValue_('LEADER')) throw new Error('Auth debug is admin-only. Log in with the admin token first.');
  page = String(page || 'authdebug');
  var permission = {page:page, allowed:false, reason:'not checked'};
  try {
    var v25 = (typeof getV25State_ === 'function') ? getV25State_(session) : {};
    var allowed = v25 && v25.allowedPages ? v25.allowedPages.map(function(p){ return String(p); }) : [];
    permission = {page:page, allowed: allowed.indexOf(page) !== -1 || roleValue >= roleValue_('LEADER'), allowedPagesCount: allowed.length, source:'v25/admin-bypass'};
  } catch (permErr) {
    permission = {page:page, allowed:roleValue >= roleValue_('LEADER'), reason:String(permErr && permErr.message || permErr), source:'fallback'};
  }
  return {
    ok:true,
    browserSessionId:String(sessionId || ''),
    validatedSession:session,
    role:session.role,
    roleValue:session.roleValue,
    authSource:session.authSource,
    tornId:session.tornId,
    name:session.name,
    permission:permission,
    lastAuthError:validated.lastAuthError,
    checkedAt:nowIso_(),
    version:'2.6.21'
  };
}

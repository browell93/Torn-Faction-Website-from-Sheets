/**
 * ShadowCore HQ v2.6.7 - Login Emergency Tools
 * Use these only for troubleshooting login/session issues.
 */

function repairLoginDefaults_v267() {
  // Do not overwrite Admin_Token. Only ensure auth mode is permissive enough
  // for either a valid admin token OR an allowed admin email.
  try { setSetting_('Auth_Mode', 'EmailOrToken', 'v2.6.7 login repair default'); } catch (e) {
    upsertRowByKey_('Settings', 'Key', 'Auth_Mode', {
      Key: 'Auth_Mode',
      Value: 'EmailOrToken',
      Notes: 'v2.6.7 login repair default',
      Updated: nowIso_()
    });
  }
  try { setSetting_('Session_Remember_Days', '30', 'v2.6.7 login repair default'); } catch (e2) {
    upsertRowByKey_('Settings', 'Key', 'Session_Remember_Days', {
      Key: 'Session_Remember_Days',
      Value: '30',
      Notes: 'v2.6.7 login repair default',
      Updated: nowIso_()
    });
  }
  return debugLoginConfig_v267();
}

function debugLoginConfig_v267() {
  var token = String(setting_('Admin_Token', '') || '');
  var mode = String(setting_('Auth_Mode', 'EmailOrToken') || 'EmailOrToken');
  var email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch(e) {}
  return {
    ok: true,
    Auth_Mode: mode,
    Admin_Token_Set: !!token,
    Admin_Token_Length: token.length,
    Active_Google_Email: email || '(none available)',
    Admin_Emails: String(setting_('Admin_Emails', '') || ''),
    Session_Remember_Days: String(setting_('Session_Remember_Days', '30') || '30')
  };
}

function clearAllSessions_v267() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  Object.keys(all).forEach(function(k) {
    if (k.indexOf('SESSION_') === 0) props.deleteProperty(k);
  });
  return {ok: true, note: 'Persistent SESSION_ records removed. Browser localStorage still must be cleared or overwritten by logging in again.'};
}

function testLeaderLoginWithToken_v267(token) {
  var s = leaderLogin(token);
  return {
    ok: true,
    sessionId: s.sessionId,
    user: s.user,
    restored: !!getSession_(s.sessionId)
  };
}

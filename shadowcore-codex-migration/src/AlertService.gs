/**
 * ShadowCore HQ - Discord/webhook alerts.
 */

function sendDiscordAlert(channelKey, message, extra) {
  if (!boolSetting_('Enable_Discord_Alerts', false)) {
    return {ok: false, skipped: true, reason: 'Enable_Discord_Alerts is FALSE'};
  }
  var settingKey = 'Discord_Webhook_' + channelKey;
  var webhook = String(setting_(settingKey, '')).trim();
  if (!webhook) return {ok: false, skipped: true, reason: 'No webhook for ' + settingKey};

  var payload = {
    content: message,
    allowed_mentions: {parse: []}
  };
  if (extra && extra.embeds) payload.embeds = extra.embeds;

  var response = UrlFetchApp.fetch(webhook, {
    method: 'post',
    contentType: 'application/json',
    payload: safeJson_(payload),
    muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  var body = response.getContentText();
  appendRowObject_(APP.SHEETS.DISCORD_ALERTS, {
    Timestamp: nowIso_(),
    Channel_Key: channelKey,
    Message: message,
    Status: status,
    Response: body.slice(0, 1000),
    By: Session.getActiveUser().getEmail() || 'system'
  });
  return {ok: status >= 200 && status < 300, status: status, body: body};
}

function maybeSendChainDangerAlert_() {
  var logs = readTable_(APP.SHEETS.CHAIN_LOG);
  if (!logs.length) return;
  var latest = logs[logs.length - 1];
  if (String(latest.Danger_Level).toUpperCase() !== 'HIGH') return;
  var cacheKey = 'LAST_CHAIN_ALERT_' + latest.Chain;
  if (CacheService.getScriptCache().get(cacheKey)) return;
  CacheService.getScriptCache().put(cacheKey, '1', 300);
  sendDiscordAlert('Chain', '⚠️ ShadowCore chain danger: chain ' + latest.Chain + ', timeout ' + latest.Timeout_Sec + 's, next bonus ' + latest.Next_Bonus + '.', {});
}

function postPendingQueueAlerts_() {
  var apps = readTable_(APP.SHEETS.APPLICATIONS).filter(function(a) {
    return String(a.Status || '').toLowerCase() === 'new' || String(a.Status || '') === '';
  });
  if (apps.length) sendDiscordAlert('Applications', '📥 ShadowCore has ' + apps.length + ' pending application(s).', {});
  var requests = readTable_(APP.SHEETS.ARMORY_REQUESTS).filter(function(r) {
    return String(r.Status || '').toLowerCase() === 'pending' || String(r.Status || '') === '';
  });
  if (requests.length) sendDiscordAlert('Armory', '🧰 ShadowCore has ' + requests.length + ' pending armory/request item(s).', {});
}

function sendLeaderNotice(sessionId, message) {
  var session = requireRole_(sessionId, 'OFFICER');
  var result = sendDiscordAlert('Leadership', '📣 ' + message, {});
  logAudit_(session.name, 'sendLeaderNotice', message);
  return result;
}

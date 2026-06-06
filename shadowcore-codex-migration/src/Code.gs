/**
 * ShadowCore HQ - Entrypoints.
 */

function doGet(e) {
  setupIfMissing_();
  var template = HtmlService.createTemplateFromFile('Index');
  template.appName = factionName_() + ' HQ';
  template.version = APP.VERSION;
  return template.evaluate()
    .setTitle(factionName_() + ' HQ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  setupIfMissing_();
  var body = {};
  try {
    body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  } catch (err) {
    return ContentService.createTextOutput(safeJson_({ok: false, error: 'Invalid JSON'})).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    var action = body.action;
    var result;
    if (action === 'publicState') result = getPublicState();
    else if (action === 'submitApplication') result = submitApplication(body.form || {});
    else if (String(action || '').indexOf('scanner') === 0 && typeof scannerHandle_ === 'function') result = scannerHandle_(body);
    else if (String(action || '').indexOf('v16') === 0 && typeof v16HandlePost_ === 'function') result = v16HandlePost_(body);
    else throw new Error('Unsupported action: ' + action);
    return ContentService.createTextOutput(safeJson_({ok: true, result: result})).setMimeType(ContentService.MimeType.JSON);
  } catch (err2) {
    logError_('doPost', err2, body);
    return ContentService.createTextOutput(safeJson_({ok: false, error: err2.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function setupIfMissing_() {
  var sheet = ss_().getSheetByName(APP.SHEETS.SETTINGS);
  if (!sheet) setupShadowCoreHQ();
}

function ping() {
  return {ok: true, app: 'ShadowCore HQ', version: APP.VERSION, time: nowIso_()};
}

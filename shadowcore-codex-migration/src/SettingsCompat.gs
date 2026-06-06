/**
 * ShadowCore HQ v2.4.1 Settings Compatibility Patch
 * Adds missing setSetting_ / getSetting_ helpers expected by newer feature modules.
 * Safe generic implementation using the Settings sheet.
 */

function setSetting_(key, value, notes) {
  key = String(key || '').trim();
  if (!key) throw new Error('setSetting_: key is required');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Settings');
  if (!sh) sh = ss.insertSheet('Settings');

  ensureSettingsCompatHeaders_(sh);
  var headers = sh.getRange(1, 1, 1, Math.max(3, sh.getLastColumn())).getValues()[0];
  var keyCol = findHeaderIndexCompat_(headers, ['Key', 'Setting', 'Name']) + 1;
  var valueCol = findHeaderIndexCompat_(headers, ['Value', 'Setting_Value']) + 1;
  var notesCol = findHeaderIndexCompat_(headers, ['Notes', 'Description']) + 1;

  if (keyCol < 1) keyCol = 1;
  if (valueCol < 1) valueCol = 2;
  if (notesCol < 1) notesCol = 3;

  var lastRow = sh.getLastRow();
  if (lastRow < 2) {
    sh.appendRow([key, value, notes || '']);
    return value;
  }

  var keys = sh.getRange(2, keyCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0] || '').trim() === key) {
      sh.getRange(i + 2, valueCol).setValue(value);
      if (notes !== undefined && notes !== null) sh.getRange(i + 2, notesCol).setValue(notes);
      return value;
    }
  }

  var row = [];
  row[keyCol - 1] = key;
  row[valueCol - 1] = value;
  row[notesCol - 1] = notes || '';
  sh.appendRow(row);
  return value;
}

function getSetting_(key, fallback) {
  key = String(key || '').trim();
  if (!key) return fallback;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Settings');
  if (!sh || sh.getLastRow() < 2) return fallback;

  ensureSettingsCompatHeaders_(sh);
  var headers = sh.getRange(1, 1, 1, Math.max(3, sh.getLastColumn())).getValues()[0];
  var keyCol = findHeaderIndexCompat_(headers, ['Key', 'Setting', 'Name']) + 1;
  var valueCol = findHeaderIndexCompat_(headers, ['Value', 'Setting_Value']) + 1;

  if (keyCol < 1) keyCol = 1;
  if (valueCol < 1) valueCol = 2;

  var values = sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(valueCol, keyCol, sh.getLastColumn())).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][keyCol - 1] || '').trim() === key) {
      var v = values[i][valueCol - 1];
      return v === '' || v === null || v === undefined ? fallback : v;
    }
  }
  return fallback;
}

function ensureSettingsCompatHeaders_(sh) {
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 3).setValues([['Key', 'Value', 'Notes']]);
    return;
  }
  var maxCol = Math.max(3, sh.getLastColumn());
  var headers = sh.getRange(1, 1, 1, maxCol).getValues()[0];
  var nonEmpty = headers.some(function(h) { return String(h || '').trim() !== ''; });
  if (!nonEmpty) {
    sh.getRange(1, 1, 1, 3).setValues([['Key', 'Value', 'Notes']]);
    return;
  }
  if (!headers[0]) sh.getRange(1, 1).setValue('Key');
  if (!headers[1]) sh.getRange(1, 2).setValue('Value');
  if (!headers[2]) sh.getRange(1, 3).setValue('Notes');
}

function findHeaderIndexCompat_(headers, names) {
  var wanted = names.map(function(n) { return String(n).toLowerCase(); });
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').trim().toLowerCase();
    if (wanted.indexOf(h) !== -1) return i;
  }
  return -1;
}

function testSettingsCompatPatch() {
  setSetting_('Settings_Compat_Test', 'OK', 'Created by SettingsCompat.gs');
  return getSetting_('Settings_Compat_Test', 'MISSING');
}

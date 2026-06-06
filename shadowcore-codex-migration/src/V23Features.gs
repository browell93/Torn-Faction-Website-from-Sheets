/**
 * ShadowCore HQ v2.3 - Torn HTML Code Copier / Editor
 * Replaces the old BBCode workflow with HTML snippets, previews, sanitizer, and copy-ready output.
 */

function setupShadowCoreV23HtmlEditor() {
  ensureSheet_(APP.SHEETS.HTML_SNIPPETS, HEADERS[APP.SHEETS.HTML_SNIPPETS]);
  seedV23HtmlEditorSettings_();
  logAudit_('system', 'setupShadowCoreV23HtmlEditor', 'HTML editor sheets/settings ready');
  return {ok: true, sheet: APP.SHEETS.HTML_SNIPPETS};
}

function seedV23HtmlEditorSettings_() {
  var defaults = [
    ['Html_Editor_Default_Template', 'Recruitment', 'Default template selected by the HTML code editor.'],
    ['Html_Editor_Sanitize_Output', 'TRUE', 'Remove scripts, events, javascript: links, and unsafe iframe/form/object tags before saving.'],
    ['Html_Editor_Copy_Mode', 'html', 'Default copy mode: html or plain.']
  ];
  defaults.forEach(function(r) {
    if (!setting_(r[0], '')) setSetting_(r[0], r[1], r[2]);
  });
}

function getV23HtmlEditorState_() {
  return {
    snippets: readTable_(APP.SHEETS.HTML_SNIPPETS).slice(-150),
    templates: ['Recruitment', 'War Report', 'Payout Report', 'Rules', 'Chain Plan', 'Announcement', 'Custom'],
    sanitizeDefault: setting_('Html_Editor_Sanitize_Output', 'TRUE'),
    copyMode: setting_('Html_Editor_Copy_Mode', 'html')
  };
}

function generateHtmlSnippetFromWeb(sessionId, type, title, sourceId) {
  var session = requireRole_(sessionId, 'OFFICER');
  type = String(type || 'Recruitment');
  title = String(title || (factionName_() + ' ' + type));
  var built = buildHtmlSnippet_(type, title, sourceId || '');
  var row = appendHtmlSnippet_(type, title, built.html, built.plain, sourceId || '', built.template || type, session.name, true);
  logAudit_(session.name, 'generateHtmlSnippetFromWeb', row.Snippet_ID);
  return {ok: true, snippet: row};
}

function saveHtmlSnippetFromWeb(sessionId, type, title, html, plainText, sourceId) {
  var session = requireRole_(sessionId, 'OFFICER');
  type = String(type || 'Custom');
  title = String(title || 'Custom HTML Snippet');
  html = String(html || '');
  plainText = String(plainText || stripHtml_(html));
  var row = appendHtmlSnippet_(type, title, html, plainText, sourceId || '', 'Custom/Edit', session.name, true);
  logAudit_(session.name, 'saveHtmlSnippetFromWeb', row.Snippet_ID);
  return {ok: true, snippet: row};
}

function buildHtmlSnippet_(type, title, sourceId) {
  var lower = String(type || '').toLowerCase();
  if (lower.indexOf('recruit') !== -1) {
    var appUrl = appUrl_() || setting_('Public_Custom_Domain', '');
    var microsite = appUrl ? appUrl + '?page=microsite' : '';
    var plain = factionName_() + ' is recruiting active, loyal players for organized wars, fair payouts, Discord coordination, and growth support.';
    var html = '' +
      '<div style="text-align:center">' +
      '<h2>' + htmlEscape_(factionName_()) + ' is Recruiting</h2>' +
      '<p><strong>Organized wars. Fair payouts. Active Discord. Real growth support.</strong></p>' +
      '</div>' +
      '<h3>What we offer</h3>' +
      '<ul>' +
      '<li>Organized ranked wars and chain planning</li>' +
      '<li>Fair payout tracking and pay stubs</li>' +
      '<li>Armory, revive, loan, and training support</li>' +
      '<li>Mentors, onboarding, awards, and progression tools</li>' +
      '<li>Optional ShadowCore scanner/PDA support</li>' +
      '</ul>' +
      (microsite ? '<p><a href="' + htmlEscapeAttr_(microsite) + '">Apply through ShadowCore HQ</a></p>' : '<p>Apply through ShadowCore HQ.</p>');
    return {html: html, plain: plain, template: 'Recruitment'};
  }
  if (lower.indexOf('payout') !== -1 || lower.indexOf('war') !== -1) {
    var warId = sourceId || (activeWar_() ? activeWar_().War_ID : 'GENERAL');
    var report = generateWarReport(warId);
    var html2 = '<h2>' + htmlEscape_(report.title || 'War Report') + '</h2>' +
      '<pre>' + htmlEscape_(report.body || '') + '</pre>';
    if (lower.indexOf('payout') !== -1) {
      html2 += '<h3>Payouts</h3><table><thead><tr><th>Name</th><th>Hits</th><th>Respect</th><th>Total</th><th>Paid</th></tr></thead><tbody>';
      readTable_(APP.SHEETS.PAYOUTS).filter(function(p){ return !warId || warId === 'GENERAL' || String(p.War_ID) === String(warId); }).slice(-100).forEach(function(p){
        html2 += '<tr><td>' + htmlEscape_(p.Name) + '</td><td>' + htmlEscape_(p.Hits) + '</td><td>' + htmlEscape_(p.Respect) + '</td><td>$' + htmlEscape_(Number(p.Total||0).toLocaleString()) + '</td><td>' + htmlEscape_(p.Paid) + '</td></tr>';
      });
      html2 += '</tbody></table>';
    }
    return {html: html2, plain: report.body || '', template: lower.indexOf('payout') !== -1 ? 'Payout Report' : 'War Report'};
  }
  if (lower.indexOf('rules') !== -1) {
    var rules = readTable_(APP.SHEETS.RULES).filter(function(r) { return String(r.Active).toUpperCase() === 'TRUE'; });
    var plain3 = rules.map(function(r) { return r.Category + ': ' + r.Rule; }).join('\n');
    var html3 = '<h2>' + htmlEscape_(factionName_()) + ' Rules</h2><ul>' + rules.map(function(r) {
      return '<li><strong>' + htmlEscape_(r.Category) + ':</strong> ' + htmlEscape_(r.Rule) + '</li>';
    }).join('') + '</ul>';
    return {html: html3, plain: plain3, template: 'Rules'};
  }
  if (lower.indexOf('chain') !== -1) {
    var plan = generateChainPlan(sourceId || (activeWar_() ? activeWar_().War_ID : 'GENERAL')).plan;
    var plain4 = plan.Pacing_Plan || '';
    var html4 = '<h2>Chain Plan</h2>' +
      '<p><strong>Current:</strong> ' + htmlEscape_(plan.Current_Chain) + '<br>' +
      '<strong>Next bonus:</strong> ' + htmlEscape_(plan.Next_Bonus) + '<br>' +
      '<strong>Hits needed:</strong> ' + htmlEscape_(plan.Hits_Needed) + '</p>' +
      '<pre>' + htmlEscape_(plan.Pacing_Plan || '') + '</pre>';
    return {html: html4, plain: plain4, template: 'Chain Plan'};
  }
  if (lower.indexOf('announcement') !== -1) {
    var html5 = '<h2>' + htmlEscape_(title) + '</h2><p>Generated by ShadowCore HQ.</p>';
    return {html: html5, plain: title + '\nGenerated by ShadowCore HQ.', template: 'Announcement'};
  }
  return {html: '<h2>' + htmlEscape_(title) + '</h2><p>Generated by ShadowCore HQ.</p>', plain: title + '\nGenerated by ShadowCore HQ.', template: 'Custom'};
}

function appendHtmlSnippet_(type, title, html, plain, sourceId, template, by, sanitize) {
  var clean = sanitize ? sanitizeTornHtml_(html) : String(html || '');
  var row = {
    Snippet_ID: 'HTML-' + Utilities.getUuid().slice(0, 8).toUpperCase(),
    Timestamp: nowIso_(),
    Type: type,
    Title: title,
    HTML: clean,
    Plain_Text: plain || stripHtml_(clean),
    Source_ID: sourceId || '',
    Template: template || type || 'Custom',
    Sanitized: sanitize ? 'TRUE' : 'FALSE',
    Created_By: by || 'system',
    Updated: nowIso_()
  };
  appendRowObject_(APP.SHEETS.HTML_SNIPPETS, row);
  return row;
}

function sanitizeTornHtml_(html) {
  html = String(html || '');
  // Remove unsafe blocks and comments.
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link)[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link)\b[^>]*\/?\s*>/gi, '');
  // Remove event handlers and dangerous URLs.
  html = html.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"');
  html = html.replace(/(href|src)\s*=\s*javascript:[^\s>]+/gi, '$1="#"');
  // Keep common HTML. This is not a full HTML sanitizer, but removes the high-risk parts before copy/save.
  return html.trim();
}

function stripHtml_(html) {
  return String(html || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function htmlEscape_(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function htmlEscapeAttr_(v) {
  return htmlEscape_(v).replace(/`/g, '&#96;');
}

// ==UserScript==
// @name         ShadowCore HQ Independent Torn Scanner
// @namespace    shadowcore-hq
// @version      1.8.0
// @description  Independent Torn scanner/overlay bridge for ShadowCore HQ with v1.8 deep scanner auto-enrichment, optional local Torn API pulls, diagnostics registration, and a 1 request/second cap.
// @author       ShadowCore
// @match        https://www.torn.com/*
// @match        https://torn.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_addStyle
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @connect      api.torn.com
// ==/UserScript==

(function() {
  'use strict';

  const VERSION = '1.8.0';
  const DEFAULT_BACKEND_URL = 'https://script.google.com/macros/s/AKfycbz40HM-fe5dbjZNYpcYBSep2i5iHNuwyqERTc2veqVuXC78mYOH9c8H5kTmUgkX8Cc5/exec';
  const DEFAULTS = {
    backendUrl: DEFAULT_BACKEND_URL,
    scannerToken: '',
    memberTornId: '',
    memberName: '',
    autoSubmit: false,
    enableBadges: true,
    enablePanel: true,
    compact: false,
    position: 'bottom-right',
    lastDisclosureAccepted: '',
    apiEnabled: false,
    tornApiKey: '',
    apiAutoPoll: false,
    apiRatePerSecond: 0.2,
    apiOwnSelections: 'profile,bars,cooldowns,travel,icons',
    apiPlayerSelections: 'profile',
    apiVisibleLimit: 5,
    apiSubmitSnapshots: false,
    uiMode: 'Auto',
    autoEnrichmentEnabled: false,
    autoReadiness: true,
    autoWarReadiness: true,
    autoCheckins: true,
    autoAssignmentTracking: true,
    autoAttackLogging: true,
    autoEnemyEnrichment: true,
    autoFactionRoster: true,
    autoRecruitLeads: true,
    autoHospitalSupport: true,
    autoSupportContext: true,
    autoTradeLoan: true,
    autoMarketTravel: true,
    autoTrainingGrowth: true,
    autoOnboarding: true,
    autoApiHealth: true,
    autoScannerHealth: true,
    autoDiscordTriggers: false,
    deepScannerEnabled: false,
    autoArmoryStock: true,
    autoFactionUpgrades: true,
    autoOcResults: true,
    autoBusinessSnapshots: false,
    autoPropertyNotes: false,
    autoEducationTracking: false,
    autoMeritProgress: false,
    autoMissions: false,
    autoRacing: false,
    autoCasino: false,
    autoGearScans: true,
    autoReviverPerformance: true,
    autoCooldownForecasts: true,
    autoEventNews: true,
    autoRiskFlags: true,
    autoSmartRecommendations: true,
    autoEnrichmentCooldownSeconds: 60,
    installId: ''
  };

  const state = {
    cfg: loadConfig(),
    panel: null,
    lastScan: null,
    lastContext: null,
    busy: false,
    pageKey: '',
    autoSubmittedPageKey: '',
    autoEnrichedPageKey: '',
    lastAutoEnrichAt: 0,
    errorCount: 0,
    api: {
      queue: [],
      draining: false,
      lastCallAt: 0,
      pollTimer: null,
      lastSnapshot: null,
      lastApiStatus: 'API off',
      lastApiError: '',
      callsThisSession: 0
    }
  };

  function loadConfig() {
    const cfg = Object.assign({}, DEFAULTS, GM_getValue('sc_cfg', {}));
    if (!cfg.backendUrl) cfg.backendUrl = DEFAULT_BACKEND_URL;
    return cfg;
  }

  function saveConfig(partial) {
    state.cfg = Object.assign({}, state.cfg, partial || {});
    GM_setValue('sc_cfg', state.cfg);
    updateApiPoller();
    renderPanel();
  }

  function notify(title, text) {
    try { GM_notification({title: title, text: text, timeout: 3500}); }
    catch (e) { console.log('[ShadowCore]', title, text); }
  }

  function apiCall(action, payload) {
    payload = payload || {};
    const body = Object.assign({}, payload, {
      action: action,
      scannerToken: state.cfg.scannerToken,
      member: {tornId: state.cfg.memberTornId, name: state.cfg.memberName},
      memberTornId: state.cfg.memberTornId,
      memberName: state.cfg.memberName,
      url: location.href,
      userScriptVersion: VERSION
    });
    return new Promise((resolve, reject) => {
      if (!state.cfg.backendUrl) return reject(new Error('Missing backend URL.'));
      GM_xmlhttpRequest({
        method: 'POST',
        url: state.cfg.backendUrl,
        headers: {'Content-Type': 'application/json'},
        data: JSON.stringify(body),
        timeout: 30000,
        onload: function(res) {
          let data = null;
          try { data = JSON.parse(res.responseText); }
          catch (err) { return reject(new Error('Non-JSON response from HQ. HTTP ' + res.status)); }
          if (data && data.ok === false) return reject(new Error(data.error || 'HQ error'));
          resolve(data.result !== undefined ? data.result : data);
        },
        onerror: function(err) { state.errorCount++; reject(new Error('Network error: ' + JSON.stringify(err))); },
        ontimeout: function() { reject(new Error('Request timed out.')); }
      });
    });
  }

  function init() {
    addStyles();
    registerMenus();
    createPanel();
    setTimeout(runPageUpdate, 800);
    setInterval(maybePageChanged, 1800);
    if (!state.cfg.installId) saveConfig({installId: 'SC-' + Math.random().toString(36).slice(2, 10).toUpperCase()});
    updateApiPoller();
    setInterval(() => { if (state.cfg.autoScannerHealth && state.cfg.scannerToken) submitScannerHealth('timer').catch(()=>{}); }, 300000);
  }

  function registerMenus() {
    GM_registerMenuCommand('ShadowCore Scanner: Toggle panel', () => saveConfig({enablePanel: !state.cfg.enablePanel}));
    GM_registerMenuCommand('ShadowCore Scanner: Settings', showSettingsModal);
    GM_registerMenuCommand('ShadowCore Scanner: Register install with HQ', registerInstallWithHQ);
    GM_registerMenuCommand('ShadowCore Scanner: Scan current page', () => scanAndRender(false));
    GM_registerMenuCommand('ShadowCore Scanner: API pull me', () => fetchMyApiSnapshot(true));
    GM_registerMenuCommand('ShadowCore Scanner: Auto-enrich now', () => submitAutoEnrichment('manual'));
    GM_registerMenuCommand('ShadowCore Scanner: Toggle API polling', () => toggleApiPolling());
    GM_registerMenuCommand('ShadowCore Scanner: Clear local settings', () => { GM_deleteValue('sc_cfg'); location.reload(); });
  }

  function maybePageChanged() {
    const key = location.href + '|' + document.title;
    if (key !== state.pageKey) {
      state.pageKey = key;
      setTimeout(runPageUpdate, 500);
    }
  }

  async function runPageUpdate() {
    if (!state.cfg.enablePanel) return;
    const scan = scanCurrentPage();
    state.lastScan = scan;
    renderPanel();
    if (state.cfg.enableBadges && state.cfg.scannerToken) await fetchContextAndBadge(scan, false);
    if (state.cfg.autoSubmit && state.cfg.scannerToken) {
      const pageKey = scan.pageType + '|' + scan.url + '|' + scan.players.map(p => p.id).join(',');
      if (pageKey !== state.autoSubmittedPageKey) {
        state.autoSubmittedPageKey = pageKey;
        submitScan('auto').catch(err => logStatus('Auto-submit failed: ' + err.message));
      }
    }
    maybeSubmitAutoEnrichment(scan).catch(err => { state.errorCount++; logStatus('Auto-enrich failed: ' + err.message); });
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'sc-hq-panel';
    document.body.appendChild(panel);
    state.panel = panel;
    renderPanel();
  }

  function positionClass() {
    return state.cfg.position === 'bottom-left' ? 'sc-left' : 'sc-right';
  }

  function renderPanel() {
    if (!state.panel) return;
    if (!state.cfg.enablePanel) {
      state.panel.style.display = 'none';
      return;
    }
    state.panel.style.display = 'block';
    state.panel.className = positionClass() + (state.cfg.compact ? ' sc-compact' : '');
    const scan = state.lastScan || scanCurrentPage();
    const assignment = getMyAssignmentText();
    const chain = state.lastContext && state.lastContext.latestChain ? state.lastContext.latestChain : {};
    const tokenState = state.cfg.scannerToken ? 'Connected' : 'Needs setup';
    const apiState = state.cfg.apiEnabled && state.cfg.tornApiKey ? (state.cfg.apiAutoPoll ? 'Polling' : 'Ready') : 'Off';
    const apiRate = sanitizeApiRate(state.cfg.apiRatePerSecond);
    const apiSummary = state.api.lastSnapshot && state.api.lastSnapshot.summary ? state.api.lastSnapshot.summary : state.api.lastApiStatus;
    const mode = scannerModeForPage(scan.pageType);
    state.panel.innerHTML = `
      <div class="sc-head">
        <span>🕶 ShadowCore Scanner</span>
        <button data-sc="compact">${state.cfg.compact ? '▣' : '—'}</button>
        <button data-sc="settings">⚙</button>
      </div>
      <div class="sc-body">
        <div class="sc-row"><b>Mode:</b> ${escapeHtml(mode)} <span class="sc-muted">${escapeHtml(scan.pageType)} · ${scan.players.length} players</span></div>
        <div class="sc-row"><b>HQ:</b> ${escapeHtml(tokenState)} ${state.cfg.autoSubmit ? '<span class="sc-warn">AUTO</span>' : ''}</div>
        <div class="sc-row"><b>API:</b> ${escapeHtml(apiState)} <span class="sc-muted">max ${apiRate}/s · ${state.api.callsThisSession} calls this session</span></div>
        <div class="sc-row"><b>Auto:</b> ${state.cfg.autoEnrichmentEnabled ? '<span class="sc-good">Enrichment ON</span>' : '<span class="sc-muted">Enrichment off</span>'}</div>
        ${apiSummary ? `<div class="sc-api-mini">${escapeHtml(apiSummary)}</div>` : ''}
        ${assignment ? `<div class="sc-card"><b>Assignment:</b><br>${escapeHtml(assignment)}</div>` : ''}
        ${chain && (chain.Chain || chain.Next_Bonus) ? `<div class="sc-card"><b>Chain:</b> ${escapeHtml(chain.Chain || '0')} → next ${escapeHtml(chain.Next_Bonus || '?')}</div>` : ''}
        <div class="sc-actions">
          <button data-sc="scan">Scan</button>
          <button data-sc="auto-enrich">Auto Enrich</button>
          <button data-sc="submit">Send Scan</button>
          <button data-sc="context">Refresh HQ</button>
          <button data-sc="note">Add Note</button>
          <button data-sc="recruit">Recruit Lead</button>
          <button data-sc="support">Support</button>
        </div>
        <div class="sc-actions sc-actions-secondary">
          <button data-sc="checkin">War Check-In</button>
          <button data-sc="attack">Log Attack</button>
          <button data-sc="market">Market Note</button>
          <button data-sc="openhq">Open HQ</button>
          <button data-sc="register">Register</button>
        </div>
        <div class="sc-actions sc-actions-secondary">
          <button data-sc="api-me">API Me</button>
          <button data-sc="api-visible">API Visible</button>
          <button data-sc="api-submit">Send API Snapshot</button>
          <button data-sc="api-toggle">${state.cfg.apiAutoPoll ? 'Stop API Poll' : 'Start API Poll'}</button>
        </div>
        <div id="sc-status" class="sc-status"></div>
      </div>`;
    bindPanelEvents();
  }

  function bindPanelEvents() {
    state.panel.querySelectorAll('button[data-sc]').forEach(btn => {
      btn.addEventListener('click', ev => {
        const action = ev.currentTarget.getAttribute('data-sc');
        if (action === 'compact') saveConfig({compact: !state.cfg.compact});
        else if (action === 'settings') showSettingsModal();
        else if (action === 'scan') scanAndRender(false);
        else if (action === 'submit') submitScan('manual');
        else if (action === 'context') fetchContextAndBadge(state.lastScan || scanCurrentPage(), true);
        else if (action === 'note') showNoteModal();
        else if (action === 'recruit') showRecruitModal();
        else if (action === 'support') showSupportModal();
        else if (action === 'checkin') showCheckinModal();
        else if (action === 'attack') showAttackModal();
        else if (action === 'market') showMarketModal();
        else if (action === 'openhq') window.open(state.cfg.backendUrl, '_blank', 'noopener');
        else if (action === 'register') registerInstallWithHQ();
        else if (action === 'auto-enrich') submitAutoEnrichment('button');
        else if (action === 'api-me') fetchMyApiSnapshot(true);
        else if (action === 'api-visible') fetchVisiblePlayersApi(true);
        else if (action === 'api-submit') submitApiSnapshot();
        else if (action === 'api-toggle') toggleApiPolling();
      });
    });
  }


  function scannerModeForPage(pageType) {
    const p = String(pageType || '').toLowerCase();
    if (p.indexOf('faction') !== -1 || p.indexOf('war') !== -1) return 'War / Faction';
    if (p.indexOf('profile') !== -1 || p.indexOf('player') !== -1) return 'Profile Notes';
    if (p.indexOf('forum') !== -1) return 'Recruit / Forum';
    if (p.indexOf('hospital') !== -1) return 'Hospital Support';
    if (p.indexOf('bazaar') !== -1 || p.indexOf('market') !== -1 || p.indexOf('item') !== -1) return 'Market';
    if (p.indexOf('travel') !== -1) return 'Travel';
    if (p.indexOf('trade') !== -1) return 'Trade / Loan';
    if (p.indexOf('crime') !== -1) return 'OC / Crime';
    return state.cfg.uiMode || 'Auto';
  }

  async function registerInstallWithHQ() {
    try {
      ensureConfigured();
      const res = await apiCall('v16RegisterScanner', {
        action: 'v16RegisterScanner',
        tornId: state.cfg.memberTornId,
        name: state.cfg.memberName,
        version: VERSION,
        backendUrl: state.cfg.backendUrl,
        token: state.cfg.scannerToken,
        apiEnabled: !!state.cfg.apiEnabled,
        notes: 'Registered from Tampermonkey scanner v' + VERSION
      });
      notify('ShadowCore Scanner', 'Registered with HQ: ' + (res.installId || 'ok'));
      logStatus('Registered install with HQ.', true);
    } catch (err) { notify('ShadowCore Scanner', 'Register failed: ' + err.message); logStatus('Register failed: ' + err.message, false); }
  }

  function logStatus(text, good) {
    const el = document.getElementById('sc-status');
    if (el) {
      el.textContent = text;
      el.className = 'sc-status ' + (good ? 'sc-good' : 'sc-bad');
    }
    console.log('[ShadowCore Scanner]', text);
  }

  function scanAndRender(showNotify) {
    state.lastScan = scanCurrentPage();
    renderPanel();
    if (showNotify) notify('ShadowCore Scanner', 'Scan complete: ' + state.lastScan.players.length + ' players found.');
    else logStatus('Scan complete: ' + state.lastScan.players.length + ' players found.', true);
    return state.lastScan;
  }

  async function submitScan(mode) {
    try {
      ensureConfigured();
      state.busy = true;
      logStatus('Sending scan to HQ...');
      const scan = state.lastScan || scanCurrentPage();
      const res = await apiCall('scannerSubmitPageScan', {scan: scan, mode: mode || 'manual'});
      logStatus('Sent: ' + (res.players || 0) + ' players, ' + (res.importedEnemies || 0) + ' enemies, ' + (res.importedRecruitLeads || 0) + ' recruits.', true);
      notify('ShadowCore Scanner', 'Scan submitted to HQ.');
    } catch (err) {
      logStatus(err.message, false);
    } finally {
      state.busy = false;
    }
  }

  async function fetchContextAndBadge(scan, verbose) {
    try {
      ensureConfigured();
      scan = scan || scanCurrentPage();
      const visiblePlayers = scan.players.map(p => ({id: p.id, name: p.name}));
      const res = await apiCall('scannerGetOverlayContext', {pageType: scan.pageType, visiblePlayers: visiblePlayers, playerId: scan.subject && scan.subject.id});
      state.lastContext = res;
      if (state.cfg.enableBadges) applyBadges(res);
      renderPanel();
      if (verbose) logStatus('HQ context refreshed.', true);
    } catch (err) {
      if (verbose) logStatus(err.message, false);
    }
  }

  function getMyAssignmentText() {
    const ctx = state.lastContext || {};
    const a = (ctx.myAssignments || [])[0];
    if (!a) return '';
    return `${a.Enemy_Name || a.Enemy_ID || 'Target'} | Priority ${a.Priority || '?'} | ${a.Notes || ''}`;
  }

  function applyBadges(ctx) {
    const byId = {};
    (ctx.warTargets || []).forEach(r => { if (r.Enemy_ID) byId[String(r.Enemy_ID)] = {label: r.Priority || 'Target', cls: 'sc-target'}; });
    (ctx.enemyPlayers || []).forEach(r => {
      if (!r.Enemy_ID) return;
      if (String(r.Avoid || '').toUpperCase() === 'TRUE') byId[String(r.Enemy_ID)] = {label: 'Avoid', cls: 'sc-avoid'};
      else if (String(r.Good_Target || '').toUpperCase() === 'TRUE') byId[String(r.Enemy_ID)] = {label: 'Safe', cls: 'sc-safe'};
      else if (!byId[String(r.Enemy_ID)]) byId[String(r.Enemy_ID)] = {label: 'Intel', cls: 'sc-intel'};
    });
    (ctx.recruitLeads || []).forEach(r => { if (r.Torn_ID && !byId[String(r.Torn_ID)]) byId[String(r.Torn_ID)] = {label: 'Recruit', cls: 'sc-recruit'}; });
    document.querySelectorAll('span.sc-badge').forEach(b => b.remove());
    document.querySelectorAll('a[href*="profiles.php?XID="]').forEach(a => {
      const id = extractIdFromUrl(a.href, 'XID');
      if (!id || !byId[id]) return;
      const badge = document.createElement('span');
      badge.className = 'sc-badge ' + byId[id].cls;
      badge.textContent = byId[id].label;
      a.insertAdjacentElement('afterend', badge);
    });
  }

  function scanCurrentPage() {
    const pageType = detectPageType();
    const subject = extractSubject(pageType);
    const players = extractPlayerLinks(pageType, subject);
    const marketItems = pageType === 'market' || pageType === 'bazaar' || pageType === 'travel' ? extractMarketItems() : [];
    const attackResult = pageType === 'attack' ? extractAttackResult() : null;
    return {
      version: VERSION,
      pageType: pageType,
      url: location.href,
      title: document.title || '',
      timestamp: new Date().toISOString(),
      subject: subject,
      players: players,
      marketItems: marketItems,
      attackResult: attackResult,
      apiEnrichments: state.api.lastSnapshot && state.api.lastSnapshot.visiblePlayers ? state.api.lastSnapshot.visiblePlayers : [],
      textSample: getCleanText(document.body).slice(0, 2500)
    };
  }

  function detectPageType() {
    const u = location.href.toLowerCase();
    const text = getCleanText(document.body).toLowerCase().slice(0, 5000);
    if (/profiles\.php.*xid=\d+/i.test(location.href)) return 'profile';
    if (u.includes('factions.php')) return u.includes('step=your') || text.includes('your faction') ? 'faction' : 'enemyFaction';
    if (u.includes('forums.php')) return 'forum';
    if (u.includes('hospital') || text.includes('hospitalized') || text.includes('in hospital')) return 'hospital';
    if (u.includes('imarket') || u.includes('bazaar') || u.includes('itemmarket') || u.includes('market')) return 'market';
    if (u.includes('travel') || text.includes('travel agency') || text.includes('destination')) return 'travel';
    if (u.includes('loader.php') && (u.includes('attack') || text.includes('you attacked') || text.includes('respect'))) return 'attack';
    if (u.includes('crimes.php') || text.includes('organized crime')) return 'crime';
    if (u.includes('companies.php') || u.includes('joblist.php') || text.includes('company')) return 'company';
    if (u.includes('trade.php') || text.includes('trade with')) return 'trade';
    return 'general';
  }

  function extractSubject(pageType) {
    const subject = {id: '', name: '', type: pageType};
    if (pageType === 'profile') {
      subject.id = extractIdFromUrl(location.href, 'XID') || '';
      subject.name = guessProfileName() || document.title.replace(/\|.*$/, '').trim();
    } else if (pageType === 'faction' || pageType === 'enemyFaction') {
      subject.id = extractIdFromUrl(location.href, 'ID') || extractHashId('ID') || '';
      subject.name = guessFactionName() || document.title.replace(/\|.*$/, '').trim();
    }
    return subject;
  }

  function extractPlayerLinks(pageType, subject) {
    const map = new Map();
    const anchors = Array.from(document.querySelectorAll('a[href*="profiles.php?XID="]')).slice(0, 800);
    anchors.forEach(a => {
      const id = extractIdFromUrl(a.href, 'XID');
      if (!id || map.has(id)) return;
      const container = closestUsefulText(a);
      const text = getCleanText(container || a).slice(0, 1000);
      const name = cleanName(a.textContent || text.split('\n')[0] || '');
      const level = firstMatch(text, /level\s*[:#-]?\s*(\d{1,4})/i) || firstMatch(text, /lvl\s*[:#-]?\s*(\d{1,4})/i) || '';
      const status = guessStatus(text);
      const timeLeft = firstMatch(text, /(\d+d\s*)?(\d+h\s*)?(\d+m\s*)?(\d+s)\b/i) || '';
      map.set(id, {
        id: id,
        name: name,
        level: level,
        status: status,
        timeLeft: timeLeft,
        factionId: subject && (pageType === 'faction' || pageType === 'enemyFaction') ? subject.id : '',
        factionName: subject && (pageType === 'faction' || pageType === 'enemyFaction') ? subject.name : '',
        href: a.href
      });
    });
    return Array.from(map.values()).slice(0, 250);
  }

  function extractMarketItems() {
    const rows = Array.from(document.querySelectorAll('li, tr, [class*="item"], [class*="row"]')).slice(0, 250);
    const items = [];
    rows.forEach(row => {
      const text = getCleanText(row);
      if (!text || text.length < 6 || !/\$[\d,]+/.test(text)) return;
      const price = firstMatch(text, /\$([\d,]+)/);
      const qty = firstMatch(text, /(?:x|qty\.?|quantity)\s*(\d+)/i) || '';
      const sellerAnchor = row.querySelector && row.querySelector('a[href*="profiles.php?XID="]');
      items.push({
        name: text.replace(/\$[\d,].*$/, '').slice(0, 120).trim(),
        price: price ? price.replace(/,/g, '') : '',
        quantity: qty,
        sellerId: sellerAnchor ? extractIdFromUrl(sellerAnchor.href, 'XID') : '',
        sellerName: sellerAnchor ? cleanName(sellerAnchor.textContent) : '',
        raw: text.slice(0, 400)
      });
    });
    return items.slice(0, 60);
  }

  function extractAttackResult() {
    const text = getCleanText(document.body).slice(0, 5000);
    const respect = firstMatch(text, /respect\s*(?:gained|earned)?\s*[:+]?\s*([\d.]+)/i) || '';
    const chain = firstMatch(text, /chain\s*[:#]?\s*(\d+)/i) || '';
    const result = firstMatch(text, /(hospitalized|mugged|left|lost|stalemate|attacked|defeated|escaped)/i) || '';
    const defender = Array.from(document.querySelectorAll('a[href*="profiles.php?XID="]')).find(a => extractIdFromUrl(a.href, 'XID') !== state.cfg.memberTornId);
    return {
      attackerId: state.cfg.memberTornId,
      attackerName: state.cfg.memberName,
      defenderId: defender ? extractIdFromUrl(defender.href, 'XID') : '',
      defenderName: defender ? cleanName(defender.textContent) : '',
      result: result,
      respect: respect,
      chain: chain,
      raw: text.slice(0, 1000)
    };
  }

  function showSettingsModal() {
    const content = `
      <h2>ShadowCore Scanner Settings</h2>
      <label>HQ Backend URL <input id="sc-set-backend" value="${escapeAttr(state.cfg.backendUrl)}"></label>
      <label>Scanner Shared Token <input id="sc-set-token" value="${escapeAttr(state.cfg.scannerToken)}" placeholder="Paste token from Scanner_Settings"></label>
      <label>Your Torn ID <input id="sc-set-id" value="${escapeAttr(state.cfg.memberTornId)}"></label>
      <label>Your Torn Name <input id="sc-set-name" value="${escapeAttr(state.cfg.memberName)}"></label>
      <label><input type="checkbox" id="sc-set-auto" ${state.cfg.autoSubmit ? 'checked' : ''}> Auto-submit scans after page changes</label>
      <label><input type="checkbox" id="sc-set-badges" ${state.cfg.enableBadges ? 'checked' : ''}> Show inline ShadowCore badges beside player links</label>
      <label>Panel position <select id="sc-set-pos"><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option></select></label>
      <label>UI mode <select id="sc-ui-mode"><option>Auto</option><option>War</option><option>Recruit</option><option>Market</option><option>Profile</option><option>Support</option><option>Quiet</option></select></label>
      <h3>Optional Torn API</h3>
      <label><input type="checkbox" id="sc-api-enabled" ${state.cfg.apiEnabled ? 'checked' : ''}> Enable local Torn API pulls</label>
      <label>Torn API Key <input type="password" id="sc-api-key" value="${escapeAttr(state.cfg.tornApiKey || '')}" placeholder="Stored only in Tampermonkey local storage"></label>
      <label>API rate, requests per second <input type="number" min="0.05" max="1" step="0.05" id="sc-api-rate" value="${escapeAttr(sanitizeApiRate(state.cfg.apiRatePerSecond))}"></label>
      <label>Own-user selections <input id="sc-api-own-sel" value="${escapeAttr(state.cfg.apiOwnSelections || '')}"></label>
      <label>Visible-player selections <input id="sc-api-player-sel" value="${escapeAttr(state.cfg.apiPlayerSelections || '')}"></label>
      <label>Visible-player API limit per button press <input type="number" min="1" max="25" step="1" id="sc-api-visible-limit" value="${escapeAttr(state.cfg.apiVisibleLimit || 5)}"></label>
      <label><input type="checkbox" id="sc-api-poll" ${state.cfg.apiAutoPoll ? 'checked' : ''}> Auto-poll my own API at the selected rate</label>
      <label><input type="checkbox" id="sc-api-submit" ${state.cfg.apiSubmitSnapshots ? 'checked' : ''}> Allow sending API snapshot data to ShadowCore HQ when I click Send API Snapshot</label>
      <h3>Opt-in auto enrichment</h3>
      <label><input type="checkbox" id="sc-auto-enrich" ${state.cfg.autoEnrichmentEnabled ? 'checked' : ''}> Enable v1.7/v1.8 auto-enrichment</label>
      <label>Auto-enrichment cooldown, seconds <input type="number" min="15" max="600" step="5" id="sc-auto-cooldown" value="${escapeAttr(state.cfg.autoEnrichmentCooldownSeconds || 60)}"></label>
      <label><input type="checkbox" id="sc-auto-readiness" ${state.cfg.autoReadiness ? 'checked' : ''}> Readiness + cooldown forecasts</label>
      <label><input type="checkbox" id="sc-auto-checkins" ${state.cfg.autoCheckins ? 'checked' : ''}> Check-ins + assignment tracking</label>
      <label><input type="checkbox" id="sc-auto-intel" ${state.cfg.autoEnemyEnrichment ? 'checked' : ''}> Enemy/faction/profile intel</label>
      <label><input type="checkbox" id="sc-auto-recruit" ${state.cfg.autoRecruitLeads ? 'checked' : ''}> Recruit leads</label>
      <label><input type="checkbox" id="sc-auto-support" ${state.cfg.autoHospitalSupport ? 'checked' : ''}> Hospital/revive/support context</label>
      <label><input type="checkbox" id="sc-auto-economy" ${state.cfg.autoMarketTravel ? 'checked' : ''}> Market/travel/trade/economy</label>
      <label><input type="checkbox" id="sc-auto-growth" ${state.cfg.autoTrainingGrowth ? 'checked' : ''}> Training/onboarding/API/scanner health</label>
      <label><input type="checkbox" id="sc-auto-discord" ${state.cfg.autoDiscordTriggers ? 'checked' : ''}> Queue Discord trigger rows</label>
      <h3>v1.8 deep scanner categories</h3>
      <label><input type="checkbox" id="sc-deep-enabled" ${state.cfg.deepScannerEnabled ? 'checked' : ''}> Enable v1.8 deep scanner categories</label>
      <label><input type="checkbox" id="sc-deep-armory" ${state.cfg.autoArmoryStock ? 'checked' : ''}> Armory stock/news and item support context</label>
      <label><input type="checkbox" id="sc-deep-faction" ${state.cfg.autoFactionUpgrades ? 'checked' : ''}> Faction respect/upgrades and competition snapshots</label>
      <label><input type="checkbox" id="sc-deep-oc" ${state.cfg.autoOcResults ? 'checked' : ''}> OC result history and participant reliability</label>
      <label><input type="checkbox" id="sc-deep-business" ${state.cfg.autoBusinessSnapshots ? 'checked' : ''}> Optional bazaar/business/property money-growth snapshots</label>
      <label><input type="checkbox" id="sc-deep-growth" ${state.cfg.autoEducationTracking ? 'checked' : ''}> Optional education/merit/mission/racing progress</label>
      <label><input type="checkbox" id="sc-deep-casino" ${state.cfg.autoCasino ? 'checked' : ''}> Optional casino/bankroll event tracking</label>
      <label><input type="checkbox" id="sc-deep-gear" ${state.cfg.autoGearScans ? 'checked' : ''}> Gear quality/weapon/armor scans</label>
      <label><input type="checkbox" id="sc-deep-reviver" ${state.cfg.autoReviverPerformance ? 'checked' : ''}> Reviver/healer performance</label>
      <label><input type="checkbox" id="sc-deep-risk" ${state.cfg.autoRiskFlags ? 'checked' : ''}> Member risk flags + smart recommendations</label>
      <div class="sc-disclosure"><b>API safety:</b> your Torn API key is stored only in Tampermonkey local storage on this browser. The scanner never sends the key to ShadowCore HQ. API data is only sent to HQ if you use Send API Snapshot and have that option enabled.</div>
      <div class="sc-disclosure">This scanner only submits visible page observations or requests that you choose to send. Do not submit private data without consent.</div>
      <div class="sc-modal-actions"><button id="sc-save-settings">Save</button><button id="sc-test-hq">Test HQ</button><button data-close="1">Close</button></div>`;
    showModal(content, modal => {
      modal.querySelector('#sc-set-pos').value = state.cfg.position;
      modal.querySelector('#sc-ui-mode').value = state.cfg.uiMode || 'Auto';
      modal.querySelector('#sc-save-settings').addEventListener('click', () => {
        saveConfig({
          backendUrl: modal.querySelector('#sc-set-backend').value.trim(),
          scannerToken: modal.querySelector('#sc-set-token').value.trim(),
          memberTornId: modal.querySelector('#sc-set-id').value.trim(),
          memberName: modal.querySelector('#sc-set-name').value.trim(),
          autoSubmit: modal.querySelector('#sc-set-auto').checked,
          enableBadges: modal.querySelector('#sc-set-badges').checked,
          position: modal.querySelector('#sc-set-pos').value,
          uiMode: modal.querySelector('#sc-ui-mode').value,
          apiEnabled: modal.querySelector('#sc-api-enabled').checked,
          tornApiKey: modal.querySelector('#sc-api-key').value.trim(),
          apiRatePerSecond: sanitizeApiRate(modal.querySelector('#sc-api-rate').value),
          apiOwnSelections: modal.querySelector('#sc-api-own-sel').value.trim() || DEFAULTS.apiOwnSelections,
          apiPlayerSelections: modal.querySelector('#sc-api-player-sel').value.trim() || DEFAULTS.apiPlayerSelections,
          apiVisibleLimit: clampInt(modal.querySelector('#sc-api-visible-limit').value, 1, 25, 5),
          apiAutoPoll: modal.querySelector('#sc-api-poll').checked,
          apiSubmitSnapshots: modal.querySelector('#sc-api-submit').checked,
          autoEnrichmentEnabled: modal.querySelector('#sc-auto-enrich').checked,
          autoEnrichmentCooldownSeconds: clampInt(modal.querySelector('#sc-auto-cooldown').value, 15, 600, 60),
          autoReadiness: modal.querySelector('#sc-auto-readiness').checked,
          autoWarReadiness: modal.querySelector('#sc-auto-readiness').checked,
          autoCheckins: modal.querySelector('#sc-auto-checkins').checked,
          autoAssignmentTracking: modal.querySelector('#sc-auto-checkins').checked,
          autoEnemyEnrichment: modal.querySelector('#sc-auto-intel').checked,
          autoFactionRoster: modal.querySelector('#sc-auto-intel').checked,
          autoRecruitLeads: modal.querySelector('#sc-auto-recruit').checked,
          autoHospitalSupport: modal.querySelector('#sc-auto-support').checked,
          autoSupportContext: modal.querySelector('#sc-auto-support').checked,
          autoMarketTravel: modal.querySelector('#sc-auto-economy').checked,
          autoTradeLoan: modal.querySelector('#sc-auto-economy').checked,
          autoTrainingGrowth: modal.querySelector('#sc-auto-growth').checked,
          autoOnboarding: modal.querySelector('#sc-auto-growth').checked,
          autoApiHealth: modal.querySelector('#sc-auto-growth').checked,
          autoScannerHealth: modal.querySelector('#sc-auto-growth').checked,
          autoDiscordTriggers: modal.querySelector('#sc-auto-discord').checked,
          deepScannerEnabled: modal.querySelector('#sc-deep-enabled').checked,
          autoArmoryStock: modal.querySelector('#sc-deep-armory').checked,
          autoFactionUpgrades: modal.querySelector('#sc-deep-faction').checked,
          autoOcResults: modal.querySelector('#sc-deep-oc').checked,
          autoBusinessSnapshots: modal.querySelector('#sc-deep-business').checked,
          autoPropertyNotes: modal.querySelector('#sc-deep-business').checked,
          autoEducationTracking: modal.querySelector('#sc-deep-growth').checked,
          autoMeritProgress: modal.querySelector('#sc-deep-growth').checked,
          autoMissions: modal.querySelector('#sc-deep-growth').checked,
          autoRacing: modal.querySelector('#sc-deep-growth').checked,
          autoCasino: modal.querySelector('#sc-deep-casino').checked,
          autoGearScans: modal.querySelector('#sc-deep-gear').checked,
          autoReviverPerformance: modal.querySelector('#sc-deep-reviver').checked,
          autoCooldownForecasts: modal.querySelector('#sc-auto-readiness').checked,
          autoEventNews: modal.querySelector('#sc-deep-faction').checked,
          autoRiskFlags: modal.querySelector('#sc-deep-risk').checked,
          autoSmartRecommendations: modal.querySelector('#sc-deep-risk').checked
        });
        closeModal();
        notify('ShadowCore Scanner', 'Settings saved.');
      });
      modal.querySelector('#sc-test-hq').addEventListener('click', async () => {
        try { const res = await apiCall('scannerPing', {}); await registerInstallWithHQ(); alert('Connected to scanner bridge v' + (res.version || '?') + ' and registered install.'); }
        catch (err) { alert('Failed: ' + err.message); }
      });
    });
  }

  function showNoteModal() {
    const scan = state.lastScan || scanCurrentPage();
    const player = scan.subject && scan.subject.id ? scan.subject : (scan.players[0] || {});
    const content = `
      <h2>Add ShadowCore Profile Note</h2>
      <label>Player ID <input id="sc-note-id" value="${escapeAttr(player.id || '')}"></label>
      <label>Player Name <input id="sc-note-name" value="${escapeAttr(player.name || '')}"></label>
      <label>Category <select id="sc-note-cat"><option>General</option><option>Safe Target</option><option>Risky Target</option><option>Do Not Hit</option><option>Recruit</option><option>Loan</option><option>Discipline</option><option>Ally</option></select></label>
      <label>Rating <input id="sc-note-rating" placeholder="Easy / Medium / Hard / Avoid"></label>
      <label>Note <textarea id="sc-note-text" placeholder="Write note..."></textarea></label>
      <div class="sc-modal-actions"><button id="sc-submit-note">Send Note</button><button data-close="1">Close</button></div>`;
    showModal(content, modal => {
      modal.querySelector('#sc-submit-note').addEventListener('click', async () => {
        try {
          ensureConfigured();
          const res = await apiCall('scannerAddProfileNote', {
            pageType: scan.pageType,
            playerId: modal.querySelector('#sc-note-id').value,
            playerName: modal.querySelector('#sc-note-name').value,
            category: modal.querySelector('#sc-note-cat').value,
            rating: modal.querySelector('#sc-note-rating').value,
            note: modal.querySelector('#sc-note-text').value
          });
          closeModal();
          notify('ShadowCore Scanner', 'Note sent: ' + res.noteId);
        } catch (err) { alert(err.message); }
      });
    });
  }

  function showRecruitModal() {
    const scan = state.lastScan || scanCurrentPage();
    const player = scan.subject && scan.subject.id ? scan.subject : (scan.players[0] || {});
    const content = `
      <h2>Save Recruit Lead</h2>
      <label>Torn ID <input id="sc-rec-id" value="${escapeAttr(player.id || '')}"></label>
      <label>Name <input id="sc-rec-name" value="${escapeAttr(player.name || '')}"></label>
      <label>Level <input id="sc-rec-level" value="${escapeAttr(player.level || '')}"></label>
      <label>Faction ID <input id="sc-rec-fid" value="${escapeAttr(player.factionId || '')}"></label>
      <label>Faction Name <input id="sc-rec-fname" value="${escapeAttr(player.factionName || '')}"></label>
      <label>Notes <textarea id="sc-rec-notes"></textarea></label>
      <div class="sc-modal-actions"><button id="sc-submit-rec">Save Lead</button><button data-close="1">Close</button></div>`;
    showModal(content, modal => {
      modal.querySelector('#sc-submit-rec').addEventListener('click', async () => {
        try {
          ensureConfigured();
          const res = await apiCall('scannerSubmitRecruitLead', {
            pageType: scan.pageType,
            tornId: modal.querySelector('#sc-rec-id').value,
            name: modal.querySelector('#sc-rec-name').value,
            level: modal.querySelector('#sc-rec-level').value,
            factionId: modal.querySelector('#sc-rec-fid').value,
            factionName: modal.querySelector('#sc-rec-fname').value,
            notes: modal.querySelector('#sc-rec-notes').value
          });
          closeModal();
          notify('ShadowCore Scanner', 'Recruit lead saved: ' + res.tornId);
        } catch (err) { alert(err.message); }
      });
    });
  }

  function showSupportModal() {
    const content = `
      <h2>Request Support</h2>
      <label>Type <select id="sc-sup-type"><option>Revive</option><option>Meds</option><option>Xanax</option><option>Weapon</option><option>Armor</option><option>Money Loan</option><option>New Target</option><option>Other</option></select></label>
      <label>Item / Amount <input id="sc-sup-item" placeholder="e.g. Morphine / $5,000,000"></label>
      <label>Urgency <select id="sc-sup-urg"><option>Normal</option><option>High</option><option>War Critical</option></select></label>
      <label>Notes <textarea id="sc-sup-notes"></textarea></label>
      <div class="sc-modal-actions"><button id="sc-submit-sup">Send Request</button><button data-close="1">Close</button></div>`;
    showModal(content, modal => {
      modal.querySelector('#sc-submit-sup').addEventListener('click', async () => {
        try {
          ensureConfigured();
          const type = modal.querySelector('#sc-sup-type').value;
          const res = await apiCall('scannerRequestSupport', {
            pageType: detectPageType(),
            requestType: type,
            item: modal.querySelector('#sc-sup-item').value,
            urgency: modal.querySelector('#sc-sup-urg').value,
            notes: modal.querySelector('#sc-sup-notes').value
          });
          closeModal();
          notify('ShadowCore Scanner', 'Support request sent: ' + res.requestId);
        } catch (err) { alert(err.message); }
      });
    });
  }

  function showCheckinModal() {
    const content = `
      <h2>War Check-In</h2>
      <label>Available? <select id="sc-chk-avail"><option>Yes</option><option>Limited</option><option>No</option></select></label>
      <label>Time window <input id="sc-chk-window" placeholder="e.g. evenings / 8pm-12am"></label>
      <label><input type="checkbox" id="sc-chk-hit" checked> I can hit</label>
      <label><input type="checkbox" id="sc-chk-chain" checked> I can help chain</label>
      <label>Notes <textarea id="sc-chk-notes"></textarea></label>
      <div class="sc-modal-actions"><button id="sc-submit-chk">Check In</button><button data-close="1">Close</button></div>`;
    showModal(content, modal => {
      modal.querySelector('#sc-submit-chk').addEventListener('click', async () => {
        try {
          ensureConfigured();
          const res = await apiCall('scannerWarCheckin', {
            available: modal.querySelector('#sc-chk-avail').value,
            timeWindows: modal.querySelector('#sc-chk-window').value,
            canHit: modal.querySelector('#sc-chk-hit').checked ? 'Yes' : 'No',
            canChain: modal.querySelector('#sc-chk-chain').checked ? 'Yes' : 'No',
            notes: modal.querySelector('#sc-chk-notes').value
          });
          closeModal();
          notify('ShadowCore Scanner', 'Checked in: ' + res.commitmentId);
        } catch (err) { alert(err.message); }
      });
    });
  }

  function showAttackModal() {
    const scan = state.lastScan || scanCurrentPage();
    const ar = scan.attackResult || extractAttackResult();
    const content = `
      <h2>Log Attack Result</h2>
      <label>Defender ID <input id="sc-atk-did" value="${escapeAttr(ar.defenderId || '')}"></label>
      <label>Defender Name <input id="sc-atk-dname" value="${escapeAttr(ar.defenderName || '')}"></label>
      <label>Result <input id="sc-atk-result" value="${escapeAttr(ar.result || '')}" placeholder="hospitalized / mugged / lost"></label>
      <label>Respect <input id="sc-atk-respect" value="${escapeAttr(ar.respect || '')}"></label>
      <label>Chain <input id="sc-atk-chain" value="${escapeAttr(ar.chain || '')}"></label>
      <label>Notes <textarea id="sc-atk-notes"></textarea></label>
      <div class="sc-modal-actions"><button id="sc-submit-atk">Log Attack</button><button data-close="1">Close</button></div>`;
    showModal(content, modal => {
      modal.querySelector('#sc-submit-atk').addEventListener('click', async () => {
        try {
          ensureConfigured();
          const res = await apiCall('scannerSubmitAttackResult', {
            pageType: scan.pageType,
            defenderId: modal.querySelector('#sc-atk-did').value,
            defenderName: modal.querySelector('#sc-atk-dname').value,
            attackResult: modal.querySelector('#sc-atk-result').value,
            respect: modal.querySelector('#sc-atk-respect').value,
            chain: modal.querySelector('#sc-atk-chain').value,
            notes: modal.querySelector('#sc-atk-notes').value
          });
          closeModal();
          notify('ShadowCore Scanner', 'Attack logged: ' + res.attackId);
        } catch (err) { alert(err.message); }
      });
    });
  }

  function showMarketModal() {
    const scan = state.lastScan || scanCurrentPage();
    const first = (scan.marketItems || [])[0] || {};
    const content = `
      <h2>Save Market / Travel Note</h2>
      <label>Item <input id="sc-mkt-item" value="${escapeAttr(first.name || '')}"></label>
      <label>Price <input id="sc-mkt-price" value="${escapeAttr(first.price || '')}"></label>
      <label>Quantity <input id="sc-mkt-qty" value="${escapeAttr(first.quantity || '1')}"></label>
      <label>Profit / Note <textarea id="sc-mkt-note"></textarea></label>
      <div class="sc-modal-actions"><button id="sc-submit-mkt">Save Market Note</button><button id="sc-submit-travel">Save Travel Log</button><button data-close="1">Close</button></div>`;
    showModal(content, modal => {
      modal.querySelector('#sc-submit-mkt').addEventListener('click', async () => {
        try {
          ensureConfigured();
          const res = await apiCall('scannerSubmitMarketNote', {
            pageType: scan.pageType,
            itemName: modal.querySelector('#sc-mkt-item').value,
            price: modal.querySelector('#sc-mkt-price').value,
            quantity: modal.querySelector('#sc-mkt-qty').value,
            notes: modal.querySelector('#sc-mkt-note').value
          });
          closeModal();
          notify('ShadowCore Scanner', 'Market note saved: ' + res.noteId);
        } catch (err) { alert(err.message); }
      });
      modal.querySelector('#sc-submit-travel').addEventListener('click', async () => {
        try {
          ensureConfigured();
          const res = await apiCall('scannerSubmitTravelLog', {
            pageType: scan.pageType,
            location: document.title,
            item: modal.querySelector('#sc-mkt-item').value,
            buyPrice: modal.querySelector('#sc-mkt-price').value,
            quantity: modal.querySelector('#sc-mkt-qty').value,
            notes: modal.querySelector('#sc-mkt-note').value
          });
          closeModal();
          notify('ShadowCore Scanner', 'Travel log saved: ' + res.logId);
        } catch (err) { alert(err.message); }
      });
    });
  }



  async function maybeSubmitAutoEnrichment(scan) {
    if (!state.cfg.autoEnrichmentEnabled || !state.cfg.scannerToken) return;
    const cooldown = clampInt(state.cfg.autoEnrichmentCooldownSeconds, 15, 600, 60) * 1000;
    const key = scan.pageType + '|' + scan.url + '|' + (scan.subject && scan.subject.id || '') + '|' + scan.players.map(p => p.id).join(',');
    if (key === state.autoEnrichedPageKey && Date.now() - state.lastAutoEnrichAt < cooldown) return;
    if (Date.now() - state.lastAutoEnrichAt < cooldown) return;
    state.autoEnrichedPageKey = key;
    state.lastAutoEnrichAt = Date.now();
    await submitAutoEnrichment('auto');
  }

  async function submitAutoEnrichment(trigger) {
    ensureConfigured();
    const scan = state.lastScan || scanCurrentPage();
    const payload = buildAutoEnrichmentPayload(scan, trigger || 'manual');
    if (!payload.categories.length) { logStatus('Nothing useful to auto-enrich on this page.'); return; }
    const res = await apiCall('scannerSubmitAutoEnrichment', {enrichment: payload});
    if (state.cfg.deepScannerEnabled) {
      const deep = buildV18DeepPayload(scan, payload, trigger || 'manual');
      if (deep.categories.length) await apiCall('scannerSubmitV18DeepScan', {deepScan: deep});
    }
    logStatus('Auto enrichment sent: ' + payload.categories.join(', ') + (state.cfg.deepScannerEnabled ? ' + v1.8 deep data' : ''), true);
    return res;
  }

  function buildAutoEnrichmentPayload(scan, trigger) {
    const categories = [];
    const text = (scan.textSample || '').toLowerCase();
    const own = state.api.lastSnapshot && state.api.lastSnapshot.type === 'ownUser' ? state.api.lastSnapshot.data : null;
    const readiness = state.cfg.autoReadiness ? buildReadinessFromApi(own, scan) : null;
    const warReadiness = state.cfg.autoWarReadiness && readiness ? buildWarReadiness(readiness, scan) : null;
    if (readiness) categories.push('readiness');
    if (warReadiness) categories.push('warReadiness');

    const autoCheckin = state.cfg.autoCheckins ? {type:'page_seen', status:'seen', details:'Scanner saw member on ' + scan.pageType} : null;
    if (autoCheckin) categories.push('autoCheckin');

    const assignmentTracking = state.cfg.autoAssignmentTracking && scan.subject && scan.subject.id ? {event:'profile_or_target_viewed', targetId:scan.subject.id, targetName:scan.subject.name || '', details:'Member viewed detected subject'} : null;
    if (assignmentTracking) categories.push('assignmentTracking');

    const enemyEnrichment = state.cfg.autoEnemyEnrichment ? buildEnemyEnrichment(scan) : [];
    if (enemyEnrichment.length) categories.push('enemyEnrichment');

    const factionRoster = state.cfg.autoFactionRoster && (scan.pageType === 'faction' || scan.pageType === 'enemyFaction') ? {factionId: scan.subject && scan.subject.id, factionName: scan.subject && scan.subject.name, players: scan.players} : null;
    if (factionRoster) categories.push('factionRoster');

    const recruitLeads = state.cfg.autoRecruitLeads ? buildRecruitLeads(scan) : [];
    if (recruitLeads.length) categories.push('recruitLeads');

    const hospitalSupport = state.cfg.autoHospitalSupport ? buildHospitalSupport(scan) : [];
    if (hospitalSupport.length) categories.push('hospitalSupport');

    const supportContext = state.cfg.autoSupportContext && (text.includes('hospital') || text.includes('low life') || text.includes('out of energy')) ? {type:'page_context', priority:text.includes('hospital') ? 'High' : 'Normal', status:guessStatus(scan.textSample), energy: readiness && readiness.energyCurrent, life: readiness && readiness.lifeCurrent} : null;
    if (supportContext) categories.push('supportContext');

    const marketTravel = state.cfg.autoMarketTravel && (scan.marketItems.length || scan.pageType === 'travel' || scan.pageType === 'market') ? {items: scan.marketItems, location: scan.subject && scan.subject.name, travel: scan.pageType === 'travel'} : null;
    if (marketTravel) categories.push('marketTravel');

    const tradeLoan = state.cfg.autoTradeLoan && scan.pageType === 'trade' ? {category:'Trade/Loan', notes:'Trade page context detected'} : null;
    if (tradeLoan) categories.push('tradeLoan');

    const trainingGrowth = state.cfg.autoTrainingGrowth && readiness ? {energy: readiness.energyCurrent + '/' + readiness.energyMax, happy: readiness.happyCurrent + '/' + readiness.happyMax, cooldowns:{drug:readiness.drugCooldown, medical:readiness.medicalCooldown, booster:readiness.boosterCooldown}, trainingState: readiness.energyCurrent ? 'Energy snapshot available' : 'Unknown', source:'api/scanner'} : null;
    if (trainingGrowth) categories.push('trainingGrowth');

    const onboarding = state.cfg.autoOnboarding ? {steps: buildOnboardingSteps(scan)} : null;
    if (onboarding && onboarding.steps.length) categories.push('onboarding');

    const apiHealth = state.cfg.autoApiHealth ? {apiEnabled: !!state.cfg.apiEnabled, lastOk: state.api.lastApiError ? '' : (state.api.lastApiStatus || ''), lastError: state.api.lastApiError || '', ratePerSecond: sanitizeApiRate(state.cfg.apiRatePerSecond), selections: (state.cfg.apiOwnSelections || '') + ' | ' + (state.cfg.apiPlayerSelections || ''), snapshotType: state.api.lastSnapshot && state.api.lastSnapshot.type || '', permissionWarnings: [], source:'tampermonkey'} : null;
    if (apiHealth) categories.push('apiHealth');

    const scannerHealth = state.cfg.autoScannerHealth ? buildScannerHealth(scan) : null;
    if (scannerHealth) categories.push('scannerHealth');

    const discordTriggers = state.cfg.autoDiscordTriggers ? buildDiscordTriggers(scan, readiness, warReadiness, hospitalSupport) : [];
    if (discordTriggers.length) categories.push('discordTriggers');

    if (state.cfg.autoAttackLogging && scan.attackResult) categories.push('attackResult');

    return {trigger, scan, categories, summary: categories.length + ' categories from ' + scan.pageType, readiness, warReadiness, autoCheckin, assignmentTracking, enemyEnrichment, factionRoster, recruitLeads, hospitalSupport, supportContext, marketTravel, tradeLoan, trainingGrowth, onboarding, apiHealth, scannerHealth, discordTriggers};
  }


  function buildV18DeepPayload(scan, basePayload, trigger) {
    const categories = [];
    const text = (scan.textSample || '').toLowerCase();
    const api = state.api.lastSnapshot && state.api.lastSnapshot.data ? state.api.lastSnapshot.data : {};
    const out = {trigger, scan, baseCategories: basePayload.categories || [], categories: []};
    if (state.cfg.autoArmoryStock && /armory|weapon|armor|medical|drug|item|loan|stock/.test(text)) { out.armory = {items: scan.marketItems || [], notes: 'Visible armory/item/support context detected'}; categories.push('armory'); }
    if (state.cfg.autoFactionUpgrades && (scan.pageType === 'faction' || /respect|upgrade|branch|faction/.test(text))) { out.factionProgress = {factionId: scan.subject && scan.subject.id, factionName: scan.subject && scan.subject.name, respect: findNumber(text, /respect[^0-9]*(\d[\d,]*)/i), notes: 'Faction/respect/upgrade context'}; categories.push('factionProgress'); }
    if (state.cfg.autoOcResults && /organized crime|oc |crime|success|fail/.test(text)) { out.ocResult = {crime: firstMatch(scan.textSample, /(organized crime|[A-Za-z ]+ crime)/i), result: /success/i.test(text) ? 'Success' : (/fail/i.test(text) ? 'Failure' : ''), notes: 'Crime result/context detected'}; categories.push('ocResult'); }
    if (state.cfg.autoBusinessSnapshots && /bazaar|company|business|sold|stock|sale/.test(text)) { out.business = {type: scan.pageType, itemCount: (scan.marketItems || []).length, notes: 'Optional business/bazaar snapshot'}; categories.push('business'); }
    if (state.cfg.autoPropertyNotes && /property|vault|rental|happy|airstrip/.test(text)) { out.property = {property: firstMatch(scan.textSample, /(private island|ranch|castle|palace|property|vault|rental)/i), notes: 'Optional property/training setup note'}; categories.push('property'); }
    if (state.cfg.autoEducationTracking && /education|course|complete|class/.test(text)) { out.education = {course: firstMatch(scan.textSample, /(education|course)[^\n]{0,80}/i), status: /complete/i.test(text) ? 'Complete/near complete' : 'In progress/seen'}; categories.push('education'); }
    if (state.cfg.autoMeritProgress && /merit|award|medal|honor|achievement/.test(text)) { out.merit = {summary: firstMatch(scan.textSample, /(merit|award|medal|honor|achievement)[^\n]{0,120}/i), notes: 'Merit/achievement context'}; categories.push('merit'); }
    if (state.cfg.autoMissions && /mission|contract|duke/.test(text)) { out.mission = {summary: firstMatch(scan.textSample, /(mission|contract|duke)[^\n]{0,120}/i), status: /complete/i.test(text) ? 'Complete' : 'Seen'}; categories.push('mission'); }
    if (state.cfg.autoRacing && /race|racing|car|class [a-e]/.test(text)) { out.racing = {summary: firstMatch(scan.textSample, /(race|racing|car)[^\n]{0,120}/i), notes: 'Racing context detected'}; categories.push('racing'); }
    if (state.cfg.autoCasino && /casino|poker|blackjack|roulette|slots|bookie|bankroll/.test(text)) { out.casino = {summary: firstMatch(scan.textSample, /(casino|poker|blackjack|roulette|slots|bookie|bankroll)[^\n]{0,120}/i), optIn: true}; categories.push('casino'); }
    if (state.cfg.autoGearScans && /damage|accuracy|quality|armor|weapon|bonus|modifier/.test(text)) { out.gear = {items: scan.marketItems || [], summary: firstMatch(scan.textSample, /(damage|accuracy|quality|armor|weapon|bonus)[^\n]{0,160}/i)}; categories.push('gear'); }
    if (state.cfg.autoReviverPerformance && /revive|reviver|revived|hospital/.test(text)) { out.reviver = {summary: firstMatch(scan.textSample, /(revive|reviver|revived|hospital)[^\n]{0,160}/i), member: state.cfg.memberName}; categories.push('reviver'); }
    if (state.cfg.autoCooldownForecasts && basePayload.readiness) { out.cooldowns = {drug: basePayload.readiness.drugCooldown, medical: basePayload.readiness.medicalCooldown, booster: basePayload.readiness.boosterCooldown, energy: basePayload.readiness.energyCurrent + '/' + basePayload.readiness.energyMax}; categories.push('cooldowns'); }
    if (state.cfg.autoEventNews && /event|news|announcement|competition|war|ranked/.test(text)) { out.eventNews = {summary: firstMatch(scan.textSample, /(event|news|announcement|competition|ranked)[^\n]{0,160}/i), pageType: scan.pageType}; categories.push('eventNews'); }
    if (state.cfg.autoRiskFlags && basePayload.warReadiness && Number(basePayload.warReadiness.score || 0) < 50) { out.riskFlags = [{type:'low_readiness', severity:'Medium', details:'Readiness below 50'}]; categories.push('riskFlags'); }
    if (state.cfg.autoSmartRecommendations) { out.recommendations = buildV18Recommendations(scan, basePayload, out); if (out.recommendations.length) categories.push('recommendations'); }
    out.categories = categories;
    out.summary = categories.length + ' v1.8 categories from ' + scan.pageType;
    return out;
  }

  function buildV18Recommendations(scan, basePayload, deep) {
    const recs = [];
    if (basePayload.warReadiness && Number(basePayload.warReadiness.score || 0) >= 75) recs.push({type:'war', priority:'normal', recommendation:'Available for war/chain assignment'});
    if (deep.riskFlags && deep.riskFlags.length) recs.push({type:'risk', priority:'high', recommendation:'Review member readiness/support blockers'});
    if (deep.gear) recs.push({type:'gear', priority:'normal', recommendation:'Review gear/market item for armory or build guidance'});
    if (deep.education) recs.push({type:'growth', priority:'low', recommendation:'Update education/growth plan'});
    if (deep.armory) recs.push({type:'support', priority:'normal', recommendation:'Review armory stock/support context'});
    return recs;
  }

  function findNumber(text, re) { const m = String(text || '').match(re); return m ? (m[1] || '').replace(/,/g, '') : ''; }

  function buildReadinessFromApi(data, scan) {
    if (!data) return null;
    const bars = data.bars || data;
    const cd = data.cooldowns || {};
    const profile = data.profile || data;
    const statusObj = data.status || profile.status || {};
    const status = typeof statusObj === 'string' ? statusObj : (statusObj.description || statusObj.state || guessStatus(scan.textSample));
    const energy = bars.energy || data.energy || {};
    const nerve = bars.nerve || data.nerve || {};
    const happy = bars.happy || data.happy || {};
    const life = bars.life || data.life || {};
    const r = {
      tornId: state.cfg.memberTornId, name: state.cfg.memberName, level: profile.level || '', status: status || '',
      lifeCurrent: life.current || life.now || '', lifeMax: life.maximum || life.max || '', energyCurrent: energy.current || energy.now || '', energyMax: energy.maximum || energy.max || '',
      nerveCurrent: nerve.current || nerve.now || '', nerveMax: nerve.maximum || nerve.max || '', happyCurrent: happy.current || happy.now || '', happyMax: happy.maximum || happy.max || '',
      hospital: /hospital/i.test(status || '') ? 'TRUE' : '', jail: /jail/i.test(status || '') ? 'TRUE' : '', travel: /travel|abroad/i.test(status || '') ? 'TRUE' : '',
      drugCooldown: cd.drug || cd.drugs || '', medicalCooldown: cd.medical || '', boosterCooldown: cd.booster || '', lastAction: profile.last_action && (profile.last_action.relative || profile.last_action.status || profile.last_action.timestamp) || '', source:'local_api'
    };
    r.needsRevive = r.hospital === 'TRUE' || Number(r.lifeCurrent) <= 0;
    r.canHit = !r.needsRevive && r.jail !== 'TRUE' && r.travel !== 'TRUE' && Number(r.energyCurrent || 0) >= 25;
    r.readinessScore = computeReadinessScore(r);
    return r;
  }

  function computeReadinessScore(r) {
    let score = 100;
    if (r.hospital === 'TRUE' || r.needsRevive) score -= 60;
    if (r.jail === 'TRUE') score -= 45;
    if (r.travel === 'TRUE') score -= 55;
    if (Number(r.energyCurrent || 0) < 25) score -= 25;
    if (r.drugCooldown) score -= 5;
    if (r.medicalCooldown) score -= 10;
    return Math.max(0, Math.min(100, score));
  }

  function buildWarReadiness(readiness, scan) {
    const blockers = [];
    if (readiness.hospital === 'TRUE') blockers.push('Hospital');
    if (readiness.jail === 'TRUE') blockers.push('Jail');
    if (readiness.travel === 'TRUE') blockers.push('Travel');
    if (Number(readiness.energyCurrent || 0) < 25) blockers.push('Low energy');
    return {score: readiness.readinessScore, ready: blockers.length ? 'Limited/No' : 'Yes', canHit: readiness.canHit, blockers, recommendations: blockers.length ? ['Fix blockers before assignment'] : ['Available for targets/chains']};
  }

  function buildEnemyEnrichment(scan) {
    const arr = [];
    if (scan.pageType === 'profile' && scan.subject && scan.subject.id) arr.push({...scan.subject, tags:['profile_seen'], status: guessStatus(scan.textSample)});
    if (scan.pageType === 'enemyFaction' || scan.pageType === 'faction') scan.players.slice(0, 250).forEach(p => arr.push({...p, factionId: scan.subject && scan.subject.id, factionName: scan.subject && scan.subject.name, tags:['roster_seen']}));
    return arr;
  }

  function buildRecruitLeads(scan) {
    const leads = [];
    const text = (scan.textSample || '').toLowerCase();
    if (scan.pageType === 'forum' && /looking for faction|need faction|recruit|apply|join/i.test(text)) scan.players.slice(0, 20).forEach(p => leads.push({...p, source:'forum_auto', reason:'Forum recruit-like text detected', score:50}));
    if (scan.pageType === 'profile' && scan.subject && scan.subject.id && /looking for faction|no faction|new player/i.test(text)) leads.push({...scan.subject, source:'profile_auto', reason:'Profile looked like possible recruit', score:60});
    return leads;
  }

  function buildHospitalSupport(scan) {
    const out = [];
    if (scan.pageType === 'hospital' || /hospital|revive/.test((scan.textSample || '').toLowerCase())) {
      const list = scan.players.length ? scan.players : (scan.subject && scan.subject.id ? [scan.subject] : []);
      list.slice(0, 80).forEach(p => out.push({id:p.id, name:p.name, status:'Hospital', priority:'Normal', timeLeft:firstMatch(p.context || scan.textSample, /(\d+\s*(?:h|m|s|hours?|minutes?))/i), notes:'Auto hospital/revive detection'}));
    }
    return out;
  }

  function buildOnboardingSteps(scan) {
    const steps = [{step:'scanner_installed', status:'complete', evidence:'v' + VERSION}, {step:'scanner_seen_page', status:'complete', evidence:scan.pageType}];
    if (state.cfg.scannerToken) steps.push({step:'hq_connected', status:'complete', evidence:'token configured'});
    if (state.cfg.apiEnabled && state.cfg.tornApiKey) steps.push({step:'api_configured_locally', status:'complete', evidence:'local key present'});
    if (state.api.lastSnapshot) steps.push({step:'api_snapshot_created', status:'complete', evidence:state.api.lastSnapshot.type});
    return steps;
  }

  function buildScannerHealth(scan) {
    return {version:VERSION, installId:state.cfg.installId || '', hqConnected:!!state.cfg.scannerToken, autoEnrichment:!!state.cfg.autoEnrichmentEnabled, apiCallsSession:state.api.callsThisSession, errorCount:state.errorCount, lastPageType:scan.pageType, lastUrl:scan.url, settings:{apiEnabled:state.cfg.apiEnabled, autoEnrichmentEnabled:state.cfg.autoEnrichmentEnabled, autoSubmit:state.cfg.autoSubmit, enableBadges:state.cfg.enableBadges, uiMode:state.cfg.uiMode, deepScannerEnabled:state.cfg.deepScannerEnabled}};
  }

  function buildDiscordTriggers(scan, readiness, warReadiness, hospitalSupport) {
    const out = [];
    if (hospitalSupport && hospitalSupport.length) out.push({type:'hospital_detected', priority:'high', title:'Hospital/Revive scan', message:hospitalSupport.length + ' possible hospital entries detected.', tornId:state.cfg.memberTornId, name:state.cfg.memberName});
    if (scan.attackResult) out.push({type:'attack_logged', priority:'normal', title:'Attack result logged', message:(scan.attackResult.result || 'Attack result') + ' detected by scanner.', tornId:state.cfg.memberTornId, name:state.cfg.memberName});
    if (warReadiness && warReadiness.score < 40) out.push({type:'low_readiness', priority:'normal', title:'Low war readiness', message:'Member readiness score ' + warReadiness.score + '. Blockers: ' + (warReadiness.blockers || []).join(', '), tornId:state.cfg.memberTornId, name:state.cfg.memberName});
    return out;
  }

  async function submitScannerHealth(trigger) {
    const scan = state.lastScan || scanCurrentPage();
    return apiCall('scannerSubmitScannerHealth', {scannerHealth: buildScannerHealth(scan), scan});
  }

  function sanitizeApiRate(value) {
    const n = Number(value);
    if (!isFinite(n) || n <= 0) return 0.2;
    return Math.min(1, Math.max(0.05, Math.round(n * 100) / 100));
  }

  function clampInt(value, min, max, fallback) {
    const n = parseInt(value, 10);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function getApiIntervalMs() {
    const rate = sanitizeApiRate(state.cfg.apiRatePerSecond);
    return Math.max(1000, Math.ceil(1000 / rate));
  }

  function ensureApiConfigured() {
    if (!state.cfg.apiEnabled) throw new Error('Enable Torn API in scanner settings first.');
    if (!state.cfg.tornApiKey) throw new Error('Paste your Torn API key in scanner settings first.');
  }

  function buildTornApiUrl(section, id, selections) {
    const cleanSection = String(section || 'user').replace(/[^a-z]/gi, '').toLowerCase() || 'user';
    const cleanId = String(id || '').replace(/[^0-9]/g, '');
    const cleanSelections = String(selections || 'profile').replace(/[^a-z0-9_,]/gi, '') || 'profile';
    const path = cleanSection + (cleanId ? '/' + encodeURIComponent(cleanId) : '');
    return 'https://api.torn.com/' + path + '?selections=' + encodeURIComponent(cleanSelections) + '&key=' + encodeURIComponent(state.cfg.tornApiKey);
  }

  function queueTornApiRequest(meta) {
    ensureApiConfigured();
    return new Promise((resolve, reject) => {
      state.api.queue.push({meta: meta || {}, resolve: resolve, reject: reject});
      drainTornApiQueue();
      renderPanel();
    });
  }

  function drainTornApiQueue() {
    if (state.api.draining) return;
    state.api.draining = true;
    const next = () => {
      const job = state.api.queue.shift();
      if (!job) {
        state.api.draining = false;
        renderPanel();
        return;
      }
      const wait = Math.max(0, getApiIntervalMs() - (Date.now() - state.api.lastCallAt));
      setTimeout(() => {
        state.api.lastCallAt = Date.now();
        const m = job.meta || {};
        const url = buildTornApiUrl(m.section || 'user', m.id || '', m.selections || 'profile');
        state.api.lastApiStatus = 'API calling ' + (m.label || (m.section || 'user')) + '...';
        renderPanel();
        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          timeout: 30000,
          onload: function(res) {
            let data = null;
            try { data = JSON.parse(res.responseText); }
            catch (err) {
              state.api.lastApiError = 'Non-JSON Torn API response.';
              job.reject(new Error('Non-JSON Torn API response. HTTP ' + res.status));
              return next();
            }
            state.api.callsThisSession++;
            if (data && data.error) {
              const msg = 'Torn API error ' + (data.error.code || '?') + ': ' + (data.error.error || 'Unknown error');
              state.api.lastApiError = msg;
              state.api.lastApiStatus = msg;
              job.reject(new Error(msg));
              return next();
            }
            state.api.lastApiError = '';
            state.api.lastApiStatus = 'API OK: ' + (m.label || m.section || 'request');
            job.resolve({meta: m, data: data, fetchedAt: new Date().toISOString()});
            next();
          },
          onerror: function(err) {
            const msg = 'Torn API network error: ' + JSON.stringify(err);
            state.api.lastApiError = msg;
            state.api.lastApiStatus = msg;
            job.reject(new Error(msg));
            next();
          },
          ontimeout: function() {
            const msg = 'Torn API request timed out.';
            state.api.lastApiError = msg;
            state.api.lastApiStatus = msg;
            job.reject(new Error(msg));
            next();
          }
        });
      }, wait);
    };
    next();
  }

  async function fetchMyApiSnapshot(verbose) {
    try {
      ensureApiConfigured();
      logStatus('Fetching your Torn API snapshot...');
      const result = await queueTornApiRequest({section: 'user', id: '', selections: state.cfg.apiOwnSelections, label: 'me'});
      state.api.lastSnapshot = {
        type: 'ownUser',
        fetchedAt: result.fetchedAt,
        endpoint: 'user',
        selections: state.cfg.apiOwnSelections,
        subjectId: state.cfg.memberTornId,
        subjectName: state.cfg.memberName,
        ratePerSecond: sanitizeApiRate(state.cfg.apiRatePerSecond),
        data: result.data,
        summary: summarizeApiData(result.data, 'me')
      };
      logStatus(state.api.lastSnapshot.summary, true);
      if (verbose) notify('ShadowCore API', 'Own API snapshot updated.');
      renderPanel();
      return state.api.lastSnapshot;
    } catch (err) {
      logStatus(err.message, false);
      renderPanel();
      throw err;
    }
  }

  async function fetchVisiblePlayersApi(verbose) {
    try {
      ensureApiConfigured();
      const scan = state.lastScan || scanCurrentPage();
      const players = (scan.players || []).filter(p => p.id).slice(0, clampInt(state.cfg.apiVisibleLimit, 1, 25, 5));
      if (!players.length) throw new Error('No visible player links found on this page.');
      logStatus('Fetching Torn API for ' + players.length + ' visible players at max ' + sanitizeApiRate(state.cfg.apiRatePerSecond) + '/s...');
      const out = [];
      for (const p of players) {
        const result = await queueTornApiRequest({section: 'user', id: p.id, selections: state.cfg.apiPlayerSelections, label: p.name || p.id});
        out.push({id: p.id, name: p.name, fetchedAt: result.fetchedAt, selections: state.cfg.apiPlayerSelections, data: result.data});
      }
      state.api.lastSnapshot = {
        type: 'visiblePlayers',
        fetchedAt: new Date().toISOString(),
        endpoint: 'user/{id}',
        selections: state.cfg.apiPlayerSelections,
        subjectId: scan.subject && scan.subject.id,
        subjectName: scan.subject && scan.subject.name,
        ratePerSecond: sanitizeApiRate(state.cfg.apiRatePerSecond),
        visiblePlayers: out,
        data: {players: out},
        summary: 'API OK: ' + out.length + ' visible players fetched.'
      };
      scan.apiEnrichments = out;
      state.lastScan = scan;
      logStatus(state.api.lastSnapshot.summary, true);
      if (verbose) notify('ShadowCore API', 'Visible-player API snapshot updated.');
      renderPanel();
      return state.api.lastSnapshot;
    } catch (err) {
      logStatus(err.message, false);
      renderPanel();
      throw err;
    }
  }

  function summarizeApiData(data, fallback) {
    if (!data || typeof data !== 'object') return 'API OK: ' + fallback;
    const parts = [];
    if (data.name) parts.push(data.name);
    if (data.player_id) parts.push('#' + data.player_id);
    if (data.status && data.status.state) parts.push(data.status.state);
    if (data.energy && data.energy.current !== undefined) parts.push('E ' + data.energy.current + '/' + data.energy.maximum);
    if (data.nerve && data.nerve.current !== undefined) parts.push('N ' + data.nerve.current + '/' + data.nerve.maximum);
    if (data.happy && data.happy.current !== undefined) parts.push('H ' + data.happy.current + '/' + data.happy.maximum);
    return parts.length ? 'API OK: ' + parts.join(' | ') : 'API OK: ' + fallback;
  }

  async function submitApiSnapshot(showSuccess) {
    try {
      ensureConfigured();
      if (!state.cfg.apiSubmitSnapshots) throw new Error('Enable “Allow sending API snapshot data” in settings first.');
      if (!state.api.lastSnapshot) throw new Error('Fetch an API snapshot first.');
      ensureConfigured();
      const res = await apiCall('scannerSubmitApiSnapshot', {
        apiSnapshot: trimApiSnapshot(state.api.lastSnapshot),
        apiRatePerSecond: sanitizeApiRate(state.cfg.apiRatePerSecond),
        apiSelections: state.api.lastSnapshot.selections || '',
        notes: 'Submitted from Tampermonkey local Torn API. API key was not sent.'
      });
      logStatus('API snapshot sent to HQ: ' + (res.snapshotId || 'saved'), true);
      if (showSuccess !== false) notify('ShadowCore API', 'API snapshot sent to HQ.');
      return res;
    } catch (err) {
      logStatus(err.message, false);
      throw err;
    }
  }

  function trimApiSnapshot(snapshot) {
    const copy = JSON.parse(JSON.stringify(snapshot || {}));
    delete copy.apiKey;
    const asText = JSON.stringify(copy);
    if (asText.length <= 60000) return copy;
    return {
      type: copy.type,
      fetchedAt: copy.fetchedAt,
      endpoint: copy.endpoint,
      selections: copy.selections,
      subjectId: copy.subjectId,
      subjectName: copy.subjectName,
      ratePerSecond: copy.ratePerSecond,
      summary: copy.summary,
      truncated: true,
      dataPreview: asText.slice(0, 58000)
    };
  }

  function updateApiPoller() {
    if (!state || !state.api) return;
    if (state.api.pollTimer) {
      clearInterval(state.api.pollTimer);
      state.api.pollTimer = null;
    }
    if (state.cfg && state.cfg.apiEnabled && state.cfg.tornApiKey && state.cfg.apiAutoPoll) {
      state.api.pollTimer = setInterval(() => {
        fetchMyApiSnapshot(false).catch(err => console.warn('[ShadowCore API poll]', err.message));
      }, getApiIntervalMs());
    }
  }

  function toggleApiPolling() {
    if (!state.cfg.apiEnabled || !state.cfg.tornApiKey) {
      showSettingsModal();
      logStatus('Enable API and paste your key first.', false);
      return;
    }
    saveConfig({apiAutoPoll: !state.cfg.apiAutoPoll});
    notify('ShadowCore API', state.cfg.apiAutoPoll ? 'API polling started.' : 'API polling stopped.');
  }

  function showModal(html, afterRender) {
    closeModal();
    const wrap = document.createElement('div');
    wrap.id = 'sc-modal-wrap';
    wrap.innerHTML = `<div id="sc-modal"><button id="sc-modal-x">×</button>${html}</div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', ev => { if (ev.target === wrap || ev.target.getAttribute('data-close')) closeModal(); });
    wrap.querySelector('#sc-modal-x').addEventListener('click', closeModal);
    if (afterRender) afterRender(wrap);
  }

  function closeModal() {
    const old = document.getElementById('sc-modal-wrap');
    if (old) old.remove();
  }

  function ensureConfigured() {
    if (!state.cfg.backendUrl) throw new Error('Set your HQ Backend URL first.');
    if (!state.cfg.scannerToken) throw new Error('Set your Scanner Shared Token first.');
    if (!state.cfg.memberTornId) throw new Error('Set your Torn ID first.');
    if (!state.cfg.memberName) throw new Error('Set your Torn name first.');
  }

  function extractIdFromUrl(url, param) {
    try {
      const u = new URL(url, location.origin);
      return u.searchParams.get(param) || firstMatch(u.hash || '', new RegExp(param + '=(\\d+)', 'i')) || '';
    } catch (e) {
      return firstMatch(String(url), new RegExp(param + '=(\\d+)', 'i')) || '';
    }
  }

  function extractHashId(param) {
    return firstMatch(location.hash || '', new RegExp(param + '=(\\d+)', 'i')) || '';
  }

  function guessProfileName() {
    const selectors = ['h4', 'h1', '[class*="title"]', '[class*="name"]'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const t = cleanName(el && el.textContent);
      if (t && t.length < 80 && !/torn|profile/i.test(t)) return t;
    }
    return '';
  }

  function guessFactionName() {
    const selectors = ['h1', 'h4', '[class*="faction"] [class*="name"]', '[class*="title"]'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const t = cleanName(el && el.textContent);
      if (t && t.length < 100 && !/torn|faction/i.test(t)) return t;
    }
    return '';
  }

  function closestUsefulText(a) {
    let node = a;
    for (let i = 0; i < 5 && node; i++, node = node.parentElement) {
      const text = getCleanText(node);
      if (text.length > 20 && text.length < 1200) return node;
    }
    return a;
  }

  function guessStatus(text) {
    const low = String(text || '').toLowerCase();
    if (low.includes('hospital')) return 'Hospital';
    if (low.includes('jail')) return 'Jail';
    if (low.includes('travel') || low.includes('abroad')) return 'Traveling';
    if (low.includes('okay') || low.includes('ok')) return 'Okay';
    if (low.includes('offline')) return 'Offline';
    if (low.includes('online')) return 'Online';
    if (low.includes('idle')) return 'Idle';
    return '';
  }

  function firstMatch(text, re) {
    const m = String(text || '').match(re);
    return m ? (m[1] || m[0]) : '';
  }

  function getCleanText(el) {
    return (el && el.innerText || el && el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function cleanName(text) {
    return String(text || '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function escapeAttr(s) { return escapeHtml(s).replace(/`/g, '&#96;'); }

  function addStyles() {
    GM_addStyle(`
      #sc-hq-panel{position:fixed;bottom:14px;z-index:2147483647;width:320px;background:#071017;color:#e5e7eb;border:1px solid #1f3a4a;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:13px/1.35 Arial,Helvetica,sans-serif;overflow:hidden}
      #sc-hq-panel.sc-right{right:14px} #sc-hq-panel.sc-left{left:14px}
      #sc-hq-panel .sc-head{display:flex;align-items:center;justify-content:space-between;gap:6px;background:#0f172a;padding:9px 10px;font-weight:700;color:#fff}
      #sc-hq-panel .sc-head span{flex:1} #sc-hq-panel button,#sc-modal button{border:1px solid #334155;background:#111827;color:#e5e7eb;border-radius:8px;padding:5px 8px;cursor:pointer;font-size:12px}
      #sc-hq-panel button:hover,#sc-modal button:hover{background:#1f2937}
      #sc-hq-panel .sc-body{padding:10px}.sc-row{margin:4px 0}.sc-muted{color:#94a3b8;margin-left:8px}.sc-warn{color:#fbbf24;font-weight:700;margin-left:6px}
      .sc-card{background:#0b1220;border:1px solid #263244;border-radius:10px;padding:7px;margin:7px 0}.sc-actions{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.sc-actions button{flex:1 1 30%}.sc-actions-secondary button{flex:1 1 45%}.sc-status{min-height:18px;margin-top:8px;color:#94a3b8}.sc-api-mini{margin:5px 0;padding:5px 7px;border-radius:8px;background:#071b22;border:1px solid #164e63;color:#bae6fd;font-size:12px}.sc-good{color:#86efac}.sc-bad{color:#fca5a5}
      #sc-hq-panel.sc-compact .sc-body{display:none}#sc-hq-panel.sc-compact{width:230px}
      .sc-badge{display:inline-block;margin-left:4px;padding:1px 5px;border-radius:999px;font-size:10px;font-weight:700;vertical-align:middle;color:#fff}.sc-target{background:#2563eb}.sc-avoid{background:#b91c1c}.sc-safe{background:#15803d}.sc-intel{background:#7c3aed}.sc-recruit{background:#d97706}
      #sc-modal-wrap{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483647;display:flex;align-items:center;justify-content:center}
      #sc-modal{position:relative;width:min(520px,92vw);max-height:86vh;overflow:auto;background:#071017;color:#e5e7eb;border:1px solid #1f3a4a;border-radius:16px;box-shadow:0 16px 60px rgba(0,0,0,.65);padding:18px;font:14px/1.4 Arial,Helvetica,sans-serif}
      #sc-modal-x{position:absolute;right:12px;top:10px}#sc-modal h2{margin:0 32px 12px 0;font-size:20px;color:#fff}
      #sc-modal label{display:block;margin:10px 0;color:#cbd5e1}#sc-modal input,#sc-modal textarea,#sc-modal select{box-sizing:border-box;width:100%;margin-top:4px;background:#0b1220;color:#e5e7eb;border:1px solid #334155;border-radius:8px;padding:8px}#sc-modal textarea{min-height:90px}
      #sc-modal input[type="checkbox"]{width:auto;margin-right:6px}.sc-modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}.sc-disclosure{background:#0b1220;border:1px solid #334155;border-radius:10px;padding:10px;color:#cbd5e1;margin-top:10px}
    `);
  }

  init();
})();

// ==UserScript==
// @name         ShadowCore HQ PDA Scanner
// @namespace    shadowcore-hq-pda
// @version      2.1.0
// @description  PDA-compliant lightweight ShadowCore HQ scanner/overlay for Torn PDA. Uses PDA_httpGet/PDA_httpPost where available, localStorage settings, optional PDA API key, and safe manual submits.
// @author       ShadowCore
// @match        https://www.torn.com/*
// @match        https://torn.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const VERSION = '2.1.0-pda';
  const PDA_API_KEY = '###PDA-APIKEY###';
  const DEFAULT_BACKEND_URL = 'https://script.google.com/macros/s/AKfycbz40HM-fe5dbjZNYpcYBSep2i5iHNuwyqERTc2veqVuXC78mYOH9c8H5kTmUgkX8Cc5/exec';
  const STORAGE_KEY = 'SC_PDA_SCANNER_CFG_V2';
  const LAST_SCAN_KEY = 'SC_PDA_SCANNER_LAST_SCAN';
  const isPDA = () => typeof PDA_httpGet === 'function' && typeof PDA_httpPost === 'function';
  const hasInjectedPdaKey = () => !/^###.+###$/.test(PDA_API_KEY || '');

  const DEFAULTS = {
    backendUrl: DEFAULT_BACKEND_URL,
    scannerToken: '',
    memberTornId: '',
    memberName: '',
    panelEnabled: true,
    compact: true,
    autoBadges: true,
    autoSubmit: false,
    autoEnrichment: false,
    apiEnabled: false,
    apiKey: '',
    usePdaKey: true,
    apiRatePerSecond: 0.2,
    apiOwnSelections: 'profile,bars,cooldowns,travel,icons',
    apiVisibleSelections: 'profile',
    apiVisibleLimit: 5,
    apiSubmitSnapshots: false,
    lastApiCallAt: 0,
    lastStatus: 'Ready',
    installId: ''
  };

  let cfg = loadCfg();
  let panel = null;
  let lastScan = null;
  let lastContext = null;
  let lastPageKey = '';
  let lastAutoSubmitKey = '';
  let apiQueue = Promise.resolve();
  let apiPollTimer = null;

  function loadCfg() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      const merged = Object.assign({}, DEFAULTS, data || {});
      if (!merged.backendUrl) merged.backendUrl = DEFAULT_BACKEND_URL;
      if (!merged.installId) merged.installId = 'SCPDA-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      return merged;
    } catch (e) {
      return Object.assign({}, DEFAULTS, {installId: 'SCPDA-' + Math.random().toString(36).slice(2, 10).toUpperCase()});
    }
  }

  function saveCfg(partial) {
    cfg = Object.assign({}, cfg, partial || {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    updateApiPoller();
    render();
  }

  function getApiKey() {
    if (cfg.usePdaKey && hasInjectedPdaKey()) return PDA_API_KEY;
    return String(cfg.apiKey || '').trim();
  }

  function addStyle(css) {
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  function init() {
    addStyle(`
      #sc-pda-fab{position:fixed;right:10px;bottom:78px;z-index:2147483647;background:#111923;color:#fff;border:1px solid #32465a;border-radius:999px;padding:10px 12px;font-weight:800;font-size:13px;box-shadow:0 4px 18px rgba(0,0,0,.45)}
      #sc-pda-panel{position:fixed;right:8px;bottom:122px;width:min(92vw,360px);max-height:70vh;overflow:auto;z-index:2147483647;background:#081018;color:#e7eef7;border:1px solid #33465b;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.55);font:12px Arial,sans-serif;display:none}
      #sc-pda-panel.sc-open{display:block}
      #sc-pda-panel .sc-head{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:9px 10px;background:#111923;border-radius:12px 12px 0 0;border-bottom:1px solid #26394d;font-weight:800}
      #sc-pda-panel .sc-body{padding:9px 10px}.sc-muted{color:#9db0c4}.sc-row{margin:4px 0}.sc-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
      #sc-pda-panel button{background:#1e344a;color:#fff;border:1px solid #42607a;border-radius:8px;padding:8px 6px;font-size:12px;font-weight:700;min-height:34px}
      #sc-pda-panel button.sc-wide{grid-column:1 / -1}.sc-good{color:#6ee7a9}.sc-warn{color:#ffd166}.sc-bad{color:#ff7b7b}.sc-pill{display:inline-block;margin:2px;padding:2px 5px;border:1px solid #37516a;border-radius:999px;background:#132437;color:#dbeafe;font-size:11px}
      .sc-pda-badge{display:inline-block;margin-left:4px;padding:1px 4px;border-radius:4px;background:#16283b;color:#9ee6ff;border:1px solid #33546f;font-size:10px;font-weight:800;vertical-align:middle}.sc-pda-badge.sc-avoid{background:#44151a;color:#ffb4b4}.sc-pda-badge.sc-safe{background:#143e2a;color:#a5ffd2}.sc-pda-badge.sc-recruit{background:#3f2a10;color:#ffd991}
      #sc-pda-modal{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:12px}#sc-pda-modal>div{background:#0b1520;color:#e7eef7;border:1px solid #34506a;border-radius:12px;padding:12px;width:min(94vw,390px);max-height:86vh;overflow:auto}#sc-pda-modal label{display:block;margin-top:9px;color:#bcd0e5;font-size:12px}#sc-pda-modal input,#sc-pda-modal textarea{width:100%;box-sizing:border-box;background:#111f2d;color:#fff;border:1px solid #37516a;border-radius:8px;padding:8px}#sc-pda-modal .sc-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}#sc-pda-modal button{background:#1e344a;color:#fff;border:1px solid #42607a;border-radius:8px;padding:9px;font-weight:800}
    `);
    createUi();
    runUpdate();
    setInterval(checkPageChange, 1800);
    updateApiPoller();
  }

  function createUi() {
    const fab = document.createElement('button');
    fab.id = 'sc-pda-fab';
    fab.textContent = '🕶 HQ';
    fab.addEventListener('click', () => panel.classList.toggle('sc-open'));
    document.body.appendChild(fab);
    panel = document.createElement('div');
    panel.id = 'sc-pda-panel';
    document.body.appendChild(panel);
    render();
  }

  function render() {
    if (!panel) return;
    if (!cfg.panelEnabled) { panel.style.display = 'none'; return; }
    panel.style.display = '';
    const scan = lastScan || scanPage();
    const contextText = lastContext ? 'HQ linked' : (cfg.scannerToken ? 'Token set' : 'Needs token');
    const apiKeyState = getApiKey() ? 'key found' : 'no key';
    const apiState = cfg.apiEnabled ? ('API on, ' + sanitizeRate(cfg.apiRatePerSecond) + '/s, ' + apiKeyState) : 'API off';
    const assn = getAssignmentText();
    panel.innerHTML = `
      <div class="sc-head"><span>🕶 ShadowCore PDA</span><button data-a="close">×</button></div>
      <div class="sc-body">
        <div class="sc-row"><b>Page:</b> ${esc(scan.pageType)} <span class="sc-muted">${scan.players.length} players</span></div>
        <div class="sc-row"><b>HQ:</b> ${esc(contextText)}</div>
        <div class="sc-row"><b>API:</b> ${esc(apiState)}</div>
        <div class="sc-row"><b>Assignment:</b> ${esc(assn)}</div>
        <div class="sc-row sc-muted">${esc(cfg.lastStatus || 'Ready')}</div>
        ${renderPlayerPills(scan.players)}
        <div class="sc-grid">
          <button data-a="scan">Scan</button><button data-a="send">Send Scan</button>
          <button data-a="ctx">Refresh HQ</button><button data-a="note">Add Note</button>
          <button data-a="recruit">Recruit Lead</button><button data-a="support">Support</button>
          <button data-a="checkin">War Check-In</button><button data-a="attack">Log Attack</button>
          <button data-a="apime">API Me</button><button data-a="apivis">API Visible</button>
          <button data-a="apisend" class="sc-wide">Send API Snapshot</button>
          <button data-a="settings" class="sc-wide">Settings</button>
          <button data-a="open" class="sc-wide">Open HQ</button>
        </div>
      </div>`;
    panel.querySelectorAll('button[data-a]').forEach(btn => btn.addEventListener('click', handleButton));
  }

  function renderPlayerPills(players) {
    if (!players || !players.length) return '<div class="sc-muted">No visible Torn profile links found.</div>';
    return '<div>' + players.slice(0, 8).map(p => `<span class="sc-pill">${esc(p.name || 'Player')} [${esc(p.id)}]</span>`).join('') + (players.length > 8 ? `<span class="sc-pill">+${players.length - 8}</span>` : '') + '</div>';
  }

  async function handleButton(ev) {
    const a = ev.currentTarget.getAttribute('data-a');
    try {
      if (a === 'close') panel.classList.remove('sc-open');
      if (a === 'scan') { lastScan = scanPage(); setStatus('Scanned ' + lastScan.players.length + ' players.'); render(); }
      if (a === 'send') await submitScan('manual');
      if (a === 'ctx') await refreshContext();
      if (a === 'note') await addNoteFlow();
      if (a === 'recruit') await recruitLeadFlow();
      if (a === 'support') await supportFlow();
      if (a === 'checkin') await checkinFlow();
      if (a === 'attack') await attackLogFlow();
      if (a === 'apime') await apiMeFlow(false);
      if (a === 'apivis') await apiVisibleFlow(false);
      if (a === 'apisend') await sendLatestApiSnapshot();
      if (a === 'settings') showSettings();
      if (a === 'open') window.open(cfg.backendUrl || DEFAULT_BACKEND_URL, '_blank');
    } catch (err) {
      setStatus('Failed: ' + (err && err.message ? err.message : String(err)));
    }
  }

  function setStatus(s) { cfg.lastStatus = s; localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); render(); toast(s); }
  function toast(s) { try { console.log('[ShadowCore PDA]', s); } catch(e) {} }

  function checkPageChange() {
    const key = location.href + '|' + document.title;
    if (key !== lastPageKey) { lastPageKey = key; setTimeout(runUpdate, 450); }
  }

  async function runUpdate() {
    lastScan = scanPage();
    render();
    if (cfg.autoBadges && cfg.scannerToken) refreshContext().catch(()=>{});
    if (cfg.autoSubmit && cfg.scannerToken) {
      const key = lastScan.pageType + '|' + lastScan.url + '|' + lastScan.players.map(p => p.id).join(',');
      if (key !== lastAutoSubmitKey) { lastAutoSubmitKey = key; submitScan('auto').catch(()=>{}); }
    }
  }

  function scanPage() {
    const url = location.href;
    const pageType = detectPageType(url, document.title);
    const players = extractPlayers();
    const subject = detectSubject(url, players);
    const textSample = safeText(document.body ? document.body.innerText : '').slice(0, 1800);
    const market = detectMarketItems();
    const status = detectStatusText(textSample);
    const scan = {version: VERSION, pda: true, platform: isPDA() ? 'TornPDA' : 'Browser', pageType, url, title: document.title || '', timestamp: new Date().toISOString(), subject, players, market, status, textSample};
    try { localStorage.setItem(LAST_SCAN_KEY, JSON.stringify(scan)); } catch(e) {}
    return scan;
  }

  function detectPageType(url, title) {
    const u = url.toLowerCase();
    if (u.includes('profiles.php')) return 'profile';
    if (u.includes('factions.php')) return 'faction';
    if (u.includes('forums.php')) return 'forum';
    if (u.includes('hospital')) return 'hospital';
    if (u.includes('bazaar') || u.includes('itemmarket') || u.includes('market')) return 'market';
    if (u.includes('travel')) return 'travel';
    if (u.includes('loader.php') && u.includes('attack')) return 'attack';
    if (u.includes('crimes')) return 'crime';
    if (u.includes('companies')) return 'company';
    if (u.includes('trade')) return 'trade';
    return 'general';
  }

  function extractPlayers() {
    const map = new Map();
    const anchors = Array.from(document.querySelectorAll('a[href*="profiles.php?XID="], a[href*="profiles.php?xid="], a[href*="XID="]'));
    anchors.forEach(a => {
      const id = extractId(a.href);
      if (!id || id.length > 10) return;
      const name = safeText(a.textContent).replace(/\[[0-9]+\]/g, '').trim() || a.getAttribute('title') || '';
      const rowText = safeText(nearestText(a));
      if (!map.has(id)) map.set(id, {id, name, profileUrl: normalizeProfileUrl(id), statusText: detectStatusText(rowText), level: extractLevel(rowText), rowText: rowText.slice(0, 450)});
    });
    const profileId = extractId(location.href);
    if (profileId && !map.has(profileId)) map.set(profileId, {id: profileId, name: guessProfileName(), profileUrl: normalizeProfileUrl(profileId), statusText: detectStatusText(document.body.innerText || ''), level: extractLevel(document.body.innerText || '')});
    return Array.from(map.values()).slice(0, 150);
  }

  function extractId(href) {
    const m = String(href || '').match(/[?&](?:XID|xid)=([0-9]+)/) || String(href || '').match(/profiles\.php\?XID=([0-9]+)/i);
    return m ? m[1] : '';
  }

  function normalizeProfileUrl(id) { return 'https://www.torn.com/profiles.php?XID=' + encodeURIComponent(id); }
  function guessProfileName() {
    const h = document.querySelector('h1, h2, .profile-name, [class*="name"]');
    return safeText(h ? h.textContent : document.title).replace(/\|.*$/, '').trim();
  }

  function nearestText(el) {
    let n = el;
    for (let i = 0; i < 4 && n; i++, n = n.parentElement) {
      const t = safeText(n.innerText || n.textContent || '');
      if (t.length > 20) return t;
    }
    return el.textContent || '';
  }

  function extractLevel(text) {
    const m = String(text || '').match(/\bLevel\s*:?\s*([0-9]{1,3})\b/i);
    return m ? m[1] : '';
  }

  function detectStatusText(text) {
    const t = String(text || '').toLowerCase();
    if (t.includes('hospital')) return 'hospital';
    if (t.includes('jail')) return 'jail';
    if (t.includes('traveling') || t.includes('abroad') || t.includes('in flight')) return 'travel/abroad';
    if (t.includes('okay') || t.includes('okay')) return 'okay';
    if (t.includes('online')) return 'online';
    if (t.includes('offline')) return 'offline';
    return '';
  }

  function detectSubject(url, players) {
    const id = extractId(url);
    if (id) return {type: 'player', id, name: guessProfileName()};
    const f = String(url).match(/[?&](?:ID|id)=([0-9]+)/);
    if (String(url).toLowerCase().includes('factions.php') && f) return {type: 'faction', id: f[1], name: guessFactionName()};
    return {type: '', id: '', name: ''};
  }

  function guessFactionName() {
    const h = document.querySelector('h1, h2, [class*="faction"] [class*="name"]');
    return safeText(h ? h.textContent : document.title).replace(/\|.*$/, '').trim();
  }

  function detectMarketItems() {
    if (!/bazaar|market|item/i.test(location.href)) return [];
    const text = safeText(document.body ? document.body.innerText : '');
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    const out = [];
    lines.slice(0, 100).forEach(line => {
      const price = line.match(/\$[0-9][0-9,]*/);
      if (price && line.length < 180) out.push({line, price: price[0]});
    });
    return out.slice(0, 30);
  }

  function safeText(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  async function hqPost(action, payload) {
    if (!cfg.backendUrl) throw new Error('Missing HQ URL');
    const body = Object.assign({}, payload || {}, {
      action,
      scannerToken: cfg.scannerToken,
      memberTornId: cfg.memberTornId,
      memberName: cfg.memberName,
      member: {tornId: cfg.memberTornId, name: cfg.memberName},
      userScriptVersion: VERSION,
      pda: true,
      installId: cfg.installId,
      url: location.href
    });
    const headers = {'Content-Type': 'application/json'};
    let res;
    if (isPDA()) {
      res = await PDA_httpPost(cfg.backendUrl, headers, JSON.stringify(body));
    } else if (typeof GM_xmlhttpRequest === 'function') {
      res = await new Promise((resolve, reject) => GM_xmlhttpRequest({method: 'POST', url: cfg.backendUrl, headers, data: JSON.stringify(body), timeout: 30000, onload: resolve, onerror: reject, ontimeout: () => reject(new Error('Timeout'))}));
    } else {
      const f = await fetch(cfg.backendUrl, {method: 'POST', headers, body: JSON.stringify(body), credentials: 'omit'});
      res = {status: f.status, responseText: await f.text(), statusText: f.statusText};
    }
    let data;
    try { data = JSON.parse(res.responseText || '{}'); }
    catch (e) { throw new Error('Non-JSON response from HQ. HTTP ' + (res.status || '?')); }
    if (data.ok === false) throw new Error(data.error || 'HQ rejected request');
    return data.result !== undefined ? data.result : data;
  }

  async function submitScan(mode) {
    lastScan = lastScan || scanPage();
    const result = await hqPost('scannerSubmitPageScan', {scan: lastScan, pageType: lastScan.pageType, mode: mode || 'manual', players: lastScan.players, subject: lastScan.subject, payload: lastScan});
    setStatus('Scan sent to HQ.');
    return result;
  }

  async function refreshContext() {
    const scan = lastScan || scanPage();
    const result = await hqPost('scannerGetOverlayContext', {pageType: scan.pageType, players: scan.players.slice(0, 60), visiblePlayers: scan.players.slice(0, 60), subject: scan.subject});
    lastContext = result;
    applyBadges(scan, result);
    setStatus('HQ context refreshed.');
    return result;
  }

  function applyBadges(scan, ctx) {
    if (!ctx || !scan || !scan.players) return;
    const notes = [].concat(ctx.profileNotes || [], ctx.enemyPlayers || [], ctx.warTargets || [], ctx.recruitLeads || []);
    const byId = {};
    notes.forEach(n => {
      const id = String(n.Player_ID || n.Torn_ID || n.Enemy_ID || n.Target_ID || n.ID || '').trim();
      if (!id) return;
      const tag = String(n.Tag || n.Rating || n.Priority || n.Status || n.Category || 'Intel').slice(0, 12);
      byId[id] = tag;
    });
    document.querySelectorAll('a[href*="profiles.php?XID="], a[href*="profiles.php?xid="]').forEach(a => {
      const id = extractId(a.href);
      if (!id || !byId[id] || a.nextSibling && a.nextSibling.classList && a.nextSibling.classList.contains('sc-pda-badge')) return;
      const span = document.createElement('span');
      const tag = byId[id];
      span.className = 'sc-pda-badge ' + (/avoid|do not/i.test(tag) ? 'sc-avoid' : /safe/i.test(tag) ? 'sc-safe' : /recruit/i.test(tag) ? 'sc-recruit' : '');
      span.textContent = tag;
      a.insertAdjacentElement('afterend', span);
    });
  }

  function getAssignmentText() {
    if (!lastContext || !lastContext.myAssignments || !lastContext.myAssignments.length) return 'None';
    const a = lastContext.myAssignments[0];
    return (a.Target_Name || a.Enemy_Name || a.Name || a.Target_ID || 'Target') + ' ' + (a.Priority ? '(' + a.Priority + ')' : '');
  }

  async function addNoteFlow() {
    const scan = lastScan || scanPage();
    const p = choosePlayer(scan);
    if (!p) return;
    const category = prompt('Note category? safe / risky / avoid / recruit / general', 'general') || 'general';
    const rating = prompt('Rating/tag? Safe, Risky, Avoid, Recruit, Intel', category) || category;
    const note = prompt('Note for ' + (p.name || p.id) + ':', '') || '';
    if (!note.trim() && !rating.trim()) return;
    await hqPost('scannerAddProfileNote', {playerId: p.id, playerName: p.name, category, rating, note, sourceUrl: location.href});
    setStatus('Profile note sent.');
  }

  async function recruitLeadFlow() {
    const scan = lastScan || scanPage();
    const p = choosePlayer(scan);
    if (!p) return;
    const notes = prompt('Recruit lead notes:', '') || '';
    await hqPost('scannerSubmitRecruitLead', {lead: {Torn_ID: p.id, Name: p.name, Level: p.level, Source: scan.pageType, Notes: notes, Source_URL: location.href}, player: p, notes});
    setStatus('Recruit lead sent.');
  }

  async function supportFlow() {
    const type = prompt('Support type? revive / meds / xanax / weapon / armor / loan / target / other', 'revive') || 'other';
    const notes = prompt('Support request notes:', '') || '';
    await hqPost('scannerRequestSupport', {requestType: type, notes, scan: lastScan || scanPage(), urgency: /revive|target/i.test(type) ? 'High' : 'Normal'});
    setStatus('Support request sent.');
  }

  async function checkinFlow() {
    const available = prompt('War availability? yes / limited / no', 'yes') || 'yes';
    const windows = prompt('Time windows / notes:', '') || '';
    await hqPost('scannerWarCheckin', {available, windows, canHit: /yes|limited/i.test(available), canChain: /yes|limited/i.test(available), notes: windows});
    setStatus('War check-in sent.');
  }

  async function attackLogFlow() {
    const scan = lastScan || scanPage();
    const defender = choosePlayer(scan) || {};
    const result = prompt('Attack result? win / loss / stalemate / assist', 'win') || 'win';
    const respect = prompt('Respect gained, if visible:', '') || '';
    const chain = prompt('Chain number, if visible:', '') || '';
    await hqPost('scannerSubmitAttackResult', {attackerId: cfg.memberTornId, attackerName: cfg.memberName, defenderId: defender.id || '', defenderName: defender.name || '', result, respect, chain, scan});
    setStatus('Attack result sent.');
  }

  function choosePlayer(scan) {
    const players = (scan && scan.players || []).slice(0, 20);
    if (!players.length && scan && scan.subject && scan.subject.id) return {id: scan.subject.id, name: scan.subject.name};
    if (players.length === 1) return players[0];
    const list = players.map((p, i) => (i + 1) + '. ' + (p.name || 'Player') + ' [' + p.id + ']').join('\n');
    const n = parseInt(prompt('Choose player number:\n' + list, '1'), 10);
    if (!n || n < 1 || n > players.length) return null;
    return players[n - 1];
  }

  function sanitizeRate(v) {
    const n = Number(v || 0.2);
    return Math.min(1, Math.max(0.05, isFinite(n) ? n : 0.2));
  }

  async function tornApi(path) {
    const key = getApiKey();
    if (!key) throw new Error('No Torn API key. In PDA, make sure API key injection works or paste a key in settings.');
    const minGap = 1000 / sanitizeRate(cfg.apiRatePerSecond);
    apiQueue = apiQueue.then(async () => {
      const wait = Math.max(0, (Number(cfg.lastApiCallAt || 0) + minGap) - Date.now());
      if (wait) await sleep(wait);
      const url = path + (path.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(key);
      let res;
      if (isPDA()) res = await PDA_httpGet(url, {});
      else if (typeof GM_xmlhttpRequest === 'function') res = await new Promise((resolve, reject) => GM_xmlhttpRequest({method: 'GET', url, timeout: 30000, onload: resolve, onerror: reject, ontimeout: () => reject(new Error('Timeout'))}));
      else { const f = await fetch(url); res = {status: f.status, responseText: await f.text(), statusText: f.statusText}; }
      saveCfg({lastApiCallAt: Date.now()});
      let data;
      try { data = JSON.parse(res.responseText || '{}'); } catch (e) { throw new Error('Bad Torn API JSON HTTP ' + (res.status || '?')); }
      if (data.error) throw new Error('Torn API: ' + (data.error.error || data.error.code || JSON.stringify(data.error)));
      return data;
    });
    return apiQueue;
  }

  async function apiMeFlow(sendNow) {
    const selections = encodeURIComponent(cfg.apiOwnSelections || 'profile,bars,cooldowns,travel,icons');
    const data = await tornApi('https://api.torn.com/user/?selections=' + selections);
    const snapshot = {type: 'ownUser', endpoint: 'user', selections: cfg.apiOwnSelections, subjectId: cfg.memberTornId || data.player_id || '', subjectName: cfg.memberName || data.name || '', status: 'OK', summary: summarizeApi(data), payload: stripApiKey(data), url: location.href, ratePerSecond: sanitizeRate(cfg.apiRatePerSecond), timestamp: new Date().toISOString()};
    localStorage.setItem('SC_PDA_LAST_API_SNAPSHOT', JSON.stringify(snapshot));
    setStatus('API Me pulled: ' + snapshot.summary);
    if (sendNow || cfg.apiSubmitSnapshots) await hqPost('scannerSubmitApiSnapshot', {snapshot});
    return snapshot;
  }

  async function apiVisibleFlow(sendNow) {
    const scan = lastScan || scanPage();
    const ids = scan.players.slice(0, Number(cfg.apiVisibleLimit || 5)).map(p => p.id).filter(Boolean);
    const snapshots = [];
    for (const id of ids) {
      const selections = encodeURIComponent(cfg.apiVisibleSelections || 'profile');
      const data = await tornApi('https://api.torn.com/user/' + encodeURIComponent(id) + '?selections=' + selections);
      snapshots.push({id, name: data.name || '', summary: summarizeApi(data), payload: stripApiKey(data)});
    }
    const snapshot = {type: 'visiblePlayers', endpoint: 'user', selections: cfg.apiVisibleSelections, count: snapshots.length, status: 'OK', summary: snapshots.length + ' visible player API snapshots', payload: snapshots, url: location.href, ratePerSecond: sanitizeRate(cfg.apiRatePerSecond), timestamp: new Date().toISOString()};
    localStorage.setItem('SC_PDA_LAST_API_SNAPSHOT', JSON.stringify(snapshot));
    setStatus('API Visible pulled: ' + snapshots.length + ' players.');
    if (sendNow || cfg.apiSubmitSnapshots) await hqPost('scannerSubmitApiSnapshot', {snapshot});
    return snapshot;
  }

  async function sendLatestApiSnapshot() {
    const raw = localStorage.getItem('SC_PDA_LAST_API_SNAPSHOT');
    if (!raw) throw new Error('No API snapshot yet. Tap API Me or API Visible first.');
    await hqPost('scannerSubmitApiSnapshot', {snapshot: JSON.parse(raw)});
    setStatus('API snapshot sent to HQ.');
  }

  function summarizeApi(data) {
    const parts = [];
    if (data.name) parts.push(data.name);
    if (data.status && data.status.state) parts.push(data.status.state);
    if (data.energy && data.energy.current !== undefined) parts.push('E ' + data.energy.current + '/' + data.energy.maximum);
    if (data.happy && data.happy.current !== undefined) parts.push('H ' + data.happy.current + '/' + data.happy.maximum);
    if (data.cooldowns) parts.push('CD ok');
    return parts.join(' · ') || 'API snapshot';
  }

  function stripApiKey(obj) {
    try {
      const copy = JSON.parse(JSON.stringify(obj));
      delete copy.key; delete copy.apiKey; delete copy.tornApiKey;
      return copy;
    } catch (e) { return {}; }
  }

  function updateApiPoller() {
    if (apiPollTimer) { clearInterval(apiPollTimer); apiPollTimer = null; }
    if (!cfg.apiEnabled || !cfg.apiAutoPoll) return;
    const interval = Math.max(60000, Math.round(1000 / sanitizeRate(cfg.apiRatePerSecond)) * 60);
    apiPollTimer = setInterval(() => apiMeFlow(false).catch(err => setStatus('API poll failed: ' + err.message)), interval);
  }

  function showSettings() {
    const html = `
      <div id="sc-pda-modal"><div>
        <h3>ShadowCore PDA Settings</h3>
        <label>HQ Backend URL</label><input id="scs-url" value="${esc(cfg.backendUrl)}">
        <label>Scanner Shared Token</label><input id="scs-token" value="${esc(cfg.scannerToken)}">
        <label>Your Torn ID</label><input id="scs-id" value="${esc(cfg.memberTornId)}">
        <label>Your Torn Name</label><input id="scs-name" value="${esc(cfg.memberName)}">
        <label>Optional Torn API Key ${hasInjectedPdaKey() ? '(PDA key detected)' : '(PDA key not detected)'}</label><input id="scs-api" value="${esc(cfg.apiKey)}" placeholder="Leave blank to use PDA injected key if available">
        <label>API rate per second, max 1</label><input id="scs-rate" value="${esc(sanitizeRate(cfg.apiRatePerSecond))}">
        <label>Own API selections</label><input id="scs-own" value="${esc(cfg.apiOwnSelections)}">
        <label>Visible player selections</label><input id="scs-vis" value="${esc(cfg.apiVisibleSelections)}">
        <label>Visible player API limit</label><input id="scs-limit" value="${esc(cfg.apiVisibleLimit)}">
        <label><input type="checkbox" id="scs-api-enabled" ${cfg.apiEnabled ? 'checked' : ''}> Enable API tools</label>
        <label><input type="checkbox" id="scs-use-pda" ${cfg.usePdaKey ? 'checked' : ''}> Prefer Torn PDA injected API key</label>
        <label><input type="checkbox" id="scs-autobadge" ${cfg.autoBadges ? 'checked' : ''}> Show HQ badges</label>
        <label><input type="checkbox" id="scs-autosubmit" ${cfg.autoSubmit ? 'checked' : ''}> Auto-submit visible scans</label>
        <label><input type="checkbox" id="scs-apisubmit" ${cfg.apiSubmitSnapshots ? 'checked' : ''}> Auto-send API snapshots after API pulls</label>
        <div class="sc-actions"><button id="scs-save">Save</button><button id="scs-test">Save + Test HQ</button><button id="scs-clear">Clear</button><button id="scs-cancel">Cancel</button></div>
      </div></div>`;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper.firstElementChild);
    const modal = document.getElementById('sc-pda-modal');
    const close = () => modal && modal.remove();
    const collect = () => ({
      backendUrl: val('scs-url'), scannerToken: val('scs-token'), memberTornId: val('scs-id'), memberName: val('scs-name'), apiKey: val('scs-api'), apiRatePerSecond: sanitizeRate(val('scs-rate')), apiOwnSelections: val('scs-own'), apiVisibleSelections: val('scs-vis'), apiVisibleLimit: Math.max(1, Math.min(20, parseInt(val('scs-limit'), 10) || 5)), apiEnabled: checked('scs-api-enabled'), usePdaKey: checked('scs-use-pda'), autoBadges: checked('scs-autobadge'), autoSubmit: checked('scs-autosubmit'), apiSubmitSnapshots: checked('scs-apisubmit')
    });
    document.getElementById('scs-save').onclick = () => { saveCfg(collect()); close(); setStatus('Settings saved.'); };
    document.getElementById('scs-test').onclick = async () => { saveCfg(collect()); close(); await testHq(); };
    document.getElementById('scs-clear').onclick = () => { if (confirm('Clear ShadowCore PDA scanner settings?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } };
    document.getElementById('scs-cancel').onclick = close;
    function val(id) { return (document.getElementById(id) || {}).value || ''; }
    function checked(id) { return !!(document.getElementById(id) || {}).checked; }
  }

  async function testHq() {
    const r = await hqPost('scannerPing', {test: true});
    setStatus('HQ OK: ' + (r.version || 'connected'));
  }

  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  setTimeout(init, 600);
})();

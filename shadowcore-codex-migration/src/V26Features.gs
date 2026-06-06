/**
 * ShadowCore HQ v2.6 - Performance / Safe Boot Patch
 * Loads only the current page's data instead of reading every module sheet on every page load.
 */

function setupShadowCoreV26PerformancePatch() {
  if (typeof setSetting_ === 'function') {
    setSetting_('Performance_Mode', 'TRUE', 'v2.6: lazy page loading enabled');
    setSetting_('Performance_Row_Limit_Default', '150', 'v2.6: max rows per page payload unless overridden');
    setSetting_('Performance_Row_Limit_Heavy', '75', 'v2.6: max rows for heavy scanner/visual/report pages');
  }
  if (typeof logAudit_ === 'function') logAudit_('system', 'setupShadowCoreV26PerformancePatch', 'Enabled lazy page loading / safe boot mode.');
  return {ok:true, version:'2.6.0', note:'Replace Client.html too, then redeploy.'};
}

function getPageStateV26(sessionId, page) {
  page = String(page || 'dashboard');
  if (page === 'htmlcode') page = 'bbcode';
  var auth = (typeof validateAuthSession_ === 'function') ? validateAuthSession_(sessionId) : {ok:!!getSession_(sessionId), session:getSession_(sessionId), lastAuthError:''};
  var session = auth.session;
  if (typeof v2612NormalizeSession_ === 'function') session = v2612NormalizeSession_(session);
  var data = {
    public: getPublicStateV26_(page),
    session: session,
    v26: {version:'2.6.22', page:page, lazy:true, authValidated:!!(auth && auth.ok), lastAuthError:(auth && auth.lastAuthError) || ''}
  };
  if (page === 'authdebug') {
    data.authDebug = (typeof getAuthDebugState === 'function') ? v26SafeCall_(function(){ return getAuthDebugState(sessionId, page); }, {ok:false, error:'Auth debug unavailable or denied.'}) : {ok:false, error:'Auth debug function missing.'};
  }
  // v25 controls the menu, permissions, and default page. Keep it in every payload.
  if (session && typeof getV25State_ === 'function') data.v25 = v26SafeCall_(function(){ return getV25State_(session); }, {});
  if (!session) {
    v26AddPublicPageData_(data, page);
    return data;
  }
  var role = Number(session.roleValue || 0);
  v26AddCommonMemberData_(data, session, page);
  v26AddPageData_(data, session, role, page);
  return data;
}

function getPublicStateV26_(page) {
  var settings = v26SafeCall_(getSettingsMap_, {});
  var pub = {
    app: {name: factionName_() + ' HQ', version: APP.VERSION, factionId: factionId_()},
    announcements: v26Read_(APP.SHEETS.ANNOUNCEMENTS, 5, function(a){ return String(a.Active).toUpperCase() === 'TRUE'; }),
    apiDisclosure: settings.Required_Key_Disclosure || requiredCustomSelectionsText_(),
    privacyDisclosure: (typeof privacyDisclosureText_ === 'function') ? v26SafeCall_(privacyDisclosureText_, '') : '',
    theme: {mode: settings.Theme_Mode || 'Anthracite', accent: settings.Theme_Accent || '#f59e0b', background: settings.Theme_Background || '#05070a', customDomain: settings.Public_Custom_Domain || ''},
    version: APP.VERSION,
    performanceMode: 'TRUE'
  };
  if (/^(microsite|recruiting|privacy|knowledge)$/i.test(String(page))) {
    pub.rules = v26Read_(APP.SHEETS.RULES, 50, function(r){ return String(r.Active).toUpperCase() === 'TRUE'; });
    pub.knowledgeBasePublic = v26Read_(APP.SHEETS.KNOWLEDGE_BASE, 50, function(a){ return String(a.Active).toUpperCase() === 'TRUE' && /public|all/i.test(String(a.Audience || 'All')); });
    pub.recruitMicrosite = v26Read_(APP.SHEETS.RECRUIT_MICROSITE, 100, function(s){ return String(s.Active).toUpperCase() === 'TRUE'; }).sort(function(a,b){return Number(a.Sort)-Number(b.Sort);});
  }
  return pub;
}

function v26AddPublicPageData_(data, page) {
  if (page === 'microsite') data.recruitMicrosite = v26Read_(APP.SHEETS.RECRUIT_MICROSITE, 100, function(s){ return String(s.Active).toUpperCase() === 'TRUE'; });
  if (page === 'recruiting') data.applications = [];
  if (page === 'privacy') data.v16Privacy = (typeof getPrivacyDisclosure === 'function') ? v26SafeCall_(getPrivacyDisclosure, null) : null;
}

function v26AddCommonMemberData_(data, session, page) {
  if (typeof v2612NormalizeSession_ === 'function') session = v2612NormalizeSession_(session);
  // v2.6.11: Always return a lightweight identity payload for logged-in users,
  // so member-facing pages can show the user even before scanner/status rows exist.
  var bridge = session.authBridge || {};
  data.myIdentity = v26SafeCall_(function(){
    var m = (typeof memberById_ === 'function') ? (memberById_(session.tornId) || {}) : {};
    var b = bridge.identity || {};
    return {
      Torn_ID: m.Torn_ID || b.Torn_ID || session.tornId || '',
      Name: m.Name || b.Name || session.name || '',
      Role: m.Role || b.Role || session.role || '',
      Discord: m.Discord || '',
      Active: m.Active || '',
      Last_Seen: m.Last_Seen || '',
      Profile_URL: m.Profile_URL || b.Profile_URL || (session.tornId && session.tornId !== 'LEADER' ? 'https://www.torn.com/profiles.php?XID=' + session.tornId : '')
    };
  }, bridge.identity || {Torn_ID: session.tornId || '', Name: session.name || '', Role: session.role || ''});

  // These are small single-user lookups; include them for most member pages so
  // renderers have fallback data even when a page-specific module is empty.
  if (/^(dashboard|mylife|mobile|admin|myadvisor|membereducation|weeklyreport|availabilitycal|training|payouts|loans|revives|awards|onboarding|mentors|gymgains)$/i.test(String(page))) {
    data.myScorecard = v26SafeCall_(function(){ return myScorecard_(session.tornId); }, null);
    data.myStatus = v26SafeCall_(function(){ return myStatus_(session.tornId); }, null) || bridge.status || null;
    if ((!data.myStatus || Object.keys(data.myStatus).length === 0) && bridge.status) data.myStatus = bridge.status;
    data.myApiKeyHealth = v26SafeCall_(function(){ return v26ReadByTorn_(APP.SHEETS.API_KEY_HEALTH, session.tornId, 1).slice(-1)[0] || {}; }, {}) || {};
    if ((!data.myApiKeyHealth || Object.keys(data.myApiKeyHealth).length === 0) && bridge.apiHealth) data.myApiKeyHealth = bridge.apiHealth;
    data.v2612MyData = (typeof v2612BuildMyData_ === 'function') ? v26SafeCall_(function(){ return v2612BuildMyData_(session); }, {}) : {};
    data.v2612MyData.identity = data.v2612MyData.identity || data.myIdentity || bridge.identity || {};
    if ((!data.v2612MyData.status || Object.keys(data.v2612MyData.status).length === 0) && data.myStatus) data.v2612MyData.status = data.myStatus;
    if ((!data.v2612MyData.apiHealth || Object.keys(data.v2612MyData.apiHealth).length === 0) && data.myApiKeyHealth) data.v2612MyData.apiHealth = data.myApiKeyHealth;
    data.authDataProbe = v26BuildSessionDataProbe_(session, data);
  }

  if (page === 'dashboard') {
    data.dashboard = v26SafeCall_(dashboardSummary_, {});
    data.dashboard = v26DashboardWithSessionFallback_(data.dashboard, session, data.myStatus, data.myIdentity);
    data.announcements = data.public.announcements || [];
    data.events = v26Read_(APP.SHEETS.EVENTS, 5);
    data.v22 = (typeof getV22State_ === 'function') ? v26SafeCall_(function(){ return getV22State_(session); }, {}) : {};
    data.memberStatuses = (typeof v22MergedMemberStatuses_ === 'function') ? v26SafeCall_(function(){ return v22MergedMemberStatuses_().slice(-150); }, []) : v26Read_(APP.SHEETS.MEMBER_STATUS, 150);
    data.memberStatuses = v26RowsWithSessionStatus_(data.memberStatuses, session, data.myStatus);
  }
}

function v26RowsWithSessionStatus_(rows, session, status) {
  rows = Array.isArray(rows) ? rows.slice() : [];
  status = status || {};
  session = session || {};
  if (!status || Object.keys(status).length === 0) return rows;
  var tornId = String(status.Torn_ID || session.tornId || '');
  if (!tornId) return rows;
  var found = rows.some(function(row) { return String(row.Torn_ID || row.Player_ID || row.User_ID || '') === tornId; });
  if (!found) {
    var row = Object.assign({Torn_ID:tornId, Name:session.name || '', Source:'session auth bridge'}, status);
    if (!row.Name) row.Name = session.name || '';
    rows.push(row);
  }
  return rows;
}


function v26AddPageData_(data, session, role, page) {
  var L = Number(setting_('Performance_Row_Limit_Default','150')) || 150;
  var H = Number(setting_('Performance_Row_Limit_Heavy','75')) || 75;
  switch (page) {
    case 'war': data.wars=v26Read_(APP.SHEETS.WARS,L); data.warTargets=v26Read_(APP.SHEETS.WAR_TARGETS,L); break;
    case 'targets': data.warTargets=v26Read_(APP.SHEETS.WAR_TARGETS,L); break;
    case 'chain': data.chainLog=v26Read_(APP.SHEETS.CHAIN_LOG,L); break;
    case 'payouts': data.myPayouts=v26ReadByTorn_(APP.SHEETS.PAYOUTS,session.tornId,50); if(role>=APP.ROLES.LEADER) data.payouts=v26Read_(APP.SHEETS.PAYOUTS,L); data.reports=v26Read_(APP.SHEETS.REPORTS,10); break;
    case 'requests': data.myRequests=v26ReadByTorn_(APP.SHEETS.ARMORY_REQUESTS,session.tornId,50); if(role>=APP.ROLES.OFFICER) data.armoryRequests=v26Read_(APP.SHEETS.ARMORY_REQUESTS,L); break;
    case 'recruiting': data.applications=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.APPLICATIONS,L):[]; break;
    case 'scorecards': data.scorecards=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.MEMBER_SCORECARDS,L):[]; break;
    case 'oc': data.ocPlanner=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.OC_PLANNER,L):[]; break;
    case 'enemy': data.enemyPlayers=v26Read_(APP.SHEETS.ENEMY_PLAYERS,L); data.enemyFactions=v26Read_(APP.SHEETS.ENEMY_FACTIONS,L); break;
    case 'battleplan': data.battlePlans=v26Read_(APP.SHEETS.BATTLE_PLANS,50); data.warTargets=v26Read_(APP.SHEETS.WAR_TARGETS,L); break;
    case 'commitments': data.warCommitments=v26Read_(APP.SHEETS.WAR_COMMITMENTS,L); break;
    case 'strike': data.strikeTeams=v26Read_(APP.SHEETS.STRIKE_TEAMS,L); break;
    case 'vetting': data.applicantVetting=v26Read_(APP.SHEETS.APPLICANT_VETTING,L); data.applications=v26Read_(APP.SHEETS.APPLICATIONS,L); break;
    case 'training': data.myTraining=v26ReadByTorn_(APP.SHEETS.TRAINING_TRACKER,session.tornId,25); data.trainingTracker=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.TRAINING_TRACKER,L):data.myTraining; break;
    case 'chainplan': data.chainPlans=v26Read_(APP.SHEETS.CHAIN_PLANS,50); data.availabilityCalendar=v26Read_(APP.SHEETS.AVAILABILITY_CALENDAR,L); break;
    case 'economy': data.economyLedger=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.ECONOMY_LEDGER,L):[]; break;
    case 'discipline': data.discipline=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.DISCIPLINE,L):[]; break;
    case 'tasks': data.officerTasks=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.OFFICER_TASKS,L):[]; break;
    case 'rulescheck': data.ruleChecks=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.RULE_CHECKS,L):[]; break;
    case 'bbcode': case 'htmlcode': data.v23=(typeof getV23HtmlEditorState_==='function')?v26SafeCall_(getV23HtmlEditorState_,{}):{}; data.htmlSnippets=v26Read_(APP.SHEETS.HTML_SNIPPETS,50); break;
    case 'selfservice': data.myRequests=v26ReadByTorn_(APP.SHEETS.ARMORY_REQUESTS,session.tornId,50); break;
    case 'mobile': data.mobileWarView=v26SafeCall_(function(){return getMobileWarView_(session.tornId);},{}); data.myAssignments=v26ReadWhere_(APP.SHEETS.WAR_TARGETS,'Assigned_To_ID',session.tornId,25); break;
    case 'treasury': data.bankLedger=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.BANK_LEDGER,L):[]; data.treasuryReports=v26Read_(APP.SHEETS.TREASURY_REPORTS,25); break;
    case 'loans': data.myLoans=v26ReadByTorn_(APP.SHEETS.LOAN_COLLATERAL,session.tornId,50); if(role>=APP.ROLES.OFFICER)data.loans=v26Read_(APP.SHEETS.LOAN_COLLATERAL,L); break;
    case 'revives': data.myRevives=v26ReadByTorn_(APP.SHEETS.REVIVE_BOARD,session.tornId,50); if(role>=APP.ROLES.OFFICER)data.reviveBoard=v26Read_(APP.SHEETS.REVIVE_BOARD,L); break;
    case 'availabilitycal': data.myAvailability=v26ReadByTorn_(APP.SHEETS.MEMBER_AVAILABILITY,session.tornId,25); data.availabilityCalendar=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.AVAILABILITY_CALENDAR,L):data.myAvailability; data.v22=(typeof getV22State_==='function')?v26SafeCall_(function(){return getV22State_(session);},{}):{}; break;
    case 'promotions': data.promotions=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.PROMOTIONS,L):[]; break;
    case 'awards': data.myAwards=v26ReadByTorn_(APP.SHEETS.AWARDS,session.tornId,50); data.awards=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.AWARDS,L):data.myAwards; break;
    case 'onboarding': data.myOnboarding=v26ReadByTorn_(APP.SHEETS.ONBOARDING,session.tornId,50); data.onboarding=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.ONBOARDING,L):data.myOnboarding; break;
    case 'mentors': data.myMentorships=v26ReadMentors_(session.tornId,50); data.mentorships=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.MENTORSHIPS,L):data.myMentorships; break;
    case 'knowledge': data.knowledgeBase=v26Read_(APP.SHEETS.KNOWLEDGE_BASE,L,function(a){return String(a.Active).toUpperCase()==='TRUE';}); break;
    case 'keyhealth': data.myApiKeyHealth=v26ReadByTorn_(APP.SHEETS.API_KEY_HEALTH,session.tornId,10); data.apiKeyHealth=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.API_KEY_HEALTH,L):data.myApiKeyHealth; break;
    case 'polls': data.activePolls=v26SafeCall_(function(){return getActivePollsForSession_(session);},[]); data.polls=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.POLLS,L):data.activePolls; data.pollVotes=role>=APP.ROLES.OFFICER?v26Read_(APP.SHEETS.POLL_VOTES,L):[]; break;
    case 'mylife': data.v2612MyData=(typeof v2612BuildMyData_==='function')?v26SafeCall_(function(){return v2612BuildMyData_(session);},{}):{}; data.myFactionLife=v26SafeCall_(function(){return getMyFactionLifeV2611_(session);},{}); data.myPayouts=(data.v2612MyData&&data.v2612MyData.payouts)||v26ReadByTorn_(APP.SHEETS.PAYOUTS,session.tornId,50); data.myLoans=(data.v2612MyData&&data.v2612MyData.loans)||v26ReadByTorn_(APP.SHEETS.LOAN_COLLATERAL,session.tornId,50); data.myAwards=(data.v2612MyData&&data.v2612MyData.awards)||v26ReadByTorn_(APP.SHEETS.AWARDS,session.tornId,50); data.myOnboarding=(data.v2612MyData&&data.v2612MyData.onboarding)||v26ReadByTorn_(APP.SHEETS.ONBOARDING,session.tornId,50); data.myMentorships=(data.v2612MyData&&data.v2612MyData.mentors)||v26ReadMentors_(session.tornId,50); break;
    case 'layout': case 'permissions': data.v25=(typeof getV25State_==='function')?v26SafeCall_(function(){return getV25State_(session);},{}):{}; break;
    case 'authdebug': data.authDebug=(typeof getAuthDebugState==='function')?v26SafeCall_(function(){return getAuthDebugState(session.sessionId || '', page);},{ok:false,error:'Auth debug unavailable or denied.'}):{ok:false,error:'Auth debug function missing.'}; break;
    case 'advisor': case 'myadvisor': case 'membereducation': case 'weeklyreport': case 'coachingqueue': case 'factionneeds': data.v24=(typeof getV24State_==='function')?v26SafeCall_(function(){return getV24State_(session);},{}):{}; break;
    case 'microsite': data.recruitMicrosite=v26Read_(APP.SHEETS.RECRUIT_MICROSITE,L,function(s){return String(s.Active).toUpperCase()==='TRUE';}); break;
    case 'setup': case 'updates': case 'backups': case 'diagnostics': case 'scannerinstall': case 'tokens': case 'commands': case 'protection': case 'safemode': case 'manual': case 'theme': data.v16=(typeof getV16State_==='function')?v26SafeCall_(getV16State_,{}):{}; break;
    case 'privacy': data.v16Privacy=(typeof getPrivacyDisclosure==='function')?v26SafeCall_(getPrivacyDisclosure,null):null; data.v16=(typeof getV16State_==='function')?v26SafeCall_(getV16State_,{}):{}; break;
    case 'gymgains': case 'GymGainComparison': case 'GymGainProjectionView': case 'GymGoalEstimatorView': data.v20=(typeof getV20State_==='function')?v26SafeCall_(getV20State_,{}):{}; break;
    case 'warcountdown': case 'MemberActivityTable': case 'ActivityHeatmap': case 'WarReadinessReportView': data.v19=(typeof getV19State_==='function')?v26SafeCall_(getV19State_,{}):{}; break;
    case 'scannerdeep': case 'visuals': case 'scanneroptin': case 'recommendations': case 'taborganizer': data.v18=(typeof getV18State_==='function')?v26SafeCall_(getV18State_,{}):{}; break;
    case 'comms': data.reports=v26Read_(APP.SHEETS.REPORTS,50); data.events=v26Read_(APP.SHEETS.EVENTS,50); data.announcements=v26Read_(APP.SHEETS.ANNOUNCEMENTS,50); break;
    case 'settings': data.settings=role>=APP.ROLES.LEADER?publicSettings_():{}; break;
    case 'admin': if(role>=APP.ROLES.LEADER){ data.members=v26Read_(APP.SHEETS.MEMBERS,L); data.memberStatuses=(typeof v22MergedMemberStatuses_==='function'?v26SafeCall_(function(){return v22MergedMemberStatuses_().slice(-L);},[]):v26Read_(APP.SHEETS.MEMBER_STATUS,L)); data.errors=v26Read_(APP.SHEETS.ERRORS,50); data.audit=v26Read_(APP.SHEETS.AUDIT_LOG,50); data.settings=publicSettings_(); } break;
  }
  var bridge = session.authBridge || {};
  if ((!data.myIdentity || !Object.keys(data.myIdentity).length) && bridge.identity) data.myIdentity = bridge.identity;
  if ((!data.myStatus || !Object.keys(data.myStatus).length) && bridge.status) data.myStatus = bridge.status;
  if ((!data.myApiKeyHealth || !Object.keys(data.myApiKeyHealth).length) && bridge.apiHealth) data.myApiKeyHealth = bridge.apiHealth;
  data.v2612MyData = data.v2612MyData || {};
  if ((!data.v2612MyData.identity || !Object.keys(data.v2612MyData.identity).length) && data.myIdentity) data.v2612MyData.identity = data.myIdentity;
  if ((!data.v2612MyData.status || !Object.keys(data.v2612MyData.status).length) && data.myStatus) data.v2612MyData.status = data.myStatus;
  if ((!data.v2612MyData.apiHealth || !Object.keys(data.v2612MyData.apiHealth).length) && data.myApiKeyHealth) data.v2612MyData.apiHealth = data.myApiKeyHealth;
  data.authDataProbe = v26BuildSessionDataProbe_(session, data);
}


function getMyFactionLifeV2611_(session) {
  session = session || {};
  var tornId = String(session.tornId || '');
  var life = (typeof getMyFactionLife_ === 'function') ? v26SafeCall_(function(){ return getMyFactionLife_(tornId); }, {}) : {};
  life = life || {};
  var member = v26SafeCall_(function(){ return (typeof memberById_ === 'function' ? (memberById_(tornId) || {}) : {}); }, {});
  life.member = Object.assign({}, member || {}, life.member || {});
  if (!life.member.Torn_ID) life.member.Torn_ID = tornId;
  if (!life.member.Name) life.member.Name = session.name || '';
  if (!life.member.Role) life.member.Role = session.role || '';
  if (!life.status || Object.keys(life.status).length === 0) life.status = v26SafeCall_(function(){ return myStatus_(tornId); }, {});
  if (!life.scorecard || Object.keys(life.scorecard).length === 0) life.scorecard = v26SafeCall_(function(){ return myScorecard_(tornId); }, {});
  if (!life.summary) life.summary = {};
  life.summary.Torn_ID = life.summary.Torn_ID || tornId;
  life.summary.Name = life.summary.Name || life.member.Name || session.name || '';
  life.summary.Role = life.summary.Role || life.member.Role || session.role || '';
  return life;
}


function v26BuildSessionDataProbe_(session, data) {
  session = (typeof v2612NormalizeSession_ === 'function') ? v2612NormalizeSession_(session || {}) : (session || {});
  data = data || {};
  var tornId = String(session.tornId || '');
  function countRows(sheet, keys) {
    try {
      keys = keys || ['Torn_ID'];
      var rows = v26Read_(sheet, 9999, function(r){
        for (var i=0;i<keys.length;i++) if (String(r[keys[i]] || '') === tornId) return true;
        return false;
      });
      return rows.length;
    } catch (e) { return -1; }
  }
  return {
    Torn_ID:tornId,
    Session_Name:session.name || '',
    Role:session.role || '',
    Auth_Source:session.authSource || '',
    Bridge_Status:!!(session.authBridge && session.authBridge.status),
    Members:countRows(APP.SHEETS.MEMBERS),
    Member_Status:countRows(APP.SHEETS.MEMBER_STATUS),
    API_Key_Health:countRows(APP.SHEETS.API_KEY_HEALTH),
    Payouts:countRows(APP.SHEETS.PAYOUTS),
    Awards:countRows(APP.SHEETS.AWARDS),
    Onboarding:countRows(APP.SHEETS.ONBOARDING),
    Mentorships:countRows(APP.SHEETS.MENTORSHIPS, ['Torn_ID','Mentee_ID','Mentor_ID','Member_ID']),
    Rendered_Identity:!!(data.myIdentity && (data.myIdentity.Torn_ID || data.myIdentity.Name)),
    Rendered_Status:!!(data.myStatus && Object.keys(data.myStatus).length),
    Checked_At:nowIso_()
  };
}

function v26Read_(sheetName, limit, filterFn) {
  try {
    var rows = readTable_(sheetName) || [];
    if (filterFn) rows = rows.filter(filterFn);
    limit = Number(limit || 150);
    return rows.slice(Math.max(0, rows.length - limit));
  } catch (e) { return []; }
}
function v26ReadWhere_(sheetName, key, val, limit) { return v26Read_(sheetName, 9999, function(r){ return String(r[key]) === String(val); }).slice(-(Number(limit||50))); }
function v26ReadByTorn_(sheetName, tornId, limit) { return v26ReadWhere_(sheetName, 'Torn_ID', tornId, limit); }
function v26ReadMentors_(tornId, limit) { return v26Read_(APP.SHEETS.MENTORSHIPS, limit || 50, function(m){ return String(m.Mentee_ID) === String(tornId) || String(m.Mentor_ID) === String(tornId); }); }
function v26SafeCall_(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }


/** v2.6.12 - Robust member/session data bridge. */
function v2612NormalizeSession_(session) {
  if (!session) return session;
  if (session.user && typeof session.user === 'object') {
    session = Object.assign({}, session.user, {sessionId: session.sessionId || session.user.sessionId || ''});
  }
  var tornId = session.tornId || session.Torn_ID || session.TornId || session.torn_id || session.player_id || session.Player_ID || session.user_id || session.User_ID || session.id || session.ID || '';
  var name = session.name || session.Name || session.player_name || session.Player_Name || session.username || session.Username || '';
  var role = session.role || session.Role || 'MEMBER';
  session.tornId = String(tornId || '').trim();
  session.name = String(name || '').trim();
  session.role = roleName_(role || 'MEMBER');
  session.roleValue = Number(session.roleValue || session.Role_Value || session.role_value || roleValue_(role || 'MEMBER')) || 1;
  return session;
}

function getMyDataDirectV2612(sessionId) {
  var session = v2612NormalizeSession_(requireSession_(sessionId));
  return v2612BuildMyData_(session);
}

function debugMyDataDirectV2612(sessionId) {
  var session = v2612NormalizeSession_(getSession_(sessionId));
  if (!session) return {ok:false, error:'No valid server session for this sessionId.'};
  var data = v2612BuildMyData_(session);
  return {
    ok:true,
    session: session,
    tornId: session.tornId,
    identity: data.identity,
    counts: data.counts,
    statusKeys: data.status ? Object.keys(data.status) : [],
    note: 'If counts are zero, the matching sheets do not yet have rows for this Torn ID or use an unexpected ID column.'
  };
}

function v2612BuildMyData_(session) {
  session = v2612NormalizeSession_(session || {});
  var tornId = String(session.tornId || '').trim();
  var out = {
    identity: {Torn_ID:tornId, Name:session.name || '', Role:session.role || '', Role_Value:session.roleValue || '', Source:'v2.6.12 direct member data bridge'},
    status: {}, scorecard: {}, apiHealth: {}, payouts: [], loans: [], awards: [], onboarding: [], mentors: [], requests: [], revives: [], training: [], availability: [], counts: {}, debug: []
  };
  if (!tornId) { out.debug.push('No Torn ID found in session. API login response/session needs Torn_ID/tornId/player_id/user_id.'); return out; }

  var member = v2612LatestForId_('Members', tornId);
  if (member) out.identity = Object.assign({}, member, out.identity, {Name: member.Name || out.identity.Name, Role: member.Role || out.identity.Role});

  out.status = v2612MergeStatus_(tornId);
  out.scorecard = v2612LatestForId_('Member_Scorecards', tornId) || {};
  out.apiHealth = v2612LatestFromAny_(tornId, ['API_Key_Health','API_Key_Health_Snapshots','API_Snapshots']) || {};
  out.payouts = v2612RowsFromAny_(tornId, ['Payouts','Payout_History'], 50);
  out.loans = v2612RowsFromAny_(tornId, ['Loan_Collateral','Loans','Trade_Logs'], 50);
  out.awards = v2612RowsFromAny_(tornId, ['Awards','Merit_Award_Progress'], 50);
  out.onboarding = v2612RowsFromAny_(tornId, ['Onboarding','Onboarding_Progress'], 50);
  out.mentors = v2612RowsFromAny_(tornId, ['Mentorships','Mentors'], 50, function(r){ return v2612RowHasId_(r,tornId,['Torn_ID','Mentee_ID','Mentor_ID','Member_ID','Player_ID','User_ID']); });
  out.requests = v2612RowsFromAny_(tornId, ['Armory_Requests','Support_Context'], 50);
  out.revives = v2612RowsFromAny_(tornId, ['Revive_Board','Hospital_Scans'], 50);
  out.training = v2612RowsFromAny_(tornId, ['Training_Tracker','Training_Growth_Snapshots','Education_Tracking','Gym_API_Bonus_Snapshots'], 50);
  out.availability = v2612RowsFromAny_(tornId, ['Member_Availability','Availability_Calendar'], 50);

  ['payouts','loans','awards','onboarding','mentors','requests','revives','training','availability'].forEach(function(k){ out.counts[k] = (out[k] || []).length; });
  out.counts.status = Object.keys(out.status || {}).length;
  out.counts.scorecard = Object.keys(out.scorecard || {}).length;
  out.counts.apiHealth = Object.keys(out.apiHealth || {}).length;
  return out;
}

function v2612MergeStatus_(tornId) {
  var base = {};
  ['Member_Status','Member_Readiness_Snapshots','War_Readiness_Scores','Cooldown_Forecasts','API_Snapshots','Scanner_Health_Stats'].forEach(function(sheet){
    var latest = v2612LatestForId_(sheet, tornId);
    if (latest) base = Object.assign(base, latest);
  });
  var payload = v2612FirstJsonPayload_(base);
  if (payload) {
    var picks = {
      Energy:['energy','Energy','energy_current','current_energy','bars.energy.current','energy.current'],
      Nerve:['nerve','Nerve','nerve_current','current_nerve','bars.nerve.current','nerve.current'],
      Happy:['happy','Happy','happy_current','current_happy','bars.happy.current','happy.current'],
      Life:['life','Life','life_current','current_life','bars.life.current','life.current'],
      Drug_Cooldown:['drug_cooldown','Drug_Cooldown','cooldowns.drug','cooldowns.drugs','drug'],
      Medical_Cooldown:['medical_cooldown','Medical_Cooldown','cooldowns.medical','medical'],
      Booster_Cooldown:['booster_cooldown','Booster_Cooldown','cooldowns.booster','booster'],
      Hospital_Until:['hospital_until','Hospital_Until','status.until','status.until_time','hospital_until_timestamp']
    };
    Object.keys(picks).forEach(function(k){ if (!base[k]) { var v=v2612DeepPick_(payload,picks[k]); if (v!=='' && v!==null && v!==undefined) base[k]=v; } });
  }
  if (!base.Updated) base.Updated = base.Timestamp || base.Last_Checked || base.Last_Sync || base.Created || '';
  return base;
}

function v2612RowsFromAny_(tornId, sheetNames, limit, customFilter) {
  var rows = [];
  sheetNames.forEach(function(name){ rows = rows.concat(v2612RowsForId_(name, tornId, customFilter)); });
  rows.sort(function(a,b){ return v2612RowTime_(a)-v2612RowTime_(b); });
  return rows.slice(-Number(limit || 50));
}
function v2612LatestFromAny_(tornId, sheetNames) { var rows=v2612RowsFromAny_(tornId,sheetNames,1); return rows[0] || {}; }
function v2612LatestForId_(sheetName, tornId) { var rows=v2612RowsForId_(sheetName,tornId); rows.sort(function(a,b){return v2612RowTime_(a)-v2612RowTime_(b);}); return rows.slice(-1)[0] || null; }
function v2612RowsForId_(sheetName, tornId, customFilter) {
  var rows = v2612ReadSheet_(sheetName);
  var filter = customFilter || function(r){ return v2612RowHasId_(r,tornId); };
  return rows.filter(filter);
}
function v2612RowHasId_(r, tornId, keys) {
  keys = keys || ['Torn_ID','Torn ID','TornId','tornId','Member_ID','Member ID','Player_ID','Player ID','User_ID','User ID','ID','Subject_ID','Subject ID'];
  for (var i=0;i<keys.length;i++) if (String(r[keys[i]] || '').trim() === String(tornId)) return true;
  return false;
}
function v2612ReadSheet_(sheetName) {
  try {
    var ss=SpreadsheetApp.getActive(); var sh=ss.getSheetByName(sheetName); if(!sh) return [];
    var values=sh.getDataRange().getValues(); if(values.length<2) return [];
    var headers=values[0].map(function(h){return String(h||'').trim();});
    return values.slice(1).filter(function(row){return row.some(function(v){return v!=='' && v!==null;});}).map(function(row){ var o={}; headers.forEach(function(h,i){ if(h) o[h]=row[i]; }); return o; });
  } catch(e) { return []; }
}
function v2612RowTime_(r) { var v=r.Updated||r.Timestamp||r.Last_Checked||r.Last_Sync||r.Created||r.Date||''; var t=new Date(v).getTime(); return isNaN(t)?0:t; }
function v2612FirstJsonPayload_(row) {
  var keys=['Payload_JSON','Payload','Snapshot_JSON','Data_JSON','Raw_JSON','JSON','Summary'];
  for(var i=0;i<keys.length;i++){ var raw=row[keys[i]]; if(!raw) continue; if(typeof raw==='object') return raw; try{return JSON.parse(String(raw));}catch(e){} }
  return null;
}
function v2612DeepPick_(obj, paths) {
  for(var i=0;i<paths.length;i++){
    var path=String(paths[i]).split('.'); var cur=obj;
    for(var j=0;j<path.length;j++){ if(cur==null) break; cur=cur[path[j]]; }
    if(cur!==undefined && cur!==null && cur!=='') return cur;
  }
  return '';
}

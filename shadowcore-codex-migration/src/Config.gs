/**
 * ShadowCore HQ - Configuration
 * Copy all .gs and .html files into a Google Apps Script project bound to a Google Sheet.
 */

var APP = {
  VERSION: '2.5.0',
  FACTION_ID_DEFAULT: '50538',
  FACTION_NAME_DEFAULT: 'ShadowCore',
  API_BASE: 'https://api.torn.com',
  CACHE_SECONDS_DEFAULT: 30,
  SESSION_SECONDS: 21600,
  MAX_SYNC_ROWS: 2000,
  SHEETS: {
    SETTINGS: 'Settings',
    API_KEYS: 'API_Keys',
    MEMBERS: 'Members',
    MEMBER_STATUS: 'Member_Status',
    MEMBER_SCORECARDS: 'Member_Scorecards',
    FACTION_STATUS: 'Faction_Status',
    WARS: 'Wars',
    WAR_ATTACKS: 'War_Attacks',
    WAR_TARGETS: 'War_Targets',
    CHAIN_LOG: 'Chain_Log',
    PAYOUT_RULES: 'Payout_Rules',
    PAYOUTS: 'Payouts',
    PAYOUT_HISTORY: 'Payout_History',
    APPLICATIONS: 'Applications',
    APPLICATION_NOTES: 'Application_Notes',
    ARMORY_REQUESTS: 'Armory_Requests',
    ARMORY_LOANS: 'Armory_Loans',
    OC_PLANNER: 'OC_Planner',
    ENEMY_FACTIONS: 'Enemy_Factions',
    ENEMY_PLAYERS: 'Enemy_Players',
    EVENTS: 'Events',
    RULES: 'Rules',
    ANNOUNCEMENTS: 'Announcements',
    DISCORD_ALERTS: 'Discord_Alerts',
    REPORTS: 'Reports',
    AUDIT_LOG: 'Audit_Log',
    ERRORS: 'Errors',
    CACHE: 'Cache',
    BATTLE_PLANS: 'Battle_Plans',
    WAR_COMMITMENTS: 'War_Commitments',
    STRIKE_TEAMS: 'Strike_Teams',
    DISCIPLINE: 'Discipline_Log',
    ECONOMY_LEDGER: 'Economy_Ledger',
    TRAINING_TRACKER: 'Training_Tracker',
    APPLICANT_VETTING: 'Applicant_Vetting',
    CHAIN_PLANS: 'Chain_Plans',
    BBCODE_SNIPPETS: 'BBCode_Snippets',
    HTML_SNIPPETS: 'HTML_Snippets',
    OFFICER_TASKS: 'Officer_Tasks',
    RULE_CHECKS: 'Rule_Checks',
    MEMBER_AVAILABILITY: 'Member_Availability',
    BANK_LEDGER: 'Bank_Ledger',
    TREASURY_REPORTS: 'Treasury_Reports',
    LOAN_COLLATERAL: 'Loan_Collateral',
    REVIVE_BOARD: 'Revive_Board',
    AVAILABILITY_CALENDAR: 'Availability_Calendar',
    PROMOTIONS: 'Promotions',
    AWARDS: 'Awards',
    ONBOARDING: 'Onboarding',
    MENTORSHIPS: 'Mentorships',
    KNOWLEDGE_BASE: 'Knowledge_Base',
    API_KEY_HEALTH: 'API_Key_Health',
    POLLS: 'Polls',
    POLL_VOTES: 'Poll_Votes',
    RECRUIT_MICROSITE: 'Recruit_Microsite',
    SETUP_WIZARD: 'Setup_Wizard',
    MEMBER_TOKENS: 'Member_Tokens',
    PRIVACY_CONSENTS: 'Privacy_Consents',
    VERSION_LOG: 'Version_Log',
    BACKUPS: 'Backups',
    DIAGNOSTICS: 'Diagnostics',
    SCANNER_INSTALLS: 'Scanner_Installs',
    DISCORD_COMMANDS: 'Discord_Commands',
    SHEET_PROTECTIONS: 'Sheet_Protections',
    SAFE_MODE_LOG: 'Safe_Mode_Log',
    ADMIN_MANUAL: 'Admin_Manual',
    SETUP_CHECKLIST: 'Setup_Checklist',
    USER_PREFERENCES: 'User_Preferences',
    ROLE_PERMISSIONS: 'Role_Permissions',
    HIDDEN_PAGES: 'Hidden_Pages',
    DASHBOARD_LAYOUTS: 'Dashboard_Layouts',
    LAYOUT_PRESETS: 'Layout_Presets'
  },
  ROLES: {
    PUBLIC: 0,
    APPLICANT: 1,
    MEMBER: 2,
    CORE: 3,
    OFFICER: 4,
    LEADER: 5,
    DEVELOPER: 6
  }
};

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function ss_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Open this script from a Google Sheet or bind it to a spreadsheet first.');
  }
  return spreadsheet;
}

function nowIso_() {
  return new Date().toISOString();
}

function unixNow_() {
  return Math.floor(Date.now() / 1000);
}

function appUrl_() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (err) {
    return '';
  }
}

function getScriptProps_() {
  return PropertiesService.getScriptProperties();
}

function setting_(key, fallback) {
  var settings = getSettingsMap_();
  var val = settings[key];
  if (val === undefined || val === null || val === '') return fallback;
  return val;
}

function boolSetting_(key, fallback) {
  var val = setting_(key, fallback ? 'TRUE' : 'FALSE');
  if (typeof val === 'boolean') return val;
  return String(val).toUpperCase() === 'TRUE' || String(val) === '1' || String(val).toLowerCase() === 'yes';
}

function numberSetting_(key, fallback) {
  var val = Number(setting_(key, fallback));
  return isNaN(val) ? fallback : val;
}

function factionId_() {
  return String(setting_('Faction_ID', APP.FACTION_ID_DEFAULT));
}

function factionName_() {
  return String(setting_('Faction_Name', APP.FACTION_NAME_DEFAULT));
}

function cacheSeconds_() {
  return Math.max(10, Math.min(300, numberSetting_('Api_Cache_Seconds', APP.CACHE_SECONDS_DEFAULT)));
}

function requiredCustomSelectionsText_() {
  return [
    'Recommended minimum custom-key selections depend on what you enable.',
    'Faction leader key: faction basic, attacks, chain/chains if available, contributors/logs if you use them.',
    'Member key: key info, user profile/basic/status, attacks/log/cooldowns/battlestats only if the member consents.',
    'Use the fewest selections needed, and disclose exactly what is stored/shared.'
  ].join('\n');
}

function roleValue_(role) {
  if (role === undefined || role === null) return APP.ROLES.PUBLIC;
  var r = String(role).toUpperCase();
  if (APP.ROLES[r] !== undefined) return APP.ROLES[r];
  var n = Number(role);
  return isNaN(n) ? APP.ROLES.PUBLIC : n;
}

function roleName_(value) {
  var n = roleValue_(value);
  var keys = Object.keys(APP.ROLES);
  for (var i = 0; i < keys.length; i++) {
    if (APP.ROLES[keys[i]] === n) return keys[i];
  }
  return 'PUBLIC';
}

function safeJson_(obj) {
  return JSON.stringify(obj, function(key, value) {
    if (value instanceof Date) return value.toISOString();
    return value;
  });
}

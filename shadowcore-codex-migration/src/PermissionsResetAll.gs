/**
 * ShadowCore HQ v2.6.4 - Full Role Permissions Reset
 * Add this file to Apps Script, then run resetAllRolePermissionsFull_v264().
 * It repopulates Role_Permissions with every known page key through v2.6.x.
 */

function resetAllRolePermissionsFull_v264() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName('Role_Permissions') || ss.insertSheet('Role_Permissions');
  var now = new Date();

  var headers = [
    'Page_Key',
    'Page_Name',
    'Minimum_Role',
    'Visible',
    'Category',
    'Notes',
    'Updated'
  ];

  var rows = [
    // Public / entry
    ['dashboard', 'Dashboard', 'Member', 'TRUE', 'Core', 'Main member dashboard', now],
    ['home', 'Home', 'Member', 'TRUE', 'Core', 'Home/dashboard alias', now],
    ['microsite', 'Recruitment Microsite', 'Public', 'TRUE', 'Recruiting', 'Public recruitment page', now],
    ['recruiting', 'Recruiting / Applications', 'Public', 'TRUE', 'Recruiting', 'Application form and recruiting page', now],
    ['apply', 'Apply', 'Public', 'TRUE', 'Recruiting', 'Application alias', now],
    ['privacy', 'Privacy / API Disclosure', 'Public', 'TRUE', 'Core', 'API/scanner privacy disclosure', now],

    // Member pages
    ['mylife', 'My Faction Life', 'Member', 'TRUE', 'Member', 'Personal member profile', now],
    ['selfservice', 'Member Self-Service', 'Member', 'TRUE', 'Member', 'Member self-service portal', now],
    ['onboarding', 'Onboarding', 'Recruit', 'TRUE', 'Member', 'New member onboarding checklist', now],
    ['availabilitycal', 'Availability Calendar', 'Member', 'TRUE', 'Member', 'Member availability/timezone calendar', now],
    ['training', 'Training Tracker', 'Member', 'TRUE', 'Member', 'Training goals and progress', now],
    ['knowledge', 'Knowledge Base', 'Member', 'TRUE', 'Member', 'Faction guides and rules', now],
    ['mentors', 'Mentors', 'Member', 'TRUE', 'Member', 'Mentor/coaching system', now],
    ['awards', 'Awards', 'Member', 'TRUE', 'Member', 'Faction awards and achievements', now],
    ['polls', 'Polls / Voting', 'Member', 'TRUE', 'Member', 'Faction polls/voting', now],
    ['factionneeds', 'Faction Needs', 'Member', 'TRUE', 'Advisor', 'What the faction needs now', now],
    ['weeklyreport', 'Weekly Report', 'Member', 'TRUE', 'Advisor', 'Personal weekly report', now],
    ['myadvisor', 'My Advisor', 'Member', 'TRUE', 'Advisor', 'Personal next-best-action advisor', now],
    ['membereducation', 'Member Education', 'Member', 'TRUE', 'Advisor', 'Informed score and recommended guides', now],
    ['layout', 'My Layout', 'Member', 'TRUE', 'Layout', 'Personal hide/show and homepage layout', now],

    // War / chain
    ['war', 'War Room', 'Core Member', 'TRUE', 'War', 'Live war room', now],
    ['mobile', 'Mobile War View', 'Member', 'TRUE', 'War', 'Phone-friendly war assignments', now],
    ['targets', 'Target Board', 'Core Member', 'TRUE', 'War', 'Enemy target board and target assignments', now],
    ['battleplan', 'Battle Plan Generator', 'Officer', 'TRUE', 'War', 'War strategy generator', now],
    ['chain', 'Chain Tracker', 'Member', 'TRUE', 'War', 'Chain tracking', now],
    ['chainplan', 'Chain Bonus Planner', 'Officer', 'TRUE', 'War', 'Chain bonus/start planning', now],
    ['strike', 'Strike Teams', 'Officer', 'TRUE', 'War', 'Strike team builder', now],
    ['commitments', 'War Commitments', 'Member', 'TRUE', 'War', 'War commitment/check-in board', now],

    // Ranked war countdown monitor
    ['warcountdown', 'Ranked War Countdown Monitor', 'Officer', 'TRUE', 'War Monitor', '105-hour enemy faction monitor', now],
    ['MemberActivityTable', 'Member Activity Table', 'Officer', 'TRUE', 'War Monitor', 'Enemy member activity table', now],
    ['ActivityHeatmap', 'Activity Heatmap', 'Officer', 'TRUE', 'War Monitor', 'Enemy activity heatmap', now],
    ['WarReadinessReportView', 'War Readiness Report', 'Officer', 'TRUE', 'War Monitor', 'Final pre-war readiness report', now],

    // Payout/economy/support
    ['payouts', 'Payout Center', 'Member', 'TRUE', 'Economy', 'War payouts and pay stubs', now],
    ['treasury', 'Treasury', 'Leader', 'TRUE', 'Economy', 'Faction bank/treasurer dashboard', now],
    ['economy', 'Faction Economy', 'Officer', 'TRUE', 'Economy', 'Economy ledger overview', now],
    ['loans', 'Loans / Collateral', 'Officer', 'TRUE', 'Economy', 'Loans and collateral tracker', now],
    ['armory', 'Armory Requests', 'Member', 'TRUE', 'Support', 'Armory/support request center', now],
    ['revives', 'Revive / Hospital Support', 'Member', 'TRUE', 'Support', 'Revive and hospital support board', now],

    // Recruiting / vetting
    ['vetting', 'Applicant Vetting', 'Officer', 'TRUE', 'Recruiting', 'Applicant vetting board', now],
    ['recruitleads', 'Recruit Leads', 'Officer', 'TRUE', 'Recruiting', 'Recruit lead tracker if routed separately', now],

    // Member management / leadership
    ['scorecards', 'Member Scorecards', 'Officer', 'TRUE', 'Leadership', 'Member scorecards', now],
    ['promotions', 'Promotions', 'Officer', 'TRUE', 'Leadership', 'Promotion/rank system', now],
    ['discipline', 'Discipline / Warnings', 'Officer', 'TRUE', 'Leadership', 'Discipline and warning tracker', now],
    ['rulescheck', 'Rule Check', 'Officer', 'TRUE', 'Leadership', 'Faction rule enforcement dashboard', now],
    ['tasks', 'Officer Task Board', 'Officer', 'TRUE', 'Leadership', 'Officer task tracker', now],
    ['coachingqueue', 'Coaching Queue', 'Officer', 'TRUE', 'Advisor', 'Officer coaching queue', now],
    ['advisor', 'Advisor Dashboard', 'Officer', 'TRUE', 'Advisor', 'Member intelligence/advisor dashboard', now],

    // Intelligence / OC / enemy
    ['enemyintel', 'Enemy Intel', 'Officer', 'TRUE', 'Intel', 'Enemy intelligence board', now],
    ['enemy', 'Enemy Intel', 'Officer', 'TRUE', 'Intel', 'Enemy intel alias', now],
    ['oc', 'OC Planner', 'Officer', 'TRUE', 'OC', 'Organized crime planner alias', now],
    ['ocplanner', 'OC Planner', 'Officer', 'TRUE', 'OC', 'Organized crime planner', now],

    // Scanner pages
    ['scannerinstall', 'Scanner Install', 'Member', 'TRUE', 'Scanner', 'Scanner setup guide', now],
    ['scanneroptin', 'Scanner Opt-In', 'Member', 'TRUE', 'Scanner', 'Scanner/API opt-in controls', now],
    ['scannerdeep', 'Scanner Deep Data', 'Officer', 'TRUE', 'Scanner', 'Deep scanner/API data', now],
    ['keyhealth', 'API Key Health', 'Officer', 'TRUE', 'Scanner', 'API key health center', now],

    // Gym lab
    ['gymgains', 'Gym Gains Lab', 'Member', 'TRUE', 'Gym', 'Vladar formula gym gain calculator', now],
    ['GymGainComparison', 'Gym Gain Comparison', 'Member', 'TRUE', 'Gym', 'All-gym comparison view', now],
    ['GymGainProjectionView', 'Gym Gain Projection', 'Member', 'TRUE', 'Gym', 'Multi-day gym projection view', now],
    ['GymGoalEstimatorView', 'Gym Goal Estimator', 'Member', 'TRUE', 'Gym', 'Time-to-goal estimator', now],

    // Visuals / reports / comms
    ['visuals', 'Graphs / Visuals', 'Officer', 'TRUE', 'Reports', 'Visual dashboard', now],
    ['recommendations', 'Smart Recommendations', 'Officer', 'TRUE', 'Reports', 'Smart recommendation engine', now],
    ['comms', 'Comms & Reports', 'Officer', 'TRUE', 'Reports', 'Discord/report center', now],
    ['commands', 'Discord Commands', 'Officer', 'TRUE', 'Reports', 'Command-style Discord reports', now],
    ['bbcode', 'HTML Code Editor', 'Officer', 'TRUE', 'Reports', 'Legacy bbcode URL now opens HTML editor', now],
    ['htmlcode', 'HTML Code Editor', 'Officer', 'TRUE', 'Reports', 'Torn HTML copier/editor', now],

    // Admin/setup/safety — admin token should always bypass these
    ['admin', 'Admin Panel', 'Admin', 'TRUE', 'Admin', 'Main admin panel', now],
    ['setup', 'Setup Wizard', 'Admin', 'TRUE', 'Admin', 'Setup wizard', now],
    ['settings', 'Settings', 'Admin', 'TRUE', 'Admin', 'HQ settings', now],
    ['diagnostics', 'Diagnostics', 'Admin', 'TRUE', 'Admin', 'System diagnostics', now],
    ['safemode', 'Safe Mode', 'Admin', 'TRUE', 'Admin', 'Safe mode controls', now],
    ['backups', 'Backups', 'Admin', 'TRUE', 'Admin', 'Backup tools', now],
    ['updates', 'Updates', 'Admin', 'TRUE', 'Admin', 'Version/update log', now],
    ['tokens', 'Tokens', 'Admin', 'TRUE', 'Admin', 'Login/token controls', now],
    ['protection', 'Sheet Protection', 'Admin', 'TRUE', 'Admin', 'Sheet protection tools', now],
    ['permissions', 'Page Permissions', 'Admin', 'TRUE', 'Admin', 'Role permissions editor', now],
    ['manual', 'Admin Manual', 'Leader', 'TRUE', 'Admin', 'Leadership manual', now],
    ['theme', 'Theme', 'Admin', 'TRUE', 'Admin', 'Theme controls', now],
    ['taborganizer', 'Tab Organizer', 'Admin', 'TRUE', 'Admin', 'Optional sheet tab organization', now]
  ];

  // Deduplicate by Page_Key in case aliases were accidentally repeated later.
  var seen = {};
  var cleanRows = [];
  rows.forEach(function(row) {
    var key = String(row[0] || '').trim();
    if (!key || seen[key]) return;
    seen[key] = true;
    cleanRows.push(row);
  });

  sh.clearContents();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.getRange(2, 1, cleanRows.length, headers.length).setValues(cleanRows);
  try { sh.setFrozenRows(1); } catch (err) {}

  return {
    ok: true,
    sheet: 'Role_Permissions',
    rows: cleanRows.length,
    note: 'Full permissions reset through ShadowCore HQ v2.6.x.'
  };
}

function makeKnowledgeBaseMemberVisible_v264() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName('Role_Permissions');
  if (!sh) return resetAllRolePermissionsFull_v264();
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return resetAllRolePermissionsFull_v264();

  var headers = values[0];
  var keyCol = headers.indexOf('Page_Key');
  var roleCol = headers.indexOf('Minimum_Role');
  var visibleCol = headers.indexOf('Visible');
  if (keyCol < 0 || roleCol < 0 || visibleCol < 0) return resetAllRolePermissionsFull_v264();

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][keyCol]).trim() === 'knowledge') {
      sh.getRange(r + 1, roleCol + 1).setValue('Member');
      sh.getRange(r + 1, visibleCol + 1).setValue('TRUE');
      return {ok: true, page: 'knowledge', minimum_role: 'Member', visible: true};
    }
  }
  return resetAllRolePermissionsFull_v264();
}

/**
 * ShadowCore HQ v1.7 - Scanner Auto Enrichment setup helpers.
 * This feature pack is scanner-focused. The data sheets are created by setupShadowCoreScannerBridge().
 */

function setupShadowCoreV17AutoEnrichment() {
  if (typeof setupShadowCoreScannerBridge === 'function') {
    var res = setupShadowCoreScannerBridge();
    if (typeof logAudit_ === 'function') logAudit_('system', 'setupShadowCoreV17AutoEnrichment', 'Installed v1.7 scanner auto-enrichment sheets and settings.');
    return {ok: true, version: '1.7.0', scanner: res};
  }
  throw new Error('ShadowCoreScannerBridge.gs is missing. Add it, save, then run setupShadowCoreV17AutoEnrichment again.');
}

function listShadowCoreV17AutoEnrichmentSheets() {
  return [
    'Auto_Enrichment_Log',
    'Member_Readiness_Snapshots',
    'War_Readiness_Scores',
    'Auto_Checkins',
    'Assignment_Tracking',
    'Enemy_Profile_Enrichment',
    'Faction_Roster_Snapshots',
    'Auto_Recruit_Leads',
    'Support_Context',
    'Training_Growth_Snapshots',
    'Onboarding_Progress',
    'API_Key_Health_Snapshots',
    'Scanner_Health_Stats',
    'Scanner_Discord_Triggers'
  ];
}

function getShadowCoreV17AutoEnrichmentSummary() {
  return {
    ok: true,
    version: '1.7.0',
    features: [
      'Member readiness snapshots', 'War readiness scores', 'Automatic check-ins', 'Assignment tracking',
      'Attack result logging', 'Enemy profile enrichment', 'Faction roster snapshots', 'Recruit lead automation',
      'Hospital/revive support detection', 'Support request context', 'Loan/trade tracking',
      'Market/bazaar/travel notes', 'Training/growth snapshots', 'Onboarding progress',
      'API key health data', 'Scanner health/usage stats', 'Discord trigger queue rows'
    ],
    sheets: listShadowCoreV17AutoEnrichmentSheets()
  };
}

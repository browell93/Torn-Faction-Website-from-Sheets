/**
 * ShadowCore HQ v1.8 - Deep scanner/API categories, visuals, and sheet organization.
 * Cumulative with v1.7. Keeps personal/sensitive categories opt-in.
 */

var V18_VERSION = '1.8.5';

var V18_SHEETS = {
  ARMORY_STOCK: 'Armory_Stock',
  ARMORY_NEWS: 'Armory_News',
  FACTION_RESPECT_UPGRADES: 'Faction_Respect_Upgrades',
  OC_RESULT_HISTORY: 'OC_Result_History',
  MEMBER_BUSINESS_SNAPSHOTS: 'Member_Business_Snapshots',
  PROPERTY_TRAINING_NOTES: 'Property_Training_Notes',
  EDUCATION_TRACKING: 'Education_Tracking',
  MERIT_AWARD_PROGRESS: 'Merit_Award_Progress',
  MISSION_TRACKING: 'Mission_Tracking',
  RACING_PROGRESS: 'Racing_Progress',
  CASINO_BANKROLL: 'Casino_Bankroll',
  GEAR_ITEM_SCANS: 'Gear_Item_Scans',
  REVIVER_PERFORMANCE: 'Reviver_Performance',
  COOLDOWN_FORECASTS: 'Cooldown_Forecasts',
  EVENT_NEWS_SCANS: 'Event_News_Scans',
  MEMBER_RISK_FLAGS: 'Member_Risk_Flags',
  SMART_RECOMMENDATIONS: 'Smart_Recommendations',
  SCANNER_OPT_IN: 'Scanner_Opt_In_Preferences',
  VISUAL_SNAPSHOTS: 'Visual_Snapshots',
  TAB_ORGANIZATION: 'Tab_Organization'
};

var V18_HEADERS = {};
V18_HEADERS[V18_SHEETS.ARMORY_STOCK] = ['Stock_ID','Timestamp','Item','Category','Quantity','Estimated_Value','Source','Submitted_By_ID','Submitted_By_Name','Status','Notes','Payload_JSON'];
V18_HEADERS[V18_SHEETS.ARMORY_NEWS] = ['News_ID','Timestamp','Event_Type','Torn_ID','Name','Item','Quantity','Direction','Related_Request_ID','Source','Notes','Payload_JSON'];
V18_HEADERS[V18_SHEETS.FACTION_RESPECT_UPGRADES] = ['Snapshot_ID','Timestamp','Faction_ID','Faction_Name','Respect','Rank','Members','Upgrade_Branch','Upgrade_Level','Next_Goal','Source_URL','Payload_JSON'];
V18_HEADERS[V18_SHEETS.OC_RESULT_HISTORY] = ['OC_Result_ID','Timestamp','Crime','Result','Participants','Reward','Penalty','Reliability_Notes','Submitted_By_ID','Submitted_By_Name','Source_URL','Payload_JSON'];
V18_HEADERS[V18_SHEETS.MEMBER_BUSINESS_SNAPSHOTS] = ['Snapshot_ID','Timestamp','Torn_ID','Name','Business_Type','Item_Count','Estimated_Value','Income_Note','Opt_In','Source_URL','Payload_JSON'];
V18_HEADERS[V18_SHEETS.PROPERTY_TRAINING_NOTES] = ['Note_ID','Timestamp','Torn_ID','Name','Property','Vault','Happy_Bonus','Rental_Ends','Training_Value','Opt_In','Source_URL','Notes','Payload_JSON'];
V18_HEADERS[V18_SHEETS.EDUCATION_TRACKING] = ['Education_ID','Timestamp','Torn_ID','Name','Course','Status','Completion_Date','Recommended_Next','Opt_In','Source_URL','Notes','Payload_JSON'];
V18_HEADERS[V18_SHEETS.MERIT_AWARD_PROGRESS] = ['Merit_ID','Timestamp','Torn_ID','Name','Merits_Available','Award_Progress','Recommended_Spend','Opt_In','Source_URL','Notes','Payload_JSON'];
V18_HEADERS[V18_SHEETS.MISSION_TRACKING] = ['Mission_ID','Timestamp','Torn_ID','Name','Mission','Status','Difficulty','Reward_Note','Opt_In','Source_URL','Notes','Payload_JSON'];
V18_HEADERS[V18_SHEETS.RACING_PROGRESS] = ['Racing_ID','Timestamp','Torn_ID','Name','Racing_Skill','Class','Car','Result','Event_ID','Opt_In','Source_URL','Notes','Payload_JSON'];
V18_HEADERS[V18_SHEETS.CASINO_BANKROLL] = ['Casino_ID','Timestamp','Torn_ID','Name','Game','Result','Amount','Bankroll_Note','Event_ID','Opt_In','Source_URL','Notes','Payload_JSON'];
V18_HEADERS[V18_SHEETS.GEAR_ITEM_SCANS] = ['Gear_ID','Timestamp','Item','Category','Quality','Damage','Accuracy','Armor','Bonus','Price','Seller_ID','Seller_Name','Faction_Need','Source_URL','Payload_JSON'];
V18_HEADERS[V18_SHEETS.REVIVER_PERFORMANCE] = ['Revive_ID','Timestamp','Reviver_ID','Reviver_Name','Target_ID','Target_Name','Response_Time','Cost','War_ID','Result','Source_URL','Notes','Payload_JSON'];
V18_HEADERS[V18_SHEETS.COOLDOWN_FORECASTS] = ['Forecast_ID','Timestamp','Torn_ID','Name','Drug_CD','Medical_CD','Booster_CD','Energy','Life','Ready_At','War_Ready','Source','Payload_JSON'];
V18_HEADERS[V18_SHEETS.EVENT_NEWS_SCANS] = ['Event_News_ID','Timestamp','Event_Type','Title','Priority','Related_ID','Source_URL','Summary','Payload_JSON'];
V18_HEADERS[V18_SHEETS.MEMBER_RISK_FLAGS] = ['Risk_ID','Timestamp','Torn_ID','Name','Risk_Type','Severity','Evidence','Recommended_Action','Status','Source_URL','Payload_JSON'];
V18_HEADERS[V18_SHEETS.SMART_RECOMMENDATIONS] = ['Recommendation_ID','Timestamp','Type','Priority','Torn_ID','Name','Recommendation','Reason','Status','Assigned_To','Source_URL','Payload_JSON'];
V18_HEADERS[V18_SHEETS.SCANNER_OPT_IN] = ['Torn_ID','Name','Scanner_Version','Deep_Scanner','Sensitive_Business','Sensitive_Property','Sensitive_Education','Sensitive_Casino','Gear','Cooldowns','Risk_Flags','Last_Updated','Notes'];
V18_HEADERS[V18_SHEETS.VISUAL_SNAPSHOTS] = ['Snapshot_ID','Timestamp','Metric','Label','Value','Group','Source','Notes'];
V18_HEADERS[V18_SHEETS.TAB_ORGANIZATION] = ['Sort','Section','Sheet_Name','Color','Description','Exists','Last_Checked'];

function setupShadowCoreV18DeepScanner() {
  // v1.8.4 timeout-safe behavior: only do one tiny setup step per run.
  // Run setupShadowCoreV18DeepScannerMiniNext() repeatedly until complete.
  return setupShadowCoreV18DeepScannerMiniNext();
}

function setupShadowCoreV18DeepScannerMiniStatus() {
  var ss = ss_();
  var existing = {};
  ss.getSheets().forEach(function(sh){ existing[sh.getName()] = true; });
  var names = Object.keys(V18_HEADERS);
  var missing = names.filter(function(n){ return !existing[n]; });
  var present = names.filter(function(n){ return existing[n]; });
  return {
    ok: true,
    version: V18_VERSION,
    total: names.length,
    present_count: present.length,
    missing_count: missing.length,
    next_missing: missing[0] || '',
    missing: missing,
    message: missing.length ? 'Run setupShadowCoreV18DeepScannerMiniNext() to create/repair the next v1.8 sheet.' : 'v1.8 deep scanner sheets appear complete.'
  };
}

function setupShadowCoreV18DeepScannerMiniNext() {
  var status = setupShadowCoreV18DeepScannerMiniStatus();
  if (!status.missing_count) {
    seedV18Defaults_();
    if (typeof logAudit_ === 'function') logAudit_('system', 'setupShadowCoreV18DeepScannerMiniNext', 'v1.8 deep scanner setup complete.');
    return {ok:true, complete:true, version:V18_VERSION, message:'v1.8 deep scanner setup complete.'};
  }
  var name = status.next_missing;
  ensureV18Sheet_(name, V18_HEADERS[name]);
  SpreadsheetApp.flush();
  var after = setupShadowCoreV18DeepScannerMiniStatus();
  return {
    ok: true,
    complete: after.missing_count === 0,
    created_or_repaired: name,
    remaining: after.missing_count,
    next_missing: after.next_missing || '',
    message: after.missing_count ? 'Run setupShadowCoreV18DeepScannerMiniNext() again.' : 'v1.8 deep scanner setup complete.'
  };
}

function setupShadowCoreV18DeepScannerSeedSettings() {
  seedV18Defaults_();
  return {ok:true, version:V18_VERSION, message:'v1.8 settings seeded.'};
}

function setupShadowCoreV18DeepScannerSheet_(index) {
  var names = Object.keys(V18_HEADERS);
  var name = names[index - 1];
  if (!name) return {ok:false, index:index, error:'No v1.8 sheet at that index.'};
  ensureV18Sheet_(name, V18_HEADERS[name]);
  SpreadsheetApp.flush();
  return {ok:true, index:index, sheet:name, message:'Created/repaired one v1.8 sheet.'};
}

function setupShadowCoreV18DeepScannerSheet01(){return setupShadowCoreV18DeepScannerSheet_(1);}
function setupShadowCoreV18DeepScannerSheet02(){return setupShadowCoreV18DeepScannerSheet_(2);}
function setupShadowCoreV18DeepScannerSheet03(){return setupShadowCoreV18DeepScannerSheet_(3);}
function setupShadowCoreV18DeepScannerSheet04(){return setupShadowCoreV18DeepScannerSheet_(4);}
function setupShadowCoreV18DeepScannerSheet05(){return setupShadowCoreV18DeepScannerSheet_(5);}
function setupShadowCoreV18DeepScannerSheet06(){return setupShadowCoreV18DeepScannerSheet_(6);}
function setupShadowCoreV18DeepScannerSheet07(){return setupShadowCoreV18DeepScannerSheet_(7);}
function setupShadowCoreV18DeepScannerSheet08(){return setupShadowCoreV18DeepScannerSheet_(8);}
function setupShadowCoreV18DeepScannerSheet09(){return setupShadowCoreV18DeepScannerSheet_(9);}
function setupShadowCoreV18DeepScannerSheet10(){return setupShadowCoreV18DeepScannerSheet_(10);}
function setupShadowCoreV18DeepScannerSheet11(){return setupShadowCoreV18DeepScannerSheet_(11);}
function setupShadowCoreV18DeepScannerSheet12(){return setupShadowCoreV18DeepScannerSheet_(12);}
function setupShadowCoreV18DeepScannerSheet13(){return setupShadowCoreV18DeepScannerSheet_(13);}
function setupShadowCoreV18DeepScannerSheet14(){return setupShadowCoreV18DeepScannerSheet_(14);}
function setupShadowCoreV18DeepScannerSheet15(){return setupShadowCoreV18DeepScannerSheet_(15);}
function setupShadowCoreV18DeepScannerSheet16(){return setupShadowCoreV18DeepScannerSheet_(16);}
function setupShadowCoreV18DeepScannerSheet17(){return setupShadowCoreV18DeepScannerSheet_(17);}
function setupShadowCoreV18DeepScannerSheet18(){return setupShadowCoreV18DeepScannerSheet_(18);}
function setupShadowCoreV18DeepScannerSheet19(){return setupShadowCoreV18DeepScannerSheet_(19);}
function setupShadowCoreV18DeepScannerSheet20(){return setupShadowCoreV18DeepScannerSheet_(20);}

function seedV18Defaults_() {
  if (typeof saveSetting_ !== 'function') return;
  var settings = [
    ['V18_Deep_Scanner_Enabled','TRUE','Master switch for v1.8 deep scanner endpoints and dashboards.'],
    ['V18_Visuals_Enabled','TRUE','Show visual analytics cards and snapshots.'],
    ['V18_Reorganize_Tabs_On_Setup','FALSE','Move and color Google Sheet tabs only when run manually; FALSE avoids setup timeouts.'],
    ['V18_Use_Section_Tabs','TRUE','Create visual section marker tabs in Google Sheets.'],
    ['V18_Sensitive_Data_Default','OPT_IN','Sensitive member data categories remain opt-in by default.'],
    ['V18_Smart_Recommendations_Enabled','TRUE','Generate recommendation rows from scanner/API/score data.']
  ];
  settings.forEach(function(r){ upsertRowByKey_(APP.SHEETS.SETTINGS, 'Key', r[0], {Key:r[0], Value:r[1], Description:r[2]}); });
}

function ensureV18Sheet_(name, headers) {
  // v1.8.4: minimal sheet creation/repair to avoid Spreadsheet service timeouts.
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    SpreadsheetApp.flush();
  }

  headers = headers || [];
  var hasHeader = false;
  try {
    hasHeader = sh.getLastRow() >= 1 && sh.getLastColumn() >= 1 && String(sh.getRange(1,1).getValue() || '') !== '';
  } catch (e) {
    hasHeader = false;
  }

  if (!hasHeader && headers.length) {
    // Do not clear, format, auto-resize, freeze, or color here. Those operations caused timeouts on large projects.
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (headers.length) {
    // Lightweight header repair only. Add missing headers to the right without full formatting.
    var lastCol = Math.max(sh.getLastColumn(), 1);
    var current = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    var missing = headers.filter(function(h){ return current.indexOf(h) === -1; });
    if (missing.length) {
      sh.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
    }
  }
  return sh;
}

function scannerSubmitV18DeepScan_(body) {
  if (typeof boolSetting_ === 'function' && !boolSetting_('V18_Deep_Scanner_Enabled', true)) throw new Error('v1.8 deep scanner is disabled.');
  setupV18IfMissing_();
  body = body || {};
  var member = (typeof scannerMember_ === 'function') ? scannerMember_(body) : {tornId:String(body.memberTornId||''), name:String(body.memberName||'')};
  var d = body.deepScan || body.payload || {};
  var scan = d.scan || body.scan || {};
  var cats = d.categories || [];
  var count = 0;
  if (d.armory) { storeV18Armory_(member,d.armory,scan); count++; }
  if (d.factionProgress) { storeV18Faction_(member,d.factionProgress,scan); count++; }
  if (d.ocResult) { storeV18OC_(member,d.ocResult,scan); count++; }
  if (d.business) { storeV18Business_(member,d.business,scan); count++; }
  if (d.property) { storeV18Property_(member,d.property,scan); count++; }
  if (d.education) { storeV18Education_(member,d.education,scan); count++; }
  if (d.merit) { storeV18Merit_(member,d.merit,scan); count++; }
  if (d.mission) { storeV18Mission_(member,d.mission,scan); count++; }
  if (d.racing) { storeV18Racing_(member,d.racing,scan); count++; }
  if (d.casino) { storeV18Casino_(member,d.casino,scan); count++; }
  if (d.gear) { storeV18Gear_(member,d.gear,scan); count++; }
  if (d.reviver) { storeV18Reviver_(member,d.reviver,scan); count++; }
  if (d.cooldowns) { storeV18Cooldowns_(member,d.cooldowns,scan); count++; }
  if (d.eventNews) { storeV18EventNews_(member,d.eventNews,scan); count++; }
  if (d.riskFlags) { storeV18RiskFlags_(member,d.riskFlags,scan); count++; }
  if (d.recommendations) { storeV18Recommendations_(member,d.recommendations,scan); count++; }
  updateV18OptIn_(member, d);
  appendV18_(V18_SHEETS.VISUAL_SNAPSHOTS, {Snapshot_ID:'VS-'+uuid8_(), Timestamp:nowIso_(), Metric:'deep_scan_categories', Label:String(scan.pageType||'page'), Value:cats.length, Group:'scanner', Source:'scanner_v1_8', Notes:(d.summary || '')});
  if (typeof scannerAudit_ === 'function') scannerAudit_(member.tornId, member.name, 'scannerSubmitV18DeepScan', scan.pageType || '', scan.url || '', count, 'OK', cats.join(', '));
  return {ok:true, version:V18_VERSION, categories:cats, rowsWritten:count};
}

function setupV18IfMissing_() {
  var ss = ss_();
  if (!ss.getSheetByName(V18_SHEETS.SMART_RECOMMENDATIONS)) {
    // Avoid full setup during a live scanner submission. Create only the sheet currently being appended.
    ensureV18Sheet_(V18_SHEETS.SMART_RECOMMENDATIONS, V18_HEADERS[V18_SHEETS.SMART_RECOMMENDATIONS]);
  }
}
function uuid8_() { return Utilities.getUuid().slice(0,8).toUpperCase(); }
function jsonV18_(o) { return JSON.stringify(o || {}, function(k,v){ if (/key|token|secret|password/i.test(k)) return '[redacted]'; return v; }).slice(0,50000); }
function appendV18_(sheet, obj) { ensureV18Sheet_(sheet, V18_HEADERS[sheet]); var sh=ss_().getSheetByName(sheet); var hs=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String); sh.appendRow(hs.map(function(h){return obj[h]!==undefined?obj[h]:'';})); return obj; }

function storeV18Armory_(m, a, scan) {
  (a.items || []).slice(0,25).forEach(function(it){ appendV18_(V18_SHEETS.ARMORY_STOCK,{Stock_ID:'AS-'+uuid8_(),Timestamp:nowIso_(),Item:it.item||it.name||'',Category:it.category||'',Quantity:it.quantity||'',Estimated_Value:it.price||it.value||'',Source:'scanner',Submitted_By_ID:m.tornId,Submitted_By_Name:m.name,Status:'Observed',Notes:a.notes||'',Payload_JSON:jsonV18_(it)}); });
  appendV18_(V18_SHEETS.ARMORY_NEWS,{News_ID:'AN-'+uuid8_(),Timestamp:nowIso_(),Event_Type:'scan',Torn_ID:m.tornId,Name:m.name,Item:(a.items&&a.items[0]&&(a.items[0].item||a.items[0].name))||'',Quantity:'',Direction:'observed',Source:'scanner',Notes:a.notes||'',Payload_JSON:jsonV18_(a)});
}
function storeV18Faction_(m, f, scan) { appendV18_(V18_SHEETS.FACTION_RESPECT_UPGRADES,{Snapshot_ID:'FR-'+uuid8_(),Timestamp:nowIso_(),Faction_ID:f.factionId||'',Faction_Name:f.factionName||'',Respect:f.respect||'',Rank:f.rank||'',Members:f.members||'',Upgrade_Branch:f.branch||'',Upgrade_Level:f.level||'',Next_Goal:f.nextGoal||'',Source_URL:scan.url||'',Payload_JSON:jsonV18_(f)}); }
function storeV18OC_(m, o, scan) { appendV18_(V18_SHEETS.OC_RESULT_HISTORY,{OC_Result_ID:'OC-'+uuid8_(),Timestamp:nowIso_(),Crime:o.crime||'',Result:o.result||'',Participants:o.participants||m.name,Reward:o.reward||'',Penalty:o.penalty||'',Reliability_Notes:o.notes||'',Submitted_By_ID:m.tornId,Submitted_By_Name:m.name,Source_URL:scan.url||'',Payload_JSON:jsonV18_(o)}); }
function storeV18Business_(m, b, scan) { appendV18_(V18_SHEETS.MEMBER_BUSINESS_SNAPSHOTS,{Snapshot_ID:'BS-'+uuid8_(),Timestamp:nowIso_(),Torn_ID:m.tornId,Name:m.name,Business_Type:b.type||'bazaar/business',Item_Count:b.itemCount||'',Estimated_Value:b.value||'',Income_Note:b.notes||'',Opt_In:'TRUE',Source_URL:scan.url||'',Payload_JSON:jsonV18_(b)}); }
function storeV18Property_(m, p, scan) { appendV18_(V18_SHEETS.PROPERTY_TRAINING_NOTES,{Note_ID:'PN-'+uuid8_(),Timestamp:nowIso_(),Torn_ID:m.tornId,Name:m.name,Property:p.property||'',Vault:p.vault||'',Happy_Bonus:p.happyBonus||'',Rental_Ends:p.rentalEnds||'',Training_Value:p.trainingValue||'',Opt_In:'TRUE',Source_URL:scan.url||'',Notes:p.notes||'',Payload_JSON:jsonV18_(p)}); }
function storeV18Education_(m, e, scan) { appendV18_(V18_SHEETS.EDUCATION_TRACKING,{Education_ID:'ED-'+uuid8_(),Timestamp:nowIso_(),Torn_ID:m.tornId,Name:m.name,Course:e.course||'',Status:e.status||'',Completion_Date:e.completionDate||'',Recommended_Next:e.recommendedNext||'',Opt_In:'TRUE',Source_URL:scan.url||'',Notes:e.notes||'',Payload_JSON:jsonV18_(e)}); }
function storeV18Merit_(m, mer, scan) { appendV18_(V18_SHEETS.MERIT_AWARD_PROGRESS,{Merit_ID:'MP-'+uuid8_(),Timestamp:nowIso_(),Torn_ID:m.tornId,Name:m.name,Merits_Available:mer.available||'',Award_Progress:mer.summary||mer.progress||'',Recommended_Spend:mer.recommendedSpend||'',Opt_In:'TRUE',Source_URL:scan.url||'',Notes:mer.notes||'',Payload_JSON:jsonV18_(mer)}); }
function storeV18Mission_(m, mi, scan) { appendV18_(V18_SHEETS.MISSION_TRACKING,{Mission_ID:'MI-'+uuid8_(),Timestamp:nowIso_(),Torn_ID:m.tornId,Name:m.name,Mission:mi.summary||mi.mission||'',Status:mi.status||'',Difficulty:mi.difficulty||'',Reward_Note:mi.rewardNote||'',Opt_In:'TRUE',Source_URL:scan.url||'',Notes:mi.notes||'',Payload_JSON:jsonV18_(mi)}); }
function storeV18Racing_(m, r, scan) { appendV18_(V18_SHEETS.RACING_PROGRESS,{Racing_ID:'RA-'+uuid8_(),Timestamp:nowIso_(),Torn_ID:m.tornId,Name:m.name,Racing_Skill:r.skill||'',Class:r.class||'',Car:r.car||'',Result:r.result||'',Event_ID:r.eventId||'',Opt_In:'TRUE',Source_URL:scan.url||'',Notes:r.notes||r.summary||'',Payload_JSON:jsonV18_(r)}); }
function storeV18Casino_(m, c, scan) { appendV18_(V18_SHEETS.CASINO_BANKROLL,{Casino_ID:'CB-'+uuid8_(),Timestamp:nowIso_(),Torn_ID:m.tornId,Name:m.name,Game:c.game||c.summary||'',Result:c.result||'',Amount:c.amount||'',Bankroll_Note:c.note||'',Event_ID:c.eventId||'',Opt_In:'TRUE',Source_URL:scan.url||'',Notes:c.notes||'',Payload_JSON:jsonV18_(c)}); }
function storeV18Gear_(m, g, scan) { var items=g.items&&g.items.length?g.items:[g]; items.slice(0,25).forEach(function(it){ appendV18_(V18_SHEETS.GEAR_ITEM_SCANS,{Gear_ID:'GI-'+uuid8_(),Timestamp:nowIso_(),Item:it.item||it.name||g.summary||'',Category:it.category||'',Quality:it.quality||'',Damage:it.damage||'',Accuracy:it.accuracy||'',Armor:it.armor||'',Bonus:it.bonus||'',Price:it.price||'',Seller_ID:it.sellerId||'',Seller_Name:it.sellerName||'',Faction_Need:it.factionNeed||'',Source_URL:scan.url||'',Payload_JSON:jsonV18_(it)}); }); }
function storeV18Reviver_(m, r, scan) { appendV18_(V18_SHEETS.REVIVER_PERFORMANCE,{Revive_ID:'RV-'+uuid8_(),Timestamp:nowIso_(),Reviver_ID:r.reviverId||m.tornId,Reviver_Name:r.reviverName||m.name,Target_ID:r.targetId||'',Target_Name:r.targetName||'',Response_Time:r.responseTime||'',Cost:r.cost||'',War_ID:r.warId||'',Result:r.result||'',Source_URL:scan.url||'',Notes:r.notes||r.summary||'',Payload_JSON:jsonV18_(r)}); }
function storeV18Cooldowns_(m, c, scan) { appendV18_(V18_SHEETS.COOLDOWN_FORECASTS,{Forecast_ID:'CF-'+uuid8_(),Timestamp:nowIso_(),Torn_ID:m.tornId,Name:m.name,Drug_CD:c.drug||'',Medical_CD:c.medical||'',Booster_CD:c.booster||'',Energy:c.energy||'',Life:c.life||'',Ready_At:c.readyAt||'',War_Ready:c.warReady||'',Source:'scanner/api',Payload_JSON:jsonV18_(c)}); }
function storeV18EventNews_(m, e, scan) { appendV18_(V18_SHEETS.EVENT_NEWS_SCANS,{Event_News_ID:'EV-'+uuid8_(),Timestamp:nowIso_(),Event_Type:e.type||scan.pageType||'',Title:e.title||'Scanner event/news context',Priority:e.priority||'Normal',Related_ID:e.relatedId||'',Source_URL:scan.url||'',Summary:e.summary||'',Payload_JSON:jsonV18_(e)}); }
function storeV18RiskFlags_(m, risks, scan) { (risks||[]).forEach(function(r){ appendV18_(V18_SHEETS.MEMBER_RISK_FLAGS,{Risk_ID:'RF-'+uuid8_(),Timestamp:nowIso_(),Torn_ID:r.tornId||m.tornId,Name:r.name||m.name,Risk_Type:r.type||'',Severity:r.severity||'Low',Evidence:r.details||r.evidence||'',Recommended_Action:r.recommendedAction||'Review',Status:'Open',Source_URL:scan.url||'',Payload_JSON:jsonV18_(r)}); }); }
function storeV18Recommendations_(m, recs, scan) { (recs||[]).forEach(function(r){ appendV18_(V18_SHEETS.SMART_RECOMMENDATIONS,{Recommendation_ID:'SR-'+uuid8_(),Timestamp:nowIso_(),Type:r.type||'',Priority:r.priority||'normal',Torn_ID:r.tornId||m.tornId,Name:r.name||m.name,Recommendation:r.recommendation||'',Reason:r.reason||'',Status:'Open',Assigned_To:r.assignedTo||'',Source_URL:scan.url||'',Payload_JSON:jsonV18_(r)}); }); }

function updateV18OptIn_(m, d) {
  var row = {Torn_ID:m.tornId,Name:m.name,Scanner_Version:'1.8.0',Deep_Scanner:String(!!d.categories),Sensitive_Business:String(!!d.business),Sensitive_Property:String(!!d.property),Sensitive_Education:String(!!d.education),Sensitive_Casino:String(!!d.casino),Gear:String(!!d.gear),Cooldowns:String(!!d.cooldowns),Risk_Flags:String(!!d.riskFlags),Last_Updated:nowIso_(),Notes:'Updated from scanner deep payload'};
  ensureV18Sheet_(V18_SHEETS.SCANNER_OPT_IN,V18_HEADERS[V18_SHEETS.SCANNER_OPT_IN]);
  var sh = ss_().getSheetByName(V18_SHEETS.SCANNER_OPT_IN); var vals=sh.getDataRange().getValues(); var headers=vals[0].map(String); var idCol=headers.indexOf('Torn_ID'); var rowNum=-1;
  for (var i=1;i<vals.length;i++){ if(String(vals[i][idCol])===String(m.tornId)){rowNum=i+1;break;} }
  var arr=headers.map(function(h){return row[h]!==undefined?row[h]:'';}); if(rowNum>-1) sh.getRange(rowNum,1,1,headers.length).setValues([arr]); else sh.appendRow(arr);
}

function getV18ScannerOptInState(tornId) { setupV18IfMissing_(); var rows = readV18_(V18_SHEETS.SCANNER_OPT_IN).filter(function(r){return String(r.Torn_ID)===String(tornId);}); return {ok:true, optIn:rows[0]||null}; }

function readV18_(sheet, limit) { ensureV18Sheet_(sheet,V18_HEADERS[sheet]); var sh=ss_().getSheetByName(sheet); var values=sh.getDataRange().getValues(); if(values.length<2)return[]; var hs=values[0].map(String), out=[], max=limit?Math.min(values.length,limit+1):values.length; for(var r=1;r<max;r++){var row={},empty=true; for(var c=0;c<hs.length;c++){row[hs[c]]=values[r][c]; if(values[r][c]!==''&&values[r][c]!==null)empty=false;} if(!empty)out.push(row);} return out; }

function getV18State_() {
  setupV18IfMissing_();
  return {
    version: V18_VERSION,
    visuals: getV18VisualData_(),
    optIns: readV18_(V18_SHEETS.SCANNER_OPT_IN,200).slice(-200),
    recommendations: readV18_(V18_SHEETS.SMART_RECOMMENDATIONS,300).slice(-300),
    riskFlags: readV18_(V18_SHEETS.MEMBER_RISK_FLAGS,300).slice(-300),
    armoryStock: readV18_(V18_SHEETS.ARMORY_STOCK,300).slice(-300),
    factionProgress: readV18_(V18_SHEETS.FACTION_RESPECT_UPGRADES,200).slice(-200),
    ocResults: readV18_(V18_SHEETS.OC_RESULT_HISTORY,200).slice(-200),
    cooldowns: readV18_(V18_SHEETS.COOLDOWN_FORECASTS,300).slice(-300),
    gear: readV18_(V18_SHEETS.GEAR_ITEM_SCANS,300).slice(-300),
    education: readV18_(V18_SHEETS.EDUCATION_TRACKING,200).slice(-200),
    tabs: readV18_(V18_SHEETS.TAB_ORGANIZATION,300)
  };
}

function getV18VisualData_() {
  setupV18IfMissing_();
  var counts = {};
  Object.keys(V18_SHEETS).forEach(function(k){ var name=V18_SHEETS[k]; if (name === V18_SHEETS.TAB_ORGANIZATION) return; counts[name] = readV18_(name,5000).length; });
  var statusRows = (typeof v22MergedMemberStatuses_ === 'function') ? v22MergedMemberStatuses_() : ((typeof readTable_ === 'function') ? readTable_(APP.SHEETS.MEMBER_STATUS) : []);
  var statusCounts = {Okay:0,Hospital:0,Jail:0,Travel:0,Other:0};
  statusRows.forEach(function(s){ var t=String(s.Status||'').toLowerCase(); if(t.indexOf('hospital')>-1)statusCounts.Hospital++; else if(t.indexOf('jail')>-1)statusCounts.Jail++; else if(t.indexOf('travel')>-1||t.indexOf('abroad')>-1)statusCounts.Travel++; else if(t.indexOf('okay')>-1||t==='ok')statusCounts.Okay++; else statusCounts.Other++; });
  var recs = readV18_(V18_SHEETS.SMART_RECOMMENDATIONS,5000);
  var recCounts = {}; recs.forEach(function(r){ recCounts[r.Type||'Other']=(recCounts[r.Type||'Other']||0)+1; });
  var risks = readV18_(V18_SHEETS.MEMBER_RISK_FLAGS,5000); var riskCounts={}; risks.forEach(function(r){riskCounts[r.Severity||'Unknown']=(riskCounts[r.Severity||'Unknown']||0)+1;});
  return {counts:counts,statusCounts:statusCounts,recommendationCounts:recCounts,riskCounts:riskCounts,latestVisualSnapshots:readV18_(V18_SHEETS.VISUAL_SNAPSHOTS,200).slice(-200)};
}

function generateV18VisualSnapshot() {
  setupV18IfMissing_();
  var data = getV18VisualData_();
  Object.keys(data.counts).forEach(function(k){ appendV18_(V18_SHEETS.VISUAL_SNAPSHOTS,{Snapshot_ID:'VS-'+uuid8_(),Timestamp:nowIso_(),Metric:'sheet_rows',Label:k,Value:data.counts[k],Group:'v1.8',Source:'generateV18VisualSnapshot',Notes:''}); });
  return {ok:true, snapshot:nowIso_(), metrics:Object.keys(data.counts).length};
}

function generateV18SmartRecommendations() {
  setupV18IfMissing_();
  var made = 0;
  var readiness = (typeof readTable_ === 'function' && typeof SCANNER !== 'undefined') ? (function(){ try{return readTable_(SCANNER.MEMBER_READINESS_SHEET).slice(-300);}catch(e){return[];} })() : [];
  readiness.forEach(function(r){ var score=Number(r.Readiness_Score||0); if(score>=80){ storeV18Recommendations_({tornId:r.Torn_ID,name:r.Name},[{type:'war',priority:'normal',recommendation:'Consider assigning to active war/chain targets.',reason:'Readiness score '+score}],{url:'smart-recommendations'}); made++; } else if(score>0&&score<40){ storeV18RiskFlags_({tornId:r.Torn_ID,name:r.Name},[{type:'low_readiness',severity:'Medium',details:'Readiness score '+score,recommendedAction:'Check blockers or support needs'}],{url:'smart-recommendations'}); made++; } });
  var loans = (typeof readTable_ === 'function') ? readTable_(APP.SHEETS.LOAN_COLLATERAL).slice(-500) : [];
  loans.forEach(function(l){ if(String(l.Status||'').toLowerCase()==='active' && l.Due_Date){ storeV18Recommendations_({tornId:l.Torn_ID,name:l.Name},[{type:'loan',priority:'normal',recommendation:'Review active loan/collateral status.',reason:'Loan due date: '+l.Due_Date}],{url:'smart-recommendations'}); made++; } });
  return {ok:true, recommendationsCreated:made};
}

function reorganizeShadowCoreSheetsV18() {
  // v1.8.5 timeout-safe behavior: only move/color ONE tab per run.
  // Run reorganizeShadowCoreSheetsV18MiniNext() repeatedly until complete.
  return reorganizeShadowCoreSheetsV18MiniNext();
}

function reorganizeShadowCoreSheetsV18Reset() {
  PropertiesService.getScriptProperties().deleteProperty('V18_REORG_INDEX');
  return {ok:true, message:'v1.8 tab organizer progress reset. Run reorganizeShadowCoreSheetsV18MiniNext().'};
}

function reorganizeShadowCoreSheetsV18MiniStatus() {
  var flat = getV18FlatTabOrder_();
  var index = Number(PropertiesService.getScriptProperties().getProperty('V18_REORG_INDEX') || 0);
  if (index < 0) index = 0;
  if (index > flat.length) index = flat.length;
  var next = flat[index] || null;
  return {
    ok: true,
    version: V18_VERSION,
    total_steps: flat.length,
    completed_steps: index,
    remaining_steps: Math.max(0, flat.length - index),
    complete: index >= flat.length,
    next_step: next ? {sheet: next.name, section: next.section, marker: !!next.marker, position: next.position} : null,
    message: index >= flat.length ? 'Tab organization complete.' : 'Run reorganizeShadowCoreSheetsV18MiniNext() to organize the next tab.'
  };
}

function reorganizeShadowCoreSheetsV18MiniNext() {
  var props = PropertiesService.getScriptProperties();
  var flat = getV18FlatTabOrder_();
  var index = Number(props.getProperty('V18_REORG_INDEX') || 0);
  if (index < 0) index = 0;
  if (index >= flat.length) {
    return {ok:true, complete:true, version:V18_VERSION, message:'Tab organization complete.'};
  }

  var step = flat[index];
  var ss = ss_();
  var sh = ss.getSheetByName(step.name);
  var created = false;

  // Only create section marker sheets. Do not create missing data sheets here; sheet creation belongs to setup functions.
  if (!sh && step.marker) {
    sh = ss.insertSheet(step.name);
    created = true;
  }

  var exists = !!sh;
  if (sh) {
    try { sh.setTabColor(step.color); } catch(e) {}
    try {
      ss.setActiveSheet(sh);
      ss.moveActiveSheet(step.position);
    } catch(e2) {}
    if (step.marker) {
      try {
        sh.clear();
        sh.getRange(1,1).setValue(step.description).setFontWeight('bold').setBackground(step.color).setFontColor('#ffffff');
        sh.setFrozenRows(1);
      } catch(e3) {}
    }
  }

  // Record very light progress without forcing every row write. Full log can be built after completion.
  props.setProperty('V18_REORG_INDEX', String(index + 1));
  return {
    ok: true,
    complete: index + 1 >= flat.length,
    step: index + 1,
    total_steps: flat.length,
    moved_or_checked: step.name,
    section: step.section,
    marker: !!step.marker,
    exists: exists,
    created: created,
    remaining_steps: Math.max(0, flat.length - index - 1),
    message: index + 1 >= flat.length ? 'Tab organization complete.' : 'Run reorganizeShadowCoreSheetsV18MiniNext() again.'
  };
}

function reorganizeShadowCoreSheetsV18Section01(){return reorganizeShadowCoreSheetsV18MiniNext();}
function reorganizeShadowCoreSheetsV18Section02(){return reorganizeShadowCoreSheetsV18MiniNext();}
function reorganizeShadowCoreSheetsV18Section03(){return reorganizeShadowCoreSheetsV18MiniNext();}
function reorganizeShadowCoreSheetsV18Section04(){return reorganizeShadowCoreSheetsV18MiniNext();}
function reorganizeShadowCoreSheetsV18Section05(){return reorganizeShadowCoreSheetsV18MiniNext();}
function reorganizeShadowCoreSheetsV18Section06(){return reorganizeShadowCoreSheetsV18MiniNext();}
function reorganizeShadowCoreSheetsV18Section07(){return reorganizeShadowCoreSheetsV18MiniNext();}
function reorganizeShadowCoreSheetsV18Section08(){return reorganizeShadowCoreSheetsV18MiniNext();}
function reorganizeShadowCoreSheetsV18Section09(){return reorganizeShadowCoreSheetsV18MiniNext();}
function reorganizeShadowCoreSheetsV18Section10(){return reorganizeShadowCoreSheetsV18MiniNext();}

function buildV18TabOrganizationLog() {
  var ss = ss_();
  var rows = [];
  var flat = getV18FlatTabOrder_();
  flat.forEach(function(step, idx){
    rows.push({
      Sort: idx + 1,
      Section: step.section,
      Sheet_Name: step.name,
      Color: step.color,
      Description: step.description,
      Exists: String(!!ss.getSheetByName(step.name)).toUpperCase(),
      Last_Checked: nowIso_()
    });
  });
  ensureV18Sheet_(V18_SHEETS.TAB_ORGANIZATION,V18_HEADERS[V18_SHEETS.TAB_ORGANIZATION]);
  var sh = ss.getSheetByName(V18_SHEETS.TAB_ORGANIZATION);
  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();
  rows.forEach(function(r){ appendV18_(V18_SHEETS.TAB_ORGANIZATION,r); });
  return {ok:true, rows:rows.length, message:'Tab_Organization log rebuilt.'};
}

function getV18FlatTabOrder_() {
  var order = getV18TabOrder_();
  var useMarkers = typeof boolSetting_ === 'function' ? boolSetting_('V18_Use_Section_Tabs', true) : true;
  var flat = [];
  var pos = 1;
  order.forEach(function(sec){
    if (useMarkers) {
      flat.push({name:'━━ ' + sec.section + ' ━━', section:sec.section, color:sec.color, description:sec.description, marker:true, position:pos++});
    }
    sec.sheets.forEach(function(name){
      flat.push({name:name, section:sec.section, color:sec.color, description:sec.description, marker:false, position:pos++});
    });
  });
  return flat;
}

function setupV18IfMissingNoReorg_(){
  // Deprecated in v1.8.5 for organizer use. Creating many sheets here caused timeouts.
  // Use setupShadowCoreV18DeepScannerMiniNext() to create v1.8 sheets safely.
  return setupShadowCoreV18DeepScannerMiniStatus();
}

function getV18TabOrder_() {
  return [
    {section:'00 SETUP / SECURITY', color:'#111827', description:'Setup, access, privacy, diagnostics, backups.', sheets:['Settings','Setup_Wizard','Setup_Checklist','Privacy_Consents','Member_Tokens','API_Keys','API_Key_Health','Diagnostics','Backups','Version_Log','Safe_Mode_Log','Sheet_Protections','Admin_Manual']},
    {section:'01 MEMBER CORE', color:'#2563eb', description:'Members, statuses, scorecards, onboarding, life pages.', sheets:['Members','Member_Status','Member_Scorecards','Member_Availability','Availability_Calendar','Onboarding','Onboarding_Progress','Mentorships','Training_Tracker','Training_Growth_Snapshots','Education_Tracking','Merit_Award_Progress','Mission_Tracking','Racing_Progress','Casino_Bankroll']},
    {section:'02 WAR / CHAINS', color:'#dc2626', description:'Wars, attacks, chains, targets, commitments, strike teams.', sheets:['Wars','War_Attacks','War_Targets','War_Commitments','Battle_Plans','Chain_Log','Chain_Plans','Strike_Teams','Assignment_Tracking','Member_Readiness_Snapshots','War_Readiness_Scores','Cooldown_Forecasts']},
    {section:'03 SCANNER / INTEL', color:'#7c3aed', description:'Scanner logs, enemy intel, scout submissions, profile notes.', sheets:['Scanner_Settings','Scanner_Audit','Scanner_Installs','Scanner_Health_Stats','Auto_Enrichment_Log','Scout_Submissions','Profile_Notes','Enemy_Factions','Enemy_Players','Enemy_Profile_Enrichment','Faction_Roster_Snapshots','Auto_Recruit_Leads','Recruit_Leads','Scanner_Opt_In_Preferences','API_Snapshots','API_Key_Health_Snapshots']},
    {section:'04 ECONOMY / SUPPORT', color:'#059669', description:'Treasury, payouts, loans, support, armory, revives.', sheets:['Payout_Rules','Payouts','Payout_History','Bank_Ledger','Treasury_Reports','Economy_Ledger','Loan_Collateral','Trade_Logs','Support_Context','Armory_Requests','Armory_Loans','Armory_Stock','Armory_News','Revive_Board','Hospital_Scans','Reviver_Performance','Market_Notes','Travel_Logs','Member_Business_Snapshots','Property_Training_Notes']},
    {section:'05 RECRUITING / PUBLIC', color:'#f59e0b', description:'Applications, vetting, microsite, public-facing info.', sheets:['Applications','Application_Notes','Applicant_Vetting','Recruit_Microsite','Auto_Recruit_Leads']},
    {section:'06 FACTION OPS', color:'#0891b2', description:'OC, promotions, awards, rules, tasks, polls, events, knowledge.', sheets:['OC_Planner','OC_Result_History','Promotions','Awards','Rules','Rule_Checks','Discipline_Log','Member_Risk_Flags','Smart_Recommendations','Officer_Tasks','Polls','Poll_Votes','Events','Event_News_Scans','Knowledge_Base','Announcements','Faction_Status','Faction_Respect_Upgrades']},
    {section:'07 REPORTS / VISUALS', color:'#9333ea', description:'Reports, charts, Discord outputs, HTML snippets, legacy BBCode archives, visual snapshots.', sheets:['Reports','HTML_Snippets','BBCode_Snippets','Discord_Alerts','Discord_Commands','Scanner_Discord_Triggers','Visual_Snapshots','Tab_Organization']},
    {section:'99 SYSTEM', color:'#6b7280', description:'Audit, errors, cache.', sheets:['Audit_Log','Errors','Cache']}
  ];
}

function getV18FeatureSummary() {
  return {ok:true, version:V18_VERSION, features:['Armory stock/news','Faction respect/upgrades','OC result history','Member business snapshots','Property/training setup','Education/course tracking','Merit/award progress','Mission tracking','Racing progress','Casino/bankroll tracking','Gear item scanning','Reviver performance','Cooldown forecasting','Event/news scans','Member risk flags','Faction competition tracking','Smart recommendations'], sheets:Object.keys(V18_HEADERS)};
}

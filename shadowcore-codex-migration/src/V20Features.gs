/**
 * ShadowCore HQ v2.0 - Gym Gains Lab
 * Vladar formula calculator, projections, goal estimator, gym comparison, jump presets,
 * optional API bonus parser, and training cost estimates.
 *
 * Formula source: Torn Wiki training formula / Vladar constants.
 */

var V20_VERSION = '2.0.0';
var V20_SHEETS = {
  SETTINGS: 'Gym_Settings',
  CALCS: 'Gym_Calculations',
  SESSIONS: 'Gym_Sessions',
  PROJECTIONS: 'Gym_Projections',
  GOALS: 'Gym_Goal_Estimates',
  COMPARISON: 'GymGainComparison',
  PRESETS: 'Gym_Jump_Presets',
  API_BONUSES: 'Gym_API_Bonus_Snapshots',
  COSTS: 'Gym_Consumable_Costs',
  VIEW: 'GymGainProjectionView',
  GOAL_VIEW: 'GymGoalEstimatorView'
};

var V20_HEADERS = {};
V20_HEADERS[V20_SHEETS.SETTINGS] = ['Key','Value','Description'];
V20_HEADERS[V20_SHEETS.CALCS] = ['Calc_ID','Timestamp','Torn_ID','Name','Mode','Stat','Current_Stat','Goal_Stat','Gym','Gym_Dots','Energy_Per_Train','Energy_Used','Starting_Happy','Ending_Happy','Modifier','Gains','Ending_Stat','Preset','Input_JSON','Result_JSON'];
V20_HEADERS[V20_SHEETS.SESSIONS] = ['Calc_ID','Timestamp','Torn_ID','Name','Stat','Gym','Preset','Energy_Used','Trains','Starting_Stat','Gains','Ending_Stat','Starting_Happy','Ending_Happy','Modifier','Notes'];
V20_HEADERS[V20_SHEETS.PROJECTIONS] = ['Projection_ID','Timestamp','Torn_ID','Name','Stat','Gym','Days','Preset','Starting_Stat','Ending_Stat','Total_Gains','Daily_Avg_Gains','Energy_Total','Natural_Energy','Xanax_Count','Refill_Count','Extra_Energy','Xanax_Cost','Refill_Cost','Extra_Cost','Total_Cost','Result_JSON'];
V20_HEADERS[V20_SHEETS.GOALS] = ['Goal_ID','Timestamp','Torn_ID','Name','Stat','Gym','Starting_Stat','Goal_Stat','Days_Estimated','Total_Gains','Energy_Total','Xanax_Count','Refill_Count','Total_Cost','Preset','Result_JSON'];
V20_HEADERS[V20_SHEETS.COMPARISON] = ['Comparison_ID','Timestamp','Torn_ID','Name','Stat','Current_Stat','Happy','Energy','Modifier','Gym','Energy_Per_Train','Gym_Dots','Single_Session_Gains','Gains_Per_Energy','Rank','Notes'];
V20_HEADERS[V20_SHEETS.PRESETS] = ['Preset_ID','Name','Description','Days','Energy_Per_Day','Natural_Energy_Per_Day','Xanax_Per_Day','Refills_Per_Day','Extra_Energy_Per_Day','Start_Happy','Happy_Reset_Per_Day','Happy_Loss_Factor','Xanax_Cost','Refill_Cost','Extra_Cost_Per_Energy','Active'];
V20_HEADERS[V20_SHEETS.API_BONUSES] = ['Snapshot_ID','Timestamp','Torn_ID','Name','Status','Stats_JSON','Bars_JSON','Cooldowns_JSON','Detected_Bonuses_JSON','Recommended_Modifier','Detected_Stat_Focus','Raw_Summary','Notes'];
V20_HEADERS[V20_SHEETS.COSTS] = ['Cost_ID','Timestamp','Preset','Days','Natural_Energy','Xanax_Count','Refill_Count','Extra_Energy','Xanax_Cost','Refill_Cost','Extra_Cost','Total_Cost','Notes'];
V20_HEADERS[V20_SHEETS.VIEW] = ['Projection_ID','Generated','Day','Stat','Gym','Starting_Stat','Gains','Ending_Stat','Happy_Start','Happy_End','Energy_Used','Cost_To_Date'];
V20_HEADERS[V20_SHEETS.GOAL_VIEW] = ['Goal_ID','Generated','Stat','Gym','Goal_Stat','Estimated_Days','Total_Cost','Average_Daily_Gain','Recommendation','Notes'];

var V20_VLADAR = {
  a: 3.480061091e-7,
  b: 250,
  c: 3.091619094e-6,
  d: 6.82775184551527e-5,
  e: -0.0301431777
};

var V20_GYMS = [
  ['Premier Fitness',5,2.0,2.0,2.0,2.0,'Light'],
  ['Average Joes',5,2.4,2.4,2.8,2.4,'Light'],
  ["Woody's Workout",5,2.8,3.2,3.0,2.8,'Light'],
  ['Beach Bods',5,3.2,3.2,3.2,0,'Light'],
  ['Silver Gym',5,3.4,3.6,3.4,3.2,'Light'],
  ['Pour Femme',5,3.4,3.6,3.6,3.8,'Light'],
  ['Davies Den',5,3.7,0,3.7,3.7,'Light'],
  ['Global Gym',5,4.0,4.0,4.0,4.0,'Light'],
  ['Knuckle Heads',10,4.8,4.4,4.0,4.2,'Middle'],
  ['Pioneer Fitness',10,4.4,4.5,4.8,4.4,'Middle'],
  ['Anabolic Anomalies',10,5.0,4.5,5.2,4.5,'Middle'],
  ['Core',10,5.0,5.2,5.0,5.0,'Middle'],
  ['Racing Fitness',10,5.0,5.4,4.8,5.2,'Middle'],
  ['Complete Cardio',10,5.5,5.8,5.5,5.2,'Middle'],
  ['Legs, Bums and Tums',10,0,5.6,5.6,5.8,'Middle'],
  ['Deep Burn',10,6.0,6.0,6.0,6.0,'Middle'],
  ['Apollo Gym',10,6.0,6.2,6.4,6.2,'Heavy'],
  ['Gun Shop',10,6.6,6.4,6.2,6.2,'Heavy'],
  ['Force Training',10,6.4,6.6,6.4,6.8,'Heavy'],
  ["Cha Cha's",10,6.4,6.4,6.8,7.0,'Heavy'],
  ['Atlas',10,7.0,6.4,6.4,6.6,'Heavy'],
  ['Last Round',10,6.8,6.6,7.0,6.6,'Heavy'],
  ['The Edge',10,6.8,7.0,7.0,6.8,'Heavy'],
  ["George's",10,7.3,7.3,7.3,7.3,'Heavy'],
  ['Balboas Gym',25,0,0,7.5,7.5,'Specialist'],
  ['Frontline Fitness',25,7.5,7.5,0,0,'Specialist'],
  ['Gym 3000',50,8.0,0,0,0,'Specialist'],
  ['Mr. Isoyamas',50,0,0,8.0,0,'Specialist'],
  ['Total Rebound',50,0,8.0,0,0,'Specialist'],
  ['Elites',50,0,0,0,8.0,'Specialist'],
  ['The Sports Science Lab',25,9.0,9.0,9.0,9.0,'Specialist'],
  ['Fight Club',10,10.0,10.0,10.0,10.0,'Specialist'],
  ['Jail Gym',5,3.4,3.4,4.5,0,'Jail']
];

function setupShadowCoreV20GymGainsLab() {
  var keys = Object.keys(V20_HEADERS);
  for (var i=0;i<keys.length;i++) v20EnsureSheet_(keys[i], V20_HEADERS[keys[i]]);
  seedV20Defaults_();
  logAudit_('system','setupShadowCoreV20GymGainsLab',{version:V20_VERSION, sheets:keys.length});
  return {ok:true, version:V20_VERSION, sheets:keys.length};
}

function setupShadowCoreV20GymGainsLabMiniStatus() {
  var missing=[]; Object.keys(V20_HEADERS).forEach(function(n){ if(!ss_().getSheetByName(n)) missing.push(n); });
  return {ok:true, version:V20_VERSION, missing_count:missing.length, missing:missing, complete:missing.length===0};
}

function setupShadowCoreV20GymGainsLabMiniNext() {
  var keys=Object.keys(V20_HEADERS);
  for(var i=0;i<keys.length;i++){
    var n=keys[i];
    if(!ss_().getSheetByName(n)){
      v20EnsureSheet_(n,V20_HEADERS[n]);
      return {ok:true, complete:false, created:n, remaining:setupShadowCoreV20GymGainsLabMiniStatus().missing_count};
    }
  }
  seedV20Defaults_();
  return {ok:true, complete:true, message:'Gym Gains Lab setup complete.'};
}

function setupShadowCoreV20GymGainsLabSheet01(){return v20SetupSheetByIndex_(0);} function setupShadowCoreV20GymGainsLabSheet02(){return v20SetupSheetByIndex_(1);} function setupShadowCoreV20GymGainsLabSheet03(){return v20SetupSheetByIndex_(2);} function setupShadowCoreV20GymGainsLabSheet04(){return v20SetupSheetByIndex_(3);} function setupShadowCoreV20GymGainsLabSheet05(){return v20SetupSheetByIndex_(4);} function setupShadowCoreV20GymGainsLabSheet06(){return v20SetupSheetByIndex_(5);} function setupShadowCoreV20GymGainsLabSheet07(){return v20SetupSheetByIndex_(6);} function setupShadowCoreV20GymGainsLabSheet08(){return v20SetupSheetByIndex_(7);} function setupShadowCoreV20GymGainsLabSheet09(){return v20SetupSheetByIndex_(8);} function setupShadowCoreV20GymGainsLabSheet10(){return v20SetupSheetByIndex_(9);} function setupShadowCoreV20GymGainsLabSheet11(){return v20SetupSheetByIndex_(10);}
function v20SetupSheetByIndex_(idx){ var keys=Object.keys(V20_HEADERS); var n=keys[idx]; if(!n) return {ok:false,error:'No sheet at index '+idx}; v20EnsureSheet_(n,V20_HEADERS[n]); return {ok:true,sheet:n,index:idx}; }

function v20EnsureSheet_(name, headers) {
  var ss=ss_(); var sh=ss.getSheetByName(name);
  if(!sh) sh=ss.insertSheet(name);
  if(headers && headers.length){
    var current=sh.getLastColumn()?sh.getRange(1,1,1,Math.max(headers.length,sh.getLastColumn())).getValues()[0]:[];
    var needs=false; for(var i=0;i<headers.length;i++){ if(String(current[i]||'')!==headers[i]) {needs=true; break;} }
    if(needs) sh.getRange(1,1,1,headers.length).setValues([headers]);
  }
  return sh;
}

function seedV20Defaults_(){
  Object.keys(V20_HEADERS).forEach(function(n){ if(!ss_().getSheetByName(n)) return; });
  var settings=[
    {Key:'Gym_Default_Xanax_Cost',Value:'850000',Description:'Default estimated cost per Xanax.'},
    {Key:'Gym_Default_Refill_Cost',Value:'2500000',Description:'Default equivalent cost per daily energy refill.'},
    {Key:'Gym_Default_Extra_Energy_Cost',Value:'0',Description:'Default cost per extra booster/FHC energy. Set manually if needed.'},
    {Key:'Gym_Natural_Energy_Per_Day',Value:'480',Description:'Natural energy regen per day, default 5e per 15 minutes.'},
    {Key:'Gym_Default_Happy_Loss_Factor',Value:'0.50',Description:'Happy loss per energy trained. Wiki says 40-60%; 0.50 is the midpoint.'},
    {Key:'Gym_Default_Modifier',Value:'1.00',Description:'Default multiplier after faction, education, job, book, property or other bonuses.'}
  ];
  try{upsertRowsByKey_(V20_SHEETS.SETTINGS,'Key',settings);}catch(e){logError_('seedV20 settings',e,{});} 
  var presets=[
    ['P-HJ','Basic Happy Jump','One-day happy jump style: high happy, stacked energy entered manually or by defaults.',1,1000,0,4,1,0,30000,0,0.50,Number(setting_('Gym_Default_Xanax_Cost',850000)),Number(setting_('Gym_Default_Refill_Cost',2500000)),0,'TRUE'],
    ['P-DAILY3X','Daily 3 Xanax + Refill','Daily routine: natural regen, 3 xanax, 1 refill.',1,1480,480,3,1,0,5000,5000,0.50,Number(setting_('Gym_Default_Xanax_Cost',850000)),Number(setting_('Gym_Default_Refill_Cost',2500000)),0,'TRUE'],
    ['P-NATURAL','Natural Regen Only','Uses natural energy only, no paid consumables.',1,480,480,0,0,0,5000,5000,0.50,0,0,0,'TRUE'],
    ['P-REFILL','Natural + Daily Refill','Natural regen plus one point refill.',1,630,480,0,1,0,5000,5000,0.50,0,Number(setting_('Gym_Default_Refill_Cost',2500000)),0,'TRUE'],
    ['P-BOOKMONTH','30-Day Book Month','Heavy 30-day training template; adjust modifier/book manually.',30,1480,480,3,1,0,5000,5000,0.50,Number(setting_('Gym_Default_Xanax_Cost',850000)),Number(setting_('Gym_Default_Refill_Cost',2500000)),0,'TRUE']
  ].map(function(p){return {Preset_ID:p[0],Name:p[1],Description:p[2],Days:p[3],Energy_Per_Day:p[4],Natural_Energy_Per_Day:p[5],Xanax_Per_Day:p[6],Refills_Per_Day:p[7],Extra_Energy_Per_Day:p[8],Start_Happy:p[9],Happy_Reset_Per_Day:p[10],Happy_Loss_Factor:p[11],Xanax_Cost:p[12],Refill_Cost:p[13],Extra_Cost_Per_Energy:p[14],Active:p[15]};});
  try{upsertRowsByKey_(V20_SHEETS.PRESETS,'Preset_ID',presets);}catch(e2){logError_('seedV20 presets',e2,{});} 
}

function getV20State_(){
  setupShadowCoreV20GymGainsLabMiniNext();
  return {
    version:V20_VERSION,
    gyms:v20GymsForWeb_(),
    presets:v20Read_(V20_SHEETS.PRESETS,100),
    settings:v20Read_(V20_SHEETS.SETTINGS,100),
    calculations:v20Read_(V20_SHEETS.CALCS,50),
    sessions:v20Read_(V20_SHEETS.SESSIONS,50),
    projections:v20Read_(V20_SHEETS.PROJECTIONS,50),
    goals:v20Read_(V20_SHEETS.GOALS,50),
    comparisons:v20Read_(V20_SHEETS.COMPARISON,200),
    apiBonuses:v20Read_(V20_SHEETS.API_BONUSES,20),
    projectionView:v20Read_(V20_SHEETS.VIEW,500),
    goalView:v20Read_(V20_SHEETS.GOAL_VIEW,100),
    formula:{a:V20_VLADAR.a,b:V20_VLADAR.b,c:V20_VLADAR.c,d:V20_VLADAR.d,e:V20_VLADAR.e}
  };
}
function v20Read_(sheetName,limit){try{return readTable_(sheetName).slice(-(limit||100));}catch(e){return [];}}
function v20GymsForWeb_(){return V20_GYMS.map(function(g){return {Gym:g[0],Energy_Per_Train:g[1],Strength:g[2],Speed:g[3],Defense:g[4],Dexterity:g[5],Type:g[6]};});}

function calculateV20GymSessionFromWeb(sessionId,input){var session=requireSession_(sessionId); var result=calculateV20GymSession_(input||{}, session); return result;}
function calculateV20GymProjectionFromWeb(sessionId,input){var session=requireSession_(sessionId); return calculateV20GymProjection_(input||{}, session);}
function calculateV20GymGoalFromWeb(sessionId,input){var session=requireSession_(sessionId); return calculateV20GymGoal_(input||{}, session);}
function compareV20GymsFromWeb(sessionId,input){var session=requireSession_(sessionId); return compareV20Gyms_(input||{}, session);}
function parseV20BonusesFromStoredKeyFromWeb(sessionId){var session=requireSession_(sessionId); return parseV20BonusesFromStoredKey_(session);}

function calculateV20GymSession_(input,session){
  setupShadowCoreV20GymGainsLabMiniNext();
  var stat=v20NormalizeStat_(input.stat||'Strength'); var gym=v20FindGym_(input.gym||"George's");
  var startStat=Math.max(0,Number(input.currentStat||0)); var happy=Math.max(1,Number(input.happy||5000));
  var energy=Number(input.energy||input.energyUsed||150); var modifier=Math.max(0,Number(input.modifier||setting_('Gym_Default_Modifier',1))||1);
  var lossFactor=Math.max(0,Number(input.happyLossFactor||setting_('Gym_Default_Happy_Loss_Factor',0.5))||0.5);
  var res=v20SimulateEnergy_(startStat,happy,energy,gym,stat,modifier,lossFactor);
  var calcId='GYM-'+Utilities.getUuid().slice(0,8).toUpperCase();
  var row={Calc_ID:calcId,Timestamp:nowIso_(),Torn_ID:session.tornId,Name:session.name,Mode:'Single Session',Stat:stat,Current_Stat:startStat,Goal_Stat:'',Gym:gym.name,Gym_Dots:gym.dots[stat],Energy_Per_Train:gym.energy,Energy_Used:energy,Starting_Happy:happy,Ending_Happy:res.endingHappy,Modifier:modifier,Gains:res.totalGain,Ending_Stat:res.endingStat,Preset:String(input.preset||''),Input_JSON:safeJson_(input),Result_JSON:safeJson_(res)};
  appendRowObject_(V20_SHEETS.CALCS,row); appendRowObject_(V20_SHEETS.SESSIONS,{Calc_ID:calcId,Timestamp:row.Timestamp,Torn_ID:session.tornId,Name:session.name,Stat:stat,Gym:gym.name,Preset:row.Preset,Energy_Used:energy,Trains:res.trains,Starting_Stat:startStat,Gains:res.totalGain,Ending_Stat:res.endingStat,Starting_Happy:happy,Ending_Happy:res.endingHappy,Modifier:modifier,Notes:res.notes});
  return {ok:true,calcId:calcId,result:res,row:row};
}

function calculateV20GymProjection_(input,session){
  setupShadowCoreV20GymGainsLabMiniNext();
  var stat=v20NormalizeStat_(input.stat||'Strength'), gym=v20FindGym_(input.gym||"George's"), preset=v20Preset_(input.preset||'P-DAILY3X');
  var days=Math.max(1,Math.min(3650,Number(input.days||preset.Days||1)||1));
  var current=Math.max(0,Number(input.currentStat||0)), happy=Math.max(1,Number(input.happy||preset.Start_Happy||5000));
  var modifier=Math.max(0,Number(input.modifier||setting_('Gym_Default_Modifier',1))||1);
  var lossFactor=Math.max(0,Number(input.happyLossFactor||preset.Happy_Loss_Factor||0.5)||0.5);
  var energyPerDay=Number(input.energyPerDay||preset.Energy_Per_Day||480);
  var naturalPerDay=Number(input.naturalEnergyPerDay||preset.Natural_Energy_Per_Day||480);
  var xanaxPerDay=Number(input.xanaxPerDay||preset.Xanax_Per_Day||0), refillPerDay=Number(input.refillsPerDay||preset.Refills_Per_Day||0), extraPerDay=Number(input.extraEnergyPerDay||preset.Extra_Energy_Per_Day||0);
  var xanaxCost=Number(input.xanaxCost||preset.Xanax_Cost||setting_('Gym_Default_Xanax_Cost',850000)||0), refillCost=Number(input.refillCost||preset.Refill_Cost||setting_('Gym_Default_Refill_Cost',2500000)||0), extraCostPerE=Number(input.extraCostPerEnergy||preset.Extra_Cost_Per_Energy||setting_('Gym_Default_Extra_Energy_Cost',0)||0);
  var rows=[], totalGain=0,totalEnergy=0,totalCost=0;
  var projId='PROJ-'+Utilities.getUuid().slice(0,8).toUpperCase();
  for(var day=1;day<=days;day++){
    if(Number(input.resetHappyDaily||preset.Happy_Reset_Per_Day||0)>0) happy=Math.max(happy,Number(input.resetHappyDaily||preset.Happy_Reset_Per_Day));
    var before=current, hBefore=happy;
    var sim=v20SimulateEnergy_(current,happy,energyPerDay,gym,stat,modifier,lossFactor);
    current=sim.endingStat; happy=sim.endingHappy; totalGain+=sim.totalGain; totalEnergy+=energyPerDay;
    var dayCost=xanaxPerDay*xanaxCost + refillPerDay*refillCost + extraPerDay*extraCostPerE; totalCost+=dayCost;
    rows.push({Projection_ID:projId,Generated:nowIso_(),Day:day,Stat:stat,Gym:gym.name,Starting_Stat:before,Gains:sim.totalGain,Ending_Stat:current,Happy_Start:hBefore,Happy_End:happy,Energy_Used:energyPerDay,Cost_To_Date:totalCost});
  }
  v20ClearView_(V20_SHEETS.VIEW); if(rows.length) v20AppendObjects_(V20_SHEETS.VIEW, rows);
  var summary={Projection_ID:projId,Timestamp:nowIso_(),Torn_ID:session.tornId,Name:session.name,Stat:stat,Gym:gym.name,Days:days,Preset:preset.Name||String(input.preset||''),Starting_Stat:Number(input.currentStat||0),Ending_Stat:current,Total_Gains:totalGain,Daily_Avg_Gains:totalGain/days,Energy_Total:totalEnergy,Natural_Energy:naturalPerDay*days,Xanax_Count:xanaxPerDay*days,Refill_Count:refillPerDay*days,Extra_Energy:extraPerDay*days,Xanax_Cost:xanaxPerDay*days*xanaxCost,Refill_Cost:refillPerDay*days*refillCost,Extra_Cost:extraPerDay*days*extraCostPerE,Total_Cost:totalCost,Result_JSON:safeJson_({days:days,rows:rows.slice(0,500),endingStat:current,totalGain:totalGain,totalCost:totalCost})};
  appendRowObject_(V20_SHEETS.PROJECTIONS, summary); appendRowObject_(V20_SHEETS.COSTS,{Cost_ID:projId,Timestamp:summary.Timestamp,Preset:summary.Preset,Days:days,Natural_Energy:summary.Natural_Energy,Xanax_Count:summary.Xanax_Count,Refill_Count:summary.Refill_Count,Extra_Energy:summary.Extra_Energy,Xanax_Cost:summary.Xanax_Cost,Refill_Cost:summary.Refill_Cost,Extra_Cost:summary.Extra_Cost,Total_Cost:totalCost,Notes:'Projection cost estimate.'});
  return {ok:true,projectionId:projId,summary:summary,rows:rows};
}

function calculateV20GymGoal_(input,session){
  setupShadowCoreV20GymGainsLabMiniNext();
  var stat=v20NormalizeStat_(input.stat||'Strength'), gym=v20FindGym_(input.gym||"George's"), goal=Number(input.goalStat||input.goal||0), start=Number(input.currentStat||0);
  if(goal<=start) throw new Error('Goal stat must be higher than current stat.');
  var maxDays=Math.max(1,Math.min(3650,Number(input.maxDays||3650)||3650));
  var projInput=Object.assign({},input,{days:1});
  var current=start, days=0, totalGain=0, totalCost=0, lastRows=[];
  while(current<goal && days<maxDays){
    var temp=calculateV20GymProjectionPreview_(Object.assign({},projInput,{currentStat:current,days:1}));
    days++; current=temp.endingStat; totalGain+=temp.totalGain; totalCost+=temp.totalCost; lastRows.push(temp);
    if(temp.totalGain<=0) break;
  }
  var goalId='GOAL-'+Utilities.getUuid().slice(0,8).toUpperCase();
  var preset=v20Preset_(input.preset||'P-DAILY3X');
  var energyPerDay=Number(input.energyPerDay||preset.Energy_Per_Day||480), xanaxPerDay=Number(input.xanaxPerDay||preset.Xanax_Per_Day||0), refillPerDay=Number(input.refillsPerDay||preset.Refills_Per_Day||0);
  var row={Goal_ID:goalId,Timestamp:nowIso_(),Torn_ID:session.tornId,Name:session.name,Stat:stat,Gym:gym.name,Starting_Stat:start,Goal_Stat:goal,Days_Estimated:days,Total_Gains:totalGain,Energy_Total:energyPerDay*days,Xanax_Count:xanaxPerDay*days,Refill_Count:refillPerDay*days,Total_Cost:totalCost,Preset:preset.Name||String(input.preset||''),Result_JSON:safeJson_({goalReached:current>=goal,endingStat:current,days:days,totalCost:totalCost})};
  appendRowObject_(V20_SHEETS.GOALS,row); v20ClearView_(V20_SHEETS.GOAL_VIEW); appendRowObject_(V20_SHEETS.GOAL_VIEW,{Goal_ID:goalId,Generated:nowIso_(),Stat:stat,Gym:gym.name,Goal_Stat:goal,Estimated_Days:days,Total_Cost:totalCost,Average_Daily_Gain:days?totalGain/days:0,Recommendation:v20GoalRecommendation_(days,current>=goal),Notes:'Goal estimate using Vladar formula and selected schedule.'});
  return {ok:true,goalId:goalId,summary:row};
}

function calculateV20GymProjectionPreview_(input){
  var fake={tornId:'PREVIEW',name:'Preview'}; var stat=v20NormalizeStat_(input.stat||'Strength'), gym=v20FindGym_(input.gym||"George's"), preset=v20Preset_(input.preset||'P-DAILY3X');
  var current=Number(input.currentStat||0), happy=Number(input.happy||preset.Start_Happy||5000), modifier=Number(input.modifier||setting_('Gym_Default_Modifier',1))||1, lossFactor=Number(input.happyLossFactor||preset.Happy_Loss_Factor||0.5)||0.5;
  var energy=Number(input.energyPerDay||preset.Energy_Per_Day||480);
  var sim=v20SimulateEnergy_(current,happy,energy,gym,stat,modifier,lossFactor);
  var cost=(Number(input.xanaxPerDay||preset.Xanax_Per_Day||0)*Number(input.xanaxCost||preset.Xanax_Cost||0))+(Number(input.refillsPerDay||preset.Refills_Per_Day||0)*Number(input.refillCost||preset.Refill_Cost||0))+(Number(input.extraEnergyPerDay||preset.Extra_Energy_Per_Day||0)*Number(input.extraCostPerEnergy||preset.Extra_Cost_Per_Energy||0));
  return {endingStat:sim.endingStat,totalGain:sim.totalGain,totalCost:cost};
}

function compareV20Gyms_(input,session){
  setupShadowCoreV20GymGainsLabMiniNext();
  var stat=v20NormalizeStat_(input.stat||'Strength'), current=Number(input.currentStat||0), happy=Number(input.happy||5000), energy=Number(input.energy||150), modifier=Number(input.modifier||setting_('Gym_Default_Modifier',1))||1, loss=Number(input.happyLossFactor||0.5)||0.5;
  var id='CMP-'+Utilities.getUuid().slice(0,8).toUpperCase();
  var rows=V20_GYMS.map(function(g){var gym=v20GymFromArray_(g); var sim=v20SimulateEnergy_(current,happy,energy,gym,stat,modifier,loss); return {Comparison_ID:id,Timestamp:nowIso_(),Torn_ID:session.tornId,Name:session.name,Stat:stat,Current_Stat:current,Happy:happy,Energy:energy,Modifier:modifier,Gym:gym.name,Energy_Per_Train:gym.energy,Gym_Dots:gym.dots[stat],Single_Session_Gains:sim.totalGain,Gains_Per_Energy:energy?sim.totalGain/energy:0,Rank:'',Notes:gym.dots[stat]?'':'Cannot train this stat'};});
  rows.sort(function(a,b){return Number(b.Single_Session_Gains)-Number(a.Single_Session_Gains);}); rows.forEach(function(r,i){r.Rank=i+1;});
  v20ClearView_(V20_SHEETS.COMPARISON); if(rows.length) v20AppendObjects_(V20_SHEETS.COMPARISON,rows);
  return {ok:true,comparisonId:id,rows:rows};
}

function parseV20BonusesFromStoredKey_(session){
  setupShadowCoreV20GymGainsLabMiniNext();
  var key=getStoredApiKey_('MEMBER', session.tornId); if(!key) throw new Error('No stored member key. Connect your Torn key first or use the scanner local API mode.');
  var selections='profile,basic,battlestats,bars,cooldowns,perks,education,personalstats,properties,jobpoints';
  var data={}; try{data=tornRequest_('user','',selections,key,{}, {bypassLocalCache:true});}catch(e){data=tornRequest_('user','','profile,battlestats,bars,cooldowns',key,{}, {bypassLocalCache:true});}
  var detected=v20DetectBonusPercents_(data); var stats=v20ExtractStats_(data); var bars=data.bars||data.energy||{}; var cooldowns=data.cooldowns||{};
  var modifier=1+((detected.all||0)+(detected.strength||0)+(detected.speed||0)+(detected.defense||0)+(detected.dexterity||0))/100;
  var snap={Snapshot_ID:'GYMAPI-'+Utilities.getUuid().slice(0,8).toUpperCase(),Timestamp:nowIso_(),Torn_ID:session.tornId,Name:session.name,Status:'Parsed',Stats_JSON:safeJson_(stats),Bars_JSON:safeJson_(bars).slice(0,5000),Cooldowns_JSON:safeJson_(cooldowns).slice(0,5000),Detected_Bonuses_JSON:safeJson_(detected),Recommended_Modifier:modifier,Detected_Stat_Focus:v20BestStat_(stats),Raw_Summary:safeJson_(v20SummarizeApi_(data)).slice(0,5000),Notes:'Best-effort parser. Review detected bonuses manually.'};
  appendRowObject_(V20_SHEETS.API_BONUSES,snap);
  return {ok:true,snapshot:snap,rawSummary:v20SummarizeApi_(data)};
}

function v20SimulateEnergy_(startStat,startHappy,energy,gym,stat,modifier,happyLossFactor){
  var dots=Number(gym.dots[stat]||0); if(!dots) return {trains:0,totalGain:0,endingStat:startStat,endingHappy:startHappy,notes:'Selected gym cannot train '+stat+'.'};
  var ept=Number(gym.energy||10); var trains=Math.floor(Number(energy||0)/ept); var statVal=Number(startStat||0), happy=Number(startHappy||1), total=0;
  for(var i=0;i<trains;i++){ var gain=v20SingleGain_(statVal,happy,dots,ept,modifier); total+=gain; statVal+=gain; happy=Math.max(1,happy-(ept*Number(happyLossFactor||0.5))); }
  return {trains:trains,totalGain:total,endingStat:statVal,endingHappy:happy,gainPerEnergy:energy?total/energy:0,notes:''};
}
function v20SingleGain_(stat,happy,dots,energy,modifier){ var x=Math.max(1,Number(happy||1)+V20_VLADAR.b); var bracket=((V20_VLADAR.a*Math.log(x)+V20_VLADAR.c)*Number(stat||0))+(V20_VLADAR.d*x)+V20_VLADAR.e; return Math.max(0,Number(modifier||1)*Number(dots||0)*Number(energy||0)*bracket); }
function v20FindGym_(name){name=String(name||'').toLowerCase(); for(var i=0;i<V20_GYMS.length;i++){if(V20_GYMS[i][0].toLowerCase()===name)return v20GymFromArray_(V20_GYMS[i]);} return v20GymFromArray_(V20_GYMS[23]);}
function v20GymFromArray_(g){return {name:g[0],energy:Number(g[1]),dots:{Strength:Number(g[2]),Speed:Number(g[3]),Defense:Number(g[4]),Dexterity:Number(g[5])},type:g[6]};}
function v20NormalizeStat_(s){s=String(s||'').toLowerCase(); if(s.indexOf('spe')===0)return 'Speed'; if(s.indexOf('def')===0)return 'Defense'; if(s.indexOf('dex')===0)return 'Dexterity'; return 'Strength';}
function v20Preset_(idOrName){var rows=v20Read_(V20_SHEETS.PRESETS,100); for(var i=0;i<rows.length;i++){if(String(rows[i].Preset_ID)===String(idOrName)||String(rows[i].Name)===String(idOrName))return rows[i];} return {Preset_ID:'P-DAILY3X',Name:'Daily 3 Xanax + Refill',Energy_Per_Day:1480,Natural_Energy_Per_Day:480,Xanax_Per_Day:3,Refills_Per_Day:1,Extra_Energy_Per_Day:0,Start_Happy:5000,Happy_Reset_Per_Day:5000,Happy_Loss_Factor:0.5,Xanax_Cost:850000,Refill_Cost:2500000,Extra_Cost_Per_Energy:0};}
function v20AppendObjects_(sheetName, objects){ if(!objects||!objects.length)return; var sh=ss_().getSheetByName(sheetName)||v20EnsureSheet_(sheetName,V20_HEADERS[sheetName]||Object.keys(objects[0])); var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0]; var values=objects.map(function(o){return headers.map(function(h){return o[h]!==undefined?o[h]:'';});}); sh.getRange(sh.getLastRow()+1,1,values.length,headers.length).setValues(values); }
function v20ClearView_(sheetName){ var sh=ss_().getSheetByName(sheetName)||v20EnsureSheet_(sheetName,V20_HEADERS[sheetName]||[]); var last=sh.getLastRow(); if(last>1) sh.getRange(2,1,last-1,Math.max(1,sh.getLastColumn())).clearContent(); }
function v20GoalRecommendation_(days,reached){ if(!reached) return 'Goal not reached in max days. Increase schedule, gym, happy, or modifier.'; if(days<=7)return 'Very close goal.'; if(days<=30)return 'Reachable within a month.'; if(days<=120)return 'Medium-term goal.'; return 'Long-term goal; compare higher gym, happy/book month, or heavier energy schedule.';}
function v20BestStat_(stats){var best='',val=-1; Object.keys(stats||{}).forEach(function(k){if(Number(stats[k])>val){best=k;val=Number(stats[k]);}}); return best;}
function v20ExtractStats_(data){var bs=data.battlestats||data.battle_stats||data.stats||{}; return {Strength:Number(bs.strength||bs.Strength||data.strength||0),Speed:Number(bs.speed||bs.Speed||data.speed||0),Defense:Number(bs.defense||bs.Defense||data.defense||0),Dexterity:Number(bs.dexterity||bs.Dexterity||data.dexterity||0)};}
function v20SummarizeApi_(data){return {keys:Object.keys(data||{}),name:data.name||data.player_name||'',player_id:data.player_id||data.user_id||'',level:data.level||'',happy:data.happy||data.bars&&data.bars.happy||'',energy:data.energy||data.bars&&data.bars.energy||'',cooldowns:data.cooldowns||{},perks:data.perks||{},education:data.education||{}};}
function v20DetectBonusPercents_(obj){var out={all:0,strength:0,speed:0,defense:0,dexterity:0,sources:[]}; function scan(x,path){ if(x===null||x===undefined)return; if(typeof x==='string'){var s=x.toLowerCase(); var m=s.match(/(\d+(?:\.\d+)?)\s*%/); if((s.indexOf('gym')>=0||s.indexOf('train')>=0||s.indexOf('strength')>=0||s.indexOf('speed')>=0||s.indexOf('defense')>=0||s.indexOf('dexterity')>=0) && m){var pct=Number(m[1]); if(s.indexOf('strength')>=0)out.strength+=pct; else if(s.indexOf('speed')>=0)out.speed+=pct; else if(s.indexOf('defense')>=0)out.defense+=pct; else if(s.indexOf('dexterity')>=0)out.dexterity+=pct; else out.all+=pct; out.sources.push({path:path,value:x,pct:pct});}} else if(typeof x==='object'){Object.keys(x).slice(0,200).forEach(function(k){scan(x[k],path?path+'.'+k:k);});}} scan(obj,''); return out;}

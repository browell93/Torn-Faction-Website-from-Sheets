# ShadowCore HQ v2.6.7 Login Restore / Emergency Rollback

This patch rolls the browser login flow back to the last simpler working router/login client and keeps a stable persistent server-side session store.

## Update these files

- Client.html
- Security.gs

## Add this file

- LoginEmergencyTools.gs

## Then save and redeploy

Deploy -> Manage deployments -> Edit -> Version -> New version -> Deploy

## Then run once

repairLoginDefaults_v267()

## If your browser has bad session data

Open the site, press F12, Console, then run:

localStorage.removeItem('sc_session');
sessionStorage.clear();
location.hash = '';
location.reload();

Then log in again with the Admin Token or API key.

## Debug helpers

- debugLoginConfig_v267()
- clearAllSessions_v267()
- testLeaderLoginWithToken_v267('YOUR_ADMIN_TOKEN')

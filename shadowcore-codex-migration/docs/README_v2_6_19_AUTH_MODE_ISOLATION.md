ShadowCore HQ v2.6.19 - Auth Mode Isolation Fix

Full files only. Replace Client.html and Security.gs. Keep/add V2614AutoMemberApiSync.gs.

This fixes API login visually reverting to the old admin/leader session by clearing admin auth state before API login and calling unique sc2619 auth endpoints.

After installing, redeploy as a new version. Then clear browser auth once:
localStorage.removeItem('sc_session'); localStorage.removeItem('sc_session_obj'); localStorage.removeItem('sc_admin_token'); localStorage.removeItem('sc_leader_token'); sessionStorage.clear(); location.hash=''; location.reload();

Test backend first:
debugSc2619AuthConfig()
testSc2619ApiLogin("YOUR_API_KEY")
testSc2619LeaderLogin("YOUR_ADMIN_TOKEN")

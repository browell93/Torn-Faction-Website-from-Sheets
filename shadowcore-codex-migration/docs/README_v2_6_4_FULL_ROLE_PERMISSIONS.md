# ShadowCore HQ v2.6.4 Full Role Permissions Repair

This patch adds a standalone `PermissionsResetAll.gs` file.

## Install
1. Open Apps Script.
2. Add a new file named `PermissionsResetAll.gs`.
3. Paste the contents from this package.
4. Save.
5. Run:

```javascript
resetAllRolePermissionsFull_v264()
```

6. Redeploy the web app as a new version.

## Optional Knowledge Base quick repair

```javascript
makeKnowledgeBaseMemberVisible_v264()
```

## Notes
- This repopulates `Role_Permissions` with all known page keys through v2.6.x.
- Admin-token sessions should still use the v2.6.3 admin bypass fix.
- If you added custom pages manually, add them to the Role_Permissions sheet afterward.

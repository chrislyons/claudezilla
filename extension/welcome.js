/**
 * Claudezilla Welcome Page
 * First-run onboarding experience
 */

// Check permission status on load
async function checkPermissionStatus() {
  const permissionBadge = document.getElementById('permissionStatus');

  try {
    const hasPermission = await browser.extension.isAllowedIncognitoAccess();

    if (hasPermission) {
      permissionBadge.classList.remove('disabled');
      permissionBadge.classList.add('enabled');
      permissionBadge.innerHTML = '<span class="dot"></span>Private Windows: Enabled ✓';
    }
  } catch (e) {
    console.log('[claudezilla] Could not check permission status:', e);
  }
}

// Check permission status
checkPermissionStatus();

// Recheck every 2 seconds in case user enables permission
setInterval(checkPermissionStatus, 2000);

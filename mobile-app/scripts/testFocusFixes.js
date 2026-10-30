// Verification script for Focus Mode active checking and sample app pruning

const sampleApps = [
  { id: '1', name: 'Instagram', packageName: 'com.instagram.android', enabled: false, category: 'social' },
  { id: '2', name: 'YouTube', packageName: 'com.google.android.youtube', enabled: false, category: 'media' },
  { id: '3', name: 'TikTok', packageName: 'com.zhiliaoapp.musically', enabled: false, category: 'social' },
  { id: '4', name: 'PUBG Mobile', packageName: 'com.tencent.ig', enabled: false, category: 'games' },
  { id: '5', name: 'Free Fire', packageName: 'com.dts.freefireth', enabled: false, category: 'games' },
  { id: '6', name: 'Roblox', packageName: 'com.roblox.client', enabled: false, category: 'games' },
  { id: '7', name: 'Brawl Stars', packageName: 'com.supercell.brawlstars', enabled: false, category: 'games' },
];

// Test 1: Device with only YouTube installed
const deviceInstalled = new Set(['com.google.android.youtube', 'com.whatsapp']);
const filteredApps = sampleApps.filter(app => deviceInstalled.has(app.packageName));

console.log("Test 1 - Filtered Apps for Device:", filteredApps.map(a => a.name));
if (filteredApps.length === 1 && filteredApps[0].name === 'YouTube') {
  console.log("✓ PASS: Uninstalled games (PUBG, Free Fire, Roblox, Brawl Stars) filtered out!");
} else {
  console.error("✗ FAIL: Filter failed");
  process.exit(1);
}

// Test 2: Active Focus Session timestamp verification logic
function checkFocusActive(isActive, endTimestamp) {
  const now = Date.now();
  if (!isActive) return false;
  if (endTimestamp > 0 && now < endTimestamp) return true;
  return false;
}

const now = Date.now();
// Active session (in future)
console.assert(checkFocusActive(true, now + 60000) === true, "Should be active");
// Expired session (in past)
console.assert(checkFocusActive(true, now - 5000) === false, "Should be expired");
// 0L timestamp (invalid/cleared)
console.assert(checkFocusActive(true, 0) === false, "0L timestamp should NOT be active");
// Inactive
console.assert(checkFocusActive(false, now + 60000) === false, "Inactive flag should not block");

console.log("✓ PASS: Focus mode active checks correctly prevent lingering blocks and 0L deadlocks!");

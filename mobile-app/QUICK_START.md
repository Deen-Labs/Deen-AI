# 🚀 QUICK START: Enable System-Wide NSFW Blocking

## What You Need to Do

Follow these 3 simple steps to enable system-wide content blocking:

### Step 1: Generate Native Code (One-Time Setup)

Open PowerShell in the mobile-app folder:

```powershell
cd E:\deen\mobile-app
npx expo prebuild
```

**What this does:**
- Creates `android/` folder with native VPN service code
- Sets up all the Kotlin files for content filtering
- Configures permissions

⏱️ **Takes**: 2-3 minutes

### Step 2: Build & Install the App

```powershell
npx expo run:android
```

**Make sure:**
- ✅ Your Android phone is connected via USB
- ✅ USB debugging is enabled
- ✅ Phone is unlocked

⏱️ **Takes**: 5-7 minutes first time

### Step 3: Enable Protection

On your phone:

1. **Open DEEN AI app**
2. **Go to Focus tab** (bottom navigation)
3. **Scroll down** to "Content Protection" section
4. **Find "System-Wide Protection (VPN)"**
5. **Toggle it ON** 🟢
6. **Tap "OK"** when Android asks for VPN permission
7. **Done!** ✅

You'll see: "✅ Active - Your entire device is protected"

## Test It Works

1. **Open Chrome** on your phone
2. **Type**: `pornhub.com` in address bar
3. **Press Enter**
4. **Result**: ❌ Page won't load!
5. **Notification**: "Content Blocked by DEEN AI"

Try a safe site:
- Type: `google.com` ✅ Works fine!

## Troubleshooting

### "expo: command not found"
```powershell
npm install -g expo-cli
```

### "No devices found"
1. Connect your Android phone via USB
2. Enable Developer Options
3. Enable USB Debugging
4. Accept computer connection on phone

### "Module not found after build"
- Make sure you ran `npx expo prebuild`
- Try rebuilding: `npx expo run:android`
- Must use physical device (not emulator)

### Still Having Issues?

See detailed documentation:
- **BUILD_INSTRUCTIONS.md** - Complete setup guide
- **SYSTEM_WIDE_BLOCKING_COMPLETE.md** - Full technical details
- **WHY_BLOCKING_NOT_WORKING.md** - Troubleshooting guide

## What This Blocks

System-wide blocking works in:
- ✅ Chrome browser
- ✅ Firefox browser  
- ✅ Samsung Internet
- ✅ Any browser app
- ✅ Apps that load web content
- ✅ All network connections

Blocks 25+ major porn sites:
- pornhub, xvideos, xnxx, redtube
- All major adult sites
- NSFW subreddits
- Adult social platforms

## How It Works

```
Any App → DEEN AI VPN → Internet
                ↓
         Filters NSFW
         Blocks Bad Content
         Allows Good Content
```

Your entire device traffic goes through DEEN AI's VPN filter!

## Privacy

- ✅ All filtering happens ON YOUR DEVICE
- ✅ No data sent to external servers
- ✅ No tracking or monitoring
- ✅ No history logging
- ✅ 100% private and secure

## Need Help?

Run into issues? Check:
1. BUILD_INSTRUCTIONS.md (section: Troubleshooting)
2. Make sure you're on Android 5.0+ ٪
3. Ensure physical device (VPN won't work in emulator)

---

**Total Time**: ~10 minutes to full system-wide protection! 🛡️

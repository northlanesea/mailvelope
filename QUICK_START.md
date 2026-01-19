# Quick Start - Auto-Send Feature

## Build & Install (5 minutes)

### Step 1: Build the Extension
```bash
cd /home/runner/work/mailvelope/mailvelope
npm ci          # Install dependencies (first time only)
npx grunt       # Build the extension
```

### Step 2: Install in Browser

**Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `build/chrome/` folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `build/firefox/manifest.json`

## Quick Test (2 minutes)

### 1. Enable Feature
- Click Mailvelope icon → Options → General
- ✓ Check "Automatically send encrypted messages after a countdown"
- Set delay (e.g., 5 seconds)
- Click Save

### 2. Test in Gmail
- Open Gmail (mail.google.com)
- Compose new email
- Click Mailvelope encryption button
- Add recipient + message
- Click Encrypt
- **See countdown**: "Sending message in 5 second(s)... Click Cancel to stop."
- **Option A**: Wait → Message sent automatically
- **Option B**: Click Cancel → Message cancelled

## What's New?

✅ Configurable auto-send with countdown (1-60 seconds)
✅ Cancel button to stop sending
✅ Works with Gmail integration
✅ Localized in English & Indonesian

See `TESTING_AUTO_SEND.md` for detailed testing scenarios.

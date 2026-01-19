# Auto-Send Feature Testing Guide

## Overview
This guide will help you test the automatic message sending feature ("Mengirim pesan secara otomatis") that has been implemented for Mailvelope's Gmail integration.

## Prerequisites
- Google Chrome or Firefox browser
- Gmail account
- The built extension files are ready in the `build/` directory

## Installation Instructions

### For Chrome:

1. **Load the Extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Navigate to `/home/runner/work/mailvelope/mailvelope/build/chrome/`
   - Click "Select Folder"

2. **Alternative: Use the ZIP package**
   - The packaged extension is available at `dist/mailvelope.chrome.zip`
   - Extract the ZIP file
   - Follow steps above to load the unpacked extension

### For Firefox:

1. **Load the Extension (Temporary)**
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Navigate to `/home/runner/work/mailvelope/mailvelope/build/firefox/`
   - Select the `manifest.json` file

2. **Alternative: Run with web-ext**
   ```bash
   cd /home/runner/work/mailvelope/mailvelope
   node_modules/web-ext/bin/web-ext run --source-dir=./build/firefox
   ```

## Configuring the Auto-Send Feature

1. **Open Mailvelope Settings**
   - Click the Mailvelope extension icon in your browser toolbar
   - Select "Options" or "Settings"

2. **Navigate to General Settings**
   - In the left sidebar, click on "General"

3. **Enable Auto-Send**
   - Find the section with default key settings
   - Check the box "✓ Automatically send encrypted messages after a countdown"
   - Set the countdown delay (default: 5 seconds, range: 1-60 seconds)
   - Click "Save"

## Testing the Feature

### Setup Gmail Integration:

1. **Open Gmail** (mail.google.com)
2. **Compose a new email**
3. Click the Mailvelope encryption button (lock icon) to open the secure editor

### Test Case 1: Auto-Send with Countdown

1. **Compose a message:**
   - Add recipient(s) with PGP keys
   - Add subject and message content
   - Click "Encrypt" button

2. **Observe the countdown:**
   - After encryption, you should see a notification
   - Message: "Sending message in X second(s)... Click Cancel to stop."
   - The countdown decreases every second: 5, 4, 3, 2, 1...

3. **Wait for auto-send:**
   - After countdown reaches 0, the message is sent automatically
   - Success notification appears: "The email was sent successfully."

### Test Case 2: Cancel Auto-Send

1. **Compose and encrypt a message** (as above)
2. **Click the "Cancel" button** during countdown
3. **Verify cancellation:**
   - Countdown stops immediately
   - Notification shows: "Message sending has been cancelled."
   - Message is NOT sent

### Test Case 3: Disable Auto-Send

1. **Go to Settings > General**
2. **Uncheck** the auto-send option
3. **Save settings**
4. **Compose and encrypt a message in Gmail**
5. **Verify:**
   - No countdown appears
   - Message is sent immediately (original behavior)

## Expected Behavior Summary

| Setting Enabled | After Encryption | User Action | Result |
|----------------|------------------|-------------|---------|
| ✓ Yes | Countdown appears | Wait | Message sent after countdown |
| ✓ Yes | Countdown appears | Click Cancel | Message NOT sent |
| ✗ No | No countdown | N/A | Message sent immediately |

## Localization Testing

The feature supports multiple languages:

- **English**: "Sending message in X second(s)..."
- **Indonesian**: "Mengirim pesan dalam X detik..."

To test localization:
1. Change browser language settings
2. Reload Mailvelope
3. Verify countdown messages appear in the correct language

## Troubleshooting

**Problem**: Extension won't load
- **Solution**: Make sure you're using the correct browser version (Chrome/Firefox latest)
- Check browser console for errors

**Problem**: Auto-send option not visible
- **Solution**: 
  - Clear browser cache and reload
  - Make sure you're using the Gmail integration mode
  - Check that preferences loaded correctly

**Problem**: Countdown doesn't appear
- **Solution**:
  - Verify auto-send is enabled in settings
  - Check that you're using Gmail (feature only works with Gmail integration)
  - Look for any error messages in browser console

## Technical Details

**Modified Files:**
- Settings: `src/app/settings/General.js`
- Countdown logic: `src/controller/gmail.controller.js`
- UI components: `src/components/editor/editor.js`, `src/components/util/Toast.js`
- Preferences: `src/res/defaults.json`

**Preferences:**
- `auto_send_msg`: Boolean (default: false)
- `auto_send_delay`: Number 1-60 (default: 5 seconds)

## Development Tips

**Watch for changes:**
```bash
cd /home/runner/work/mailvelope/mailvelope
npx grunt watch
```

**Rebuild after changes:**
```bash
npx grunt
```

**Run linting:**
```bash
npx grunt eslint
```

## Questions or Issues?

If you encounter any problems during testing, please:
1. Check browser console for error messages
2. Verify all steps were followed correctly
3. Make sure you're testing with Gmail integration enabled
4. Report any bugs with detailed steps to reproduce

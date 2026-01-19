# Auto-Send Feature Documentation

## Overview
This document provides a complete overview of the automatic message sending feature ("Mengirim pesan secara otomatis") implemented for Mailvelope's Gmail integration.

## Feature Summary

The auto-send feature adds a configurable countdown timer before automatically sending encrypted messages through Gmail. Users can:
- Enable/disable auto-send in settings
- Configure countdown delay (1-60 seconds)
- Cancel sending at any time during the countdown
- Use the feature with full localization support (English & Indonesian)

## Implementation Details

### Files Modified

1. **Preferences & Configuration**
   - `src/res/defaults.json` - Added `auto_send_msg` and `auto_send_delay` preferences
   - `src/modules/defaults.js` - Version migration support for new preferences

2. **Controller Logic**
   - `src/controller/gmail.controller.js` - Core auto-send countdown and cancellation logic
   - Added `autoSendTimer`, `autoSendCancelled`, and `autoSendReject` state management
   - Implemented `showCancelledNotification()` helper method
   - Added `onCancelAutoSend()` event handler

3. **UI Components**
   - `src/components/editor/editor.js` - Added cancel handler and event routing
   - `src/components/util/Toast.js` - Added cancel button support with localization
   - `src/app/settings/General.js` - Settings UI with checkbox and delay input

4. **Localization**
   - `locales/en/messages.json` - English translations
   - `locales/id/messages.json` - Indonesian translations (Bahasa Indonesia)

### New Preferences

```json
{
  "auto_send_msg": false,      // Boolean: Enable/disable auto-send
  "auto_send_delay": 5          // Number: Countdown delay in seconds (1-60)
}
```

### User Flow

```
1. User enables auto-send in Settings > General
   ↓
2. User composes encrypted message in Gmail
   ↓
3. User clicks "Encrypt & Send"
   ↓
4. Countdown notification appears: "Sending in X seconds..."
   ↓
5a. User waits → Message sent automatically after countdown
5b. User clicks Cancel → Message sending cancelled
```

## Technical Architecture

### Countdown Implementation

The countdown uses a promise-based approach with proper cancellation handling:

```javascript
await new Promise((resolve, reject) => {
  this.autoSendReject = reject;  // Store reject for immediate cancellation
  this.autoSendTimer = setTimeout(() => {
    this.autoSendTimer = null;
    this.autoSendReject = null;
    if (this.autoSendCancelled) {
      reject(new Error('cancelled'));
    } else {
      resolve();
    }
  }, 1000);
});
```

### Race Condition Handling

The implementation prevents race conditions by:
1. Storing the reject function for immediate cancellation
2. Clearing timeout on cancellation
3. Checking cancellation flag at each iteration
4. Using try-catch to handle cancellation errors gracefully

### Event Flow

```
Editor Component
    ↓ (user clicks cancel)
    emit('cancel-auto-send')
    ↓
Gmail Controller
    ↓ (onCancelAutoSend)
    Set autoSendCancelled = true
    Clear autoSendTimer
    Call autoSendReject()
    ↓
Promise rejected
    ↓
Catch block shows cancellation notification
```

## Localization Keys

### English (en)
- `gmail_integration_auto_send_countdown`: "Sending message in $1 second(s)... Click Cancel to stop."
- `gmail_integration_send_cancelled`: "Message sending has been cancelled."
- `general_auto_send_msg`: "Automatically send encrypted messages after a countdown."
- `general_auto_send_delay`: "Countdown delay:"
- `general_auto_send_delay_seconds`: "seconds"

### Indonesian (id)
- `gmail_integration_auto_send_countdown`: "Mengirim pesan dalam $1 detik... Klik Batal untuk menghentikan."
- `gmail_integration_send_cancelled`: "Pengiriman pesan telah dibatalkan."
- `general_auto_send_msg`: "Kirim pesan terenkripsi secara otomatis setelah hitungan mundur."
- `general_auto_send_delay`: "Penundaan hitungan mundur:"
- `general_auto_send_delay_seconds`: "detik"

## Security Considerations

- ✅ CodeQL security scan: 0 alerts
- ✅ No sensitive data exposed
- ✅ Proper async/await error handling
- ✅ Timer cleanup on cancellation
- ✅ User can cancel at any time

## Testing

See `TESTING_AUTO_SEND.md` for comprehensive testing guide including:
- Installation instructions for Chrome and Firefox
- Step-by-step testing procedures
- Test cases for all scenarios
- Troubleshooting guide

Quick test: See `QUICK_START.md`

## Performance

- Minimal performance impact
- Countdown updates every 1 second
- Notification is shown/updated via event emission
- Proper cleanup on cancellation

## Browser Compatibility

- ✅ Chrome (Manifest V3)
- ✅ Firefox (WebExtension)
- Tested with Gmail integration

## Known Limitations

1. **Gmail Only**: Feature only works with Gmail integration, not standalone editor
2. **Manual Cancellation**: User must click Cancel button; no keyboard shortcut
3. **Notification Updates**: Creates new notification each second (could be optimized)

## Future Enhancements

Potential improvements:
- Add keyboard shortcut (ESC) to cancel
- Update existing notification instead of creating new ones
- Add sound/visual feedback
- Support for other email providers
- Remember last delay setting per user

## Version History

- v6.0.1 - Initial implementation of auto-send feature
- Commits: c238a37, d2728bd, 9275311, bd49aca, fee74cb, bf2b9ae

## Support

For issues or questions:
1. Check `TESTING_AUTO_SEND.md` troubleshooting section
2. Review browser console for error messages
3. Verify Gmail integration is properly configured
4. Report bugs with detailed reproduction steps

## Credits

Implemented by: @copilot
Requested by: @northlanesea
Feature request: "Mengirim pesan secara otomatis" (Send messages automatically)

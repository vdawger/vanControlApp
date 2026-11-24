## TODO:
 - use native winds
 - better network logging on iOS
 - button sometimes doesn't update when it should on iOS
 - unhide lists individual buttons to unhide
 - timer/smart timing for each button

## Get started

1. Install dependencies
   ```bash
   npm install
   ```

2. Start the app
   ```bash
    npx expo start
   ```

## App
Finds every van board in Bluetooth range and shows a button for each relay. No WiFi needed.
Set the shared passcode once (Boards button); it works with every board that has the same passcode.
New boards, and switch panels, get the passcode from the Boards screen. Switch panels are mapped to relays there too.
Buttons can be reversed (on is off and off is on), hidden, reordered and renamed (names are stored on the board).

Bluetooth needs a development build (`npx expo run:ios` / `npx expo run:android`), not Expo Go.
The wire format is in `app/ble/protocol.ts`; the firmware's copy is `esp32_24v_van_controller/include/proto.h`.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).

## Launch Builds:
### IOS
to open in xcode:
`xed ios`
from the device dropdown, select "dani" and click the play button.

https://docs.expo.dev/guides/local-app-production/

### Android
With device plugged in:
`npx expo run:android --variant release`

## Android Get APK to read non HTTPS traffic:
add to android/app/src/main/AndroidManifest.xml
```
android:usesCleartextTraffic="true"

like this:
<application android:name=".MainApplication" android:label="@string/app_name" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round" android:allowBackup="true" android:theme="@style/AppTheme" android:supportsRtl="true" android:usesCleartextTraffic="true">
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
Scans all ips in the local network and displays all buttons for the devices that are online. 
The buttons control relays. 
Buttons can be reversed (on is off and off is on).
Buttons can be hidden.
Buttons can be reordered.
Buttons can be renamed.
Time start and stop can be set for each button.

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
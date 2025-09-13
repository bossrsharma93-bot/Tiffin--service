# Mobile App (Expo) - Production Notes

- Set API base at build time using Expo public env:
  - macOS/Linux:
    ```bash
    EXPO_PUBLIC_API_BASE="https://your-api.example.com" npx expo start
    ```
  - In EAS builds, add `EXPO_PUBLIC_API_BASE` in Project → Build → Environment Variables.

- Build an Android APK/AAB:
  ```bash
  npm install -g eas-cli
  eas login
  eas build -p android --profile production
  ```

- `App.js` reads `process.env.EXPO_PUBLIC_API_BASE` with fallback to `http://localhost:4000`.
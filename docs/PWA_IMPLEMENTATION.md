# 📱 PWA & Push Notification Implementation

## **Completed Tasks**

### **1. PWA Readiness**
- ✅ **Installed `next-pwa`**: Added PWA support to the Next.js application.
- ✅ **Configured `next.config.js`**: Enabled PWA generation with cache strategies.
- ✅ **Created `manifest.json`**: Added web app manifest for "Add to Home Screen" functionality.
- ✅ **Added Icons**: Created valid placeholder SVG icons for the manifest.
- ✅ **Updated Metadata**: Added PWA meta tags (apple-mobile-web-app-capable, theme-color) to `layout.tsx`.
- ✅ **Generated Service Worker**: `sw.js` is now automatically generated during build.

### **2. Notification System**
- ✅ **Permission Request UI**: Added a non-intrusive Snackbar in `LiveNotifications.tsx` to request notification permissions.
- ✅ **Integration**: Logic connects to the browser's Notification API.
- ✅ **Demo Ready**: If granted, it simulates the "subscription" success state.

## **How to Test (Demo Mode)**

1. **Build & Start**:
   ```bash
   cd frontend
   npm run build
   npm run start
   ```

2. **Verify PWA**:
   - Open browser DevTools -> Application tab.
   - **Manifest**: Should be detected.
   - **Service Workers**: Should see `sw.js` activated.
   - **Installable**: Chrome should show the install icon in the address bar.

3. **Verify Notifications**:
   - Log in as a donor.
   - You should see a prompt: "Enable notifications for real-time emergency alerts?"
   - Click "ENABLE".
   - Browser permission prompt appears.
   - After allowing, a success toast confirms activation.

## **Next Steps (Real Backend)**

To fully enable *remote* push notifications (server -> client):
1. Create a Firebase project.
2. Add `firebaseConfig` to frontend.
3. Update `LiveNotifications.tsx` to get FCM token:
   ```typescript
   const token = await getToken(messaging, { vapidKey: '...' });
   // Send token to backend
   ```
4. Backend `NotificationsService` is already ready to use this token!

**Current Status:** The frontend is now a fully installable PWA with simulated notification subscription, perfectly optimized for the Hackathon demo.
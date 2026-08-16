# MatkaLive — Demo (site + Android apps + sync server)

Demo only. No real-money gambling. Everything is stored as plain JSON — no real payments.

## Run the sync server (required for both apps to share data)

```
node server/server.js        # listens on 0.0.0.0:8777
```

- Data lives in `server/store.json` (auto-created).
- Admin app and user app push/pull the same `matka.*` keys to/from it.
- Server URL is baked into the APKs as `http://172.20.10.4:8777` (your Mac's LAN IP).
  To change it, edit `apps/{user,admin}-app/www/js/sync.js` (or from the app itself,
  store `matka.server` = URL in localStorage) and rebuild.

## Android APKs (already built)

- `apps/dist/MatkaLive-User.apk`  — user app (com.matkalive.user, "MatkaLive")
- `apps/dist/MatkaLive-Admin.apk` — admin app (com.matkalive.admin, "MatkaLive Admin")

Both are Cordova WebView wrappers around the same web app. Cleartext HTTP + mixed
content are enabled so they can reach the LAN server.

## Rebuild an APK after editing web files

```
cp index.html css/* js/* apps/user-app/www/   (strip ?v= cache-busting)
cd apps/user-app
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home \
ANDROID_HOME=$HOME/Library/Android/sdk cordova build android
Install: adb install -r apps/user-app/platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

Same for `apps/admin-app` (its start page is `index.html` from `admin.html`).

## Web

- User site + admin panel also live on GitHub Pages: https://rm3013760-bit.github.io/matka-site/
- Without the server running, the apps/sites still work (localStorage only),
  they simply won't sync.

## Credentials

- Admin panel: `admin` / `112233` (admin app or admin.html)
- Demo users: `demo1`–`demo5` / `123456` (user app or index.html)

## User app layout (sara567-style)

Home (banners, MATKA RESULT rows, Guessing, Games) · Charts (Jodi/Open-Close/Panel
tabs + market dropdown) · Games (rates) · Ledger (betting history + P&L) ·
Account (login, wallet, add money UPI/QR, withdraw UPI/Bank, payments, bets).
# Daily Revision & Test — tracker

## Run locally
```
npm install
npm run dev
```
Open the URL it prints (usually http://localhost:5173).

## Put it online with your own URL
1. Push this folder to a new GitHub repo.
2. Go to vercel.com (or netlify.com), sign in with GitHub, and import the repo.
3. Framework preset: Vite. Leave build settings as default (`npm run build`, output `dist`).
4. Deploy. You'll get a free `.vercel.app` (or `.netlify.app`) URL immediately, and can attach your own domain later in project settings.

## Notes
- Data (checkboxes, notes, custom tasks) is saved in the browser's localStorage, per-browser/device. Clearing site data or using a different browser/device starts fresh.
- No backend or account system — everything runs client-side.

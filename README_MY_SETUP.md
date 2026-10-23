# My Shadow Rep - how it works and what to do

(Written for Yash. Plain language. Keep this file.)

> **Why the address still says "levelup":** your private address was chosen before the app got its name. Passkeys are tied to it, so it must not change.
> (To change it later, we first add a way to attach a new passkey to your existing profile.)

## What you have

One private app for gym + food, on your own PC, free, reachable from your phone.

- **The gym side** = workouts, plan, body weight, stats, levels and quests, AI Coach.
- **The food side** ("Shadow Rep Food") = food diary (calories, protein, carbs, fat). It shows up inside the app as the **Food** tab.
- **Your private address:** https://levelup.tail7782ec.ts.net
  Only **your own devices** that have Tailscale switched on can open it. It is not on the public internet.
- It lives on your PC, so **the PC must be on** (with Docker and Tailscale running) for the phone to sync.

## Everyday use

Nothing to start. When you sign in to Windows, Docker and Tailscale start by themselves and the apps come back.
Open the address (or the home-screen icon on your phone) and use it.

## Is everything OK? (the "health check")

Double-click **scripts\smoke-test.bat**. It shows green PASS lines, or a red FAIL with a yellow line telling you
what to do. It changes nothing, so run it any time something feels off.

## Start / stop

- **scripts\start-all.bat** - starts everything (safe to run any time).
- **scripts\stop-all.bat** - stops everything. Your data stays.
- Never run `docker compose down -v` and never delete the `data` folders - that is your real data.

## Where your data is

| What | Where |
|---|---|
| Gym data, passkeys, Coach settings | `apps\gym\data\` |
| Food diary + uploads | `apps\food\data\` |
| Settings and secrets | `apps\gym\.env` and `apps\food\.env` (private - never share or upload) |
| Backups | `backups\` (a new zip every night, newest 14 kept) |

## Backups (automatic, but know how)

- Every night at **3:00 AM** a backup runs by itself (if the PC is off then, it runs when the PC is next on).
  Apps are off for a few seconds while it runs.
- Back up right now: double-click **scripts\backup.bat**.
- **Copy a backup somewhere else now and then** (an external drive, or your own Google Drive). A backup on the
  same PC does not help if the PC dies. Backup zips contain your passkey data and the Coach token (encrypted),
  so keep them private.
- **Restore** (only if something is badly broken). Pick the backup you want and run this in PowerShell:

  `powershell -ExecutionPolicy Bypass -File D:\AI\shadow-rep\scripts\restore.ps1 -Zip D:\AI\shadow-rep\backups\<the-zip-name>.zip`

  It moves your current data aside (as `...before-restore-<time>`) instead of deleting it, restores the backup
  and restarts the apps.

## If the PC restarts or you have been away

1. Sign in to Windows. Wait a minute (Docker needs time to start).
2. Double-click `scripts\smoke-test.bat`. If it says "Everything is healthy", you are done.
3. If Docker did not start: open **Docker Desktop** and wait for "Engine running", then run `scripts\start-all.bat`.
4. If Tailscale shows as disconnected: open it from the system tray and connect.

## If something breaks

| What you see | Do this |
|---|---|
| Page won't load in Chrome | Try an Incognito window. If that works, an extension/VPN/proxy in Chrome is blocking it. |
| Page won't load on the phone | Is Tailscale switched on on the phone? Is the PC on? |
| "Verification failed" at sign-in | Open the address exactly as above. Never change the address - passkeys are tied to it. |
| Smoke test shows a FAIL | Do what the yellow line says; then tell Claude the FAIL line. |
| The food side won't log you in | Sign in with your food-app username/password. No email reset exists. Ask Claude about the recovery option. |
| Food card says "Food data unavailable" | The food app is down or the token is wrong - run the smoke test. |
| AI Coach "couldn't sign in" | The token expired (about a year) or was revoked. Make a new one (see below). |

## Phone (one time)

1. Install **Tailscale** from the app store, sign in with the same account, switch it on.
2. Open https://levelup.tail7782ec.ts.net in the phone browser and sign in with your fingerprint/face.
3. Add to Home screen - Android Chrome: menu (three dots) -> Add to Home screen. iPhone Safari: Share -> Add to Home Screen.
4. The Food tab opens the food side inside the same app.

## Ports (so nothing clashes)

8080 = gym app, 3001 = food app, 8090 = the address proxy. **Port 3000 is yours and is never used here.**

## AI Coach

- Settings -> Admin dashboard -> AI Coach. Limits: 3 requests per day.
- It uses **your Claude plan** (counts toward your usage) and sends your plan, logged sets and body weight to Anthropic
  when you use it, only after you agree in the Coach screen.
- Keep it for **yourself only** - do not invite other people and run their Coach on your plan.
- New token (about once a year): in the Coach admin card click **Disconnect**, then in a Terminal run
  `claude.exe setup-token` (the file is inside `%LOCALAPPDATA%\Claude-Data\...\claude-code\...`; ask Claude for the
  exact path), then **Add CLI token**. Never paste the token anywhere except that box.

## Updating

- **Food app:** take a backup first, then in the `appsood` folder run `docker compose pull` then `docker compose up -d`.
- **Gym app:** it contains custom code (Food tab, nutrition card, credits). Don't update it yourself - ask Claude,
  who knows which files were changed (listed in BUILD_LOG.md).

## Rules that keep you safe

- **Cost is Rs 0.** Do not add paid services, cards or API keys. The food app's own AI assistant stays off.
- Never share `.env` files, backup zips or tokens. Never put them in chat.
- The apps are free software (AGPL). Credits and licences are in the app: Settings -> Credits & licences.
- Food numbers from Open Food Facts are crowd-sourced; foods marked "approx." are estimates. Check and correct them.

## Everything Claude did, in order

See **BUILD_LOG.md** (what changed, which upstream files were modified, decisions, open items).

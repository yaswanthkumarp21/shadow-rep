# BUILD_LOG

## 2026-10-22 - Phase 1 (run both apps locally)
- Installed WSL2 + Docker Desktop (winget). Virtualization enabled in BIOS by Yash.
- Project folder: D:\AI\level-up-tracker  (opengym/ is its own git clone of alexpcosta/opengym, ignored by the top-level repo; custom code goes there and is committed there)
- OpenGym: cloned, .env copied from .env.example (localhost defaults), prebuilt images pulled, running at http://localhost:8080. /api/health ok. 1324 exercise images downloaded.
- NutriTrace: prebuilt image ghcr.io/traceapps/nutritrace:latest (v1.4.0) in nutritrace/, running at http://localhost:3001. JWT_SECRET generated locally in nutritrace/.env (never committed).
- Decision: brief said port 3000, but 3000 is already used by another Node program on this PC and NutriTrace's real default is 3001 -> using 3001.
- INSECURE_COOKIES=1 set in nutritrace/.env for plain-http localhost ONLY. Must be removed in Phase 2 (HTTPS).
- UPDATE_CHECK=off (no outbound calls to GitHub). Trace AI left unconfigured.
- Upstream files modified: none.
- Open: Yash to finish NutriTrace first-run wizard (single-user), create OpenGym profile, log a test set and food.

## Commands to remember
- Start OpenGym:     cd opengym; docker compose up -d
- Start NutriTrace:  cd nutritrace; docker compose up -d

## 2026-10-22 - Phase 2 (one address, HTTPS, phone)
- Tailscale (free Personal plan) installed; device renamed 'levelup'. Private address: https://levelup.tail7782ec.ts.net  (tailnet only, NO Funnel). HOSTNAME IS LOCKED - changing it breaks passkeys.
- Tailscale Serve: https:443 -> http://127.0.0.1:8090 (background, survives reboot). Check: tailscale serve status
- proxy/ (Caddy, container level-up-proxy, 127.0.0.1:8090 only): / -> OpenGym web (host:8080), /food/ -> NutriTrace (host:3001). Top-level docker-compose.yml starts it.
- opengym/.env: RP_ID=levelup.tail7782ec.ts.net, ORIGIN=https://levelup.tail7782ec.ts.net, RP_NAME=Level Up Tracker. (Any localhost passkey from Phase 1 no longer works - re-register at the new address.)
- nutritrace/.env: BASE_URL=/food, PUBLIC_URL=https://levelup.tail7782ec.ts.net/food, INSECURE_COOKIES removed.
- Port 3000 is Yash's own program: never touched. Ports used: 8080 (OpenGym), 3001 (NutriTrace), 8090 (proxy).
- Verified over HTTPS from the PC: /, /api/health, /food/, /food/api/health all 200.
- Free-plan terms checked: Tailscale Personal = \, personal/non-commercial use.
- Limitation: PC must be on with Docker + Tailscale running for sync.
- Open: Docker Desktop 'start on login' (user ticks in Docker Settings); phone tests (Tailscale on phone, passkey, add to home screen).

## 2026-10-22 - Phase 3 (backups)
- scripts/backup.ps1 (+ backup.bat double-click): stops OpenGym api + NutriTrace for a few seconds, zips OpenGym data, NutriTrace DB+uploads and both .env files into backups/levelup-<date>_<time>.zip, restarts everything, keeps newest 14. backups/ is git-ignored. Backup zips contain secrets (.env, passkey data) - keep private.
- scripts/restore.ps1 -Zip <file>: moves current data aside as *.before-restore-<time> (never deletes), restores, restarts. -DryRun validates a zip; -TargetRoot <folder> does a practice restore elsewhere.
- Tested: backup run, dry-run validation, practice restore into scratch folder (OpenGym db.json identical to live; NutriTrace SQLite integrity_check = ok, 89 tables). Live data untouched.
- Scheduled task 'LevelUpTracker-Backup': daily 03:00, runs when PC next on if missed (StartWhenAvailable). Verified via Start-ScheduledTask (result 0).
- Bugs found & fixed during testing: (1) docker's stderr progress output aborted the script under ErrorActionPreference=Stop and left opengym-api stopped once (restarted immediately; no data lost) - now wrapped in a Compose helper with try/finally restart; (2) \ empty in param defaults in restore.ps1 on PS 5.1 - now set after param().
- Open: copy a backup to an external drive / own Google Drive occasionally (free). Docker 'start on login' ticked by Yash (AutoStart=true confirmed). Phone tests from Phase 2 still pending.

## 2026-10-22 - Phase 4 (Food tab + Today's nutrition card)
- Food tab: 6th item in OpenGym's bottom bar (apple icon). Opens NutriTrace EMBEDDED (iframe at /food/, same origin) above the tab bar, so one tap returns to OpenGym and the phone back button never leaves the app. Chosen over full-screen navigation for that reason. NutriTrace sends no frame-blocking headers; verified it loads inside the frame.
- Today's nutrition card on Home (below the Today/Coach cards): kcal eaten vs target + bar, protein/carbs/fat vs targets. Tap = open Food tab. Hidden when NutriTrace isn't linked or for guests; shows 'Food data unavailable' if NutriTrace can't be reached; keeps showing last numbers (marked stale) for up to 10 min.
- IMPORTANT finding: NutriTrace's federation API (/api/v1/*) has NO read endpoint for diary totals (only foods read, workouts/activity write). The documented read path is the MCP endpoint (POST /api/mcp, read-only tools get_daily_totals + get_goals, token scope mcp:read). So the card uses MCP, not /api/v1. Enabled with MCP_ENABLED=1 in nutritrace/.env.
- Token: read-only (mcp:read only) NutriTrace API token created by Yash in NutriTrace Settings; stored ONLY in opengym/.env as NUTRITRACE_TOKEN (never committed, never sent to the browser). NUTRITRACE_URL=http://host.docker.internal:3001/food (API container -> host).
- Server route: GET /api/nutrition/today?date=YYYY-MM-DD (signed-in users only; 45 s cache; 4 s timeout; date validated). 11 unit tests in opengym/api/test/nutrition.test.js (pass).
- Body weight single source of truth: NOT done. The documented API has a write:body-measurements scope but no documented endpoint that uses it, so no clean sync is possible. Not hacking it. OpenGym and NutriTrace keep separate weight logs for now (enter weight in OpenGym; ignore NutriTrace's).
- P3 combined daily view: not started (optional).
- Custom code (clearly separated): opengym/api/custom/nutrition.js, opengym/frontend/src/custom/* (FoodView, NutritionCard, useNutrition, custom.css), opengym/docker-compose.override.yml (extra_hosts so the API reaches NutriTrace).
- UPSTREAM FILES MODIFIED (re-apply if rebasing on upstream): opengym/api/server.js (import + 1 spread line in routes), opengym/api/Dockerfile (COPY custom/), opengym/frontend/src/App.jsx (import + /food route), opengym/frontend/src/components/TabBar.jsx (Food tab), opengym/frontend/src/components/Icon.jsx (food icon), opengym/frontend/src/views/Home.jsx (import + card). Committed in the opengym repo (commit e1469a7).
- OpenGym is now BUILT FROM SOURCE locally (docker compose up -d --build), not the prebuilt ghcr images. To update after code changes: cd opengym; docker compose up -d --build
- NutriTrace is in ACCOUNT mode (single_user_mode=false), not single-user: during lockout recovery a new account was registered (the old 'yash' account also still exists). The temporary RECOVERY_TOKEN was removed from nutritrace/.env after use.
- Tests: frontend 169 pass; src/lib/coach.test.js can't load locally (needs the API's @anthropic-ai/claude-agent-sdk package, not installed in api/ on this PC) - environmental, not caused by these changes.
- The built-in browser pane blocks JS/CSS for *.ts.net (ERR_BLOCKED_BY_CLIENT); UI was verified through http://localhost:8090 instead. Real Chrome loads the ts.net address fine.
- Open: verify card with REAL numbers (needs one logged food + goals set in NutriTrace) - the key names inside get_daily_totals/get_goals are matched loosely and still need confirming against real data. Phone tests from Phase 2 still pending.

## 2026-10-22 - Phase 4 status update
- Card/MCP link verified against real NutriTrace data EXCEPT calories/macro totals: Yash's first test food ('Roti Sabji') was saved with empty nutrition, and no calorie goal exists yet, so totals are {} (goals format confirmed: proteins/carbohydrates/fat with max). Yash deferred the final visual check ('do this later'). To finish: give a food real nutrition values, set a Calories goal if NutriTrace offers one, then open Home in real Chrome (Ctrl+Shift+R). If NutriTrace has no calorie goal, optional follow-up = a calorie-target setting in OpenGym.

## 2026-10-22 - Phase 5 (Indian food usability)
- Tested Open Food Facts name search (public API): weak for home-cooked Indian food. Results are mostly dry packet mixes/batters (e.g. 'Rava idli' = 365 kcal/100 g dry mix) or other cuisines ('sabzi' -> Persian stews). OFF also returned HTTP 503 on several queries (rate limits). Conclusion: use custom foods for home cooking; OFF for packaged/barcodes. (USDA not tested: needs a free API key, optional.)
- NutriTrace bulk food import: Settings -> Import & Export -> Bulk Import (JSON or CSV). CSV columns (from NutriTrace's own source): name, brand, barcode, portion, unit, category + nutrient ids (calories, proteins, carbohydrates, fat, ...). 'name' and 'calories' required. Values are PER SERVING; logged quantity = number of servings.
- Created nutritrace/indian-foods-starter.csv: 81 common Indian foods, one natural serving each (roti 40 g, katori 150 g, cup 150 ml...), brand 'approx.' on every row. Values are APPROXIMATE, written from general nutrition knowledge - NOT copied from any dataset (so no licence issue; IFCT/other tables were deliberately not used). Validated with NutriTrace's own parseCsv: 81 valid, 0 errors, 0 duplicate names, every row's calories within 25% of its macros.
- nutritrace/INDIAN_FOODS_GUIDE.md: plain-language guide (import steps, servings, saving usual meals, recipes, copying meals).
- NOT DONE: the import itself (needs Yash's NutriTrace login in the browser; I do not enter passwords). Yash imports via the UI.

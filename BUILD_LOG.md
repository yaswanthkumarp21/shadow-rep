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

## 2026-10-22 - Phase 6 (AI Coach)
- Read docs/AI_COACH.md and Claude-setup-instructions.md first. Coach uses the Claude Agent SDK with a long-lived OAuth token from 'claude setup-token' (NOT an API key). Counts against Yash's Claude plan usage.
- opengym/.env: ADMIN_UIDS=<Yash's profile id> (needed to see Settings -> Admin dashboard). API container recreated. (.env is git-ignored.)
- No 'claude' on PATH; a bundled CLI exists at C:\Users\YASH\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\claude-code\<version>\<hash>\claude.exe (version dir changes when the desktop app updates - re-find with: Get-ChildItem $env:LOCALAPPDATA\Claude-Data -Filter claude.exe -Recurse). Yash ran 'claude.exe setup-token' himself and pasted the token into the admin card; the token never went through chat/logs.
- Verified server-side (non-secret fields only): data/coach.json -> enabled=true, provider=claude, caps perProfileDaily=3, instanceDaily=3, model=null (Claude Code default). Yash reports 'Connected' + test passed.
- Policy note: Anthropic's guidance allows this for the owner's own use but not for routing OTHER people's usage through a personal subscription token -> keep the instance single-user (no invites).
- Trace AI (NutriTrace) remains OFF/unconfigured. No paid API keys anywhere.
- Backups now contain data/coach.json (encrypted token) + data/secret (the key): treat backup zips as credential-bearing. Token valid ~1 year (rotate: Admin -> AI Coach -> Disconnect, new setup-token, Add CLI token).
- Open: Yash still has to consent for his own profile in the Coach area before any data is used; try a first plan/review.

## 2026-10-22 - Phase 7 (polish & freeze)
- scripts/smoke-test.ps1 (+ .bat): 18 checks (Docker, 4 containers + restart policy, Tailscale, Serve, HTTPS endpoints, nutrition route locked, MCP token, RP_ID/ORIGIN match, secure cookies, no secrets in git, backup task + recent backup, Docker autostart). All 18 PASS. Changes nothing.
- scripts/start-all.bat, stop-all.bat: tested - stop leaves 0 containers and data byte-identical; start returns to all-healthy.
- Fresh backup + practice restore on real current data: valid, OpenGym files identical to live (coach.json included), NutriTrace SQLite integrity_check ok, 82 foods, 1 user.
- NutriTrace: Yash already imported the 81 Indian foods (82 foods incl. test food). Real diary totals confirmed through MCP (calories/fat/carbohydrates/proteins keys, matches code); real goals have proteins/fat/carbohydrates only, NO calorie goal -> card shows kcal without target/bar. 13 API unit tests pass (real response formats captured).
- Added Credits & licences screen (frontend/src/custom/CreditsView.jsx, route /credits, link in Settings footer) - covers AGPL (openGym, NutriTrace), Open Food Facts (ODbL attribution), exercise media, MuscleMap, Coach, approx. food list, Tailscale/Caddy. Verified in browser. NEW upstream edits: App.jsx (route + import), Settings.jsx (one link in footer).
- README_MY_SETUP.md written (plain language: start/stop, health check, data locations, backup/restore, reboot, troubleshooting, phone, ports, Coach, updating, rules).
- Tag v1-before-theme set in BOTH repos (level-up-tracker and opengym) = rollback point before Phase 8.
- STILL OPEN (need Yash): (1) phone tests (Tailscale on phone, passkey, /food/ in PWA, home-screen icons, sync both ways); (2) look at the Home nutrition card with real numbers in his Chrome (data is ready now); (3) his consent in Coach screen + first plan; (4) copy a backup off the PC. Optional: calorie target (NutriTrace has no calorie goal key); weight single-source sync not possible via documented API.
- Phase 8 (theme) needs Yash's explicit go-ahead.

## 2026-10-22/23 - Phase 8 step 1 (THEME: tokens + panels + Home) - AWAITING Yash's reaction before continuing
- Housekeeping first: second lockout recovery done (backup taken first), RECOVERY_TOKEN removed again. NutriTrace has 1 user (yash), 82 foods, diary intact. Health check green.
- Design: ORIGINAL 'System window' look (no series art/logos/names/text). Palette #05070d/#0a0f1c navy, cyan #38bdf8 accent, violet #6d28d9/#a78bfa secondary, red/orange warnings. Panels: thin glowing border, scanline texture, soft glow, corner brackets (top-left/bottom-right), angular 3-8px radii. Fonts: Orbitron 700 (headings) + Rajdhani 500/700 (labels, numbers), SELF-HOSTED woff2 (src/custom/fonts/, OFL-1.1, NOTICE.txt); verified zero external requests.
- Skin switch: <html data-skin='system|classic'> stored per device in localStorage (lut-skin; default system). Settings -> Theme: Look (System/Classic) + Animations switch (data-motion). 'Classic' verified identical to original (black bg, green accent, SF fonts, no game panels). prefers-reduced-motion respected by upstream's global rule; in-app switch stops shimmer/pulse (verified). Nothing flashes faster than ~every 3.4 s.
- Accessibility: computed WCAG contrast for every text/background pair - all PASS AA (lowest 4.77:1; label-3 raised to .66 alpha for this). Quest check boxes/xp numerals are text-labelled, not colour-only.
- Game layer (custom/levelup.js + levelup-config.js, ALL numbers tunable in one file; everything derived from real data, nothing stored): XP = sets x10 + workouts x50 + PRs x25 + weigh-ins x5 + food-days x20 (>=3 foods) + protein-days x20 + water-days x10. Level n needs 100*(n-1)^1.6 XP. Stats: STR=10*sum(top5 best e1RM)/bodyweight, END=minutes trained in 28 d /10, AGI=% planned sessions done (28 d)+3/streak-week (cap 30), VIT=% of last 14 d on target (protein>=90% of goal, else foods logged). Rank E/D/C/B/A/S at overall 0/25/50/75/100/130. Tuned after preview: AGI cap and rank thresholds raised because 12 demo weeks scored 'A'.
- Daily quests (from today's plan + NutriTrace): complete today's workout, log meals (3 foods), hit protein target, drink water goal, log body weight; each = the XP source above.
- New API route GET /api/nutrition/range?days&end (last N<=90 days of totals+goals via MCP get_daily_totals_range; cached 45 s; soft failure). 15 API tests pass; frontend 190 tests pass (21 new game-logic tests); same environmental coach.test.js load failure as before.
- Preview verified in the in-app browser through http://localhost:8090 with the app's own demo-data generator + mocked NutriTrace numbers (guest session; test browser only - nothing touched on the real instance). Screenshots in previews/ (git-ignored).
- NEW UPSTREAM FILES TOUCHED this step: frontend/src/views/Home.jsx (import + <SystemHome/>), frontend/src/views/Settings.jsx (import + <ThemeSettings/>), frontend/src/App.jsx (2 imports: skin.js, system-theme.css). Credits screen updated (fonts). Committed in opengym repo (a409630).
- Rollback: git checkout v1-before-theme (both repos) or just pick 'Classic' in Settings -> Theme.
- NEXT (after approval): workout screen, stats screen, Food tab/NutriTrace re-skin via proxy CSS, System-style toasts + PR level-up animation, polish; then re-tag.

## 2026-10-23 - Phase 8 step 2: NutriTrace gets the same System skin (requested by Yash)
- Approach (per brief): NutriTrace is NOT forked or modified. A small nginx container (level-up-foodtheme, in the top-level docker-compose.yml) sits between Caddy and NutriTrace: serves nutritrace/theme/ (system.css + self-hosted fonts) at /food/_lut/ and inserts ONE <script>+<link> before </head> of NutriTrace's HTML. Caddy /food/* now -> foodtheme:80 (was NutriTrace directly). Files: nutritrace/theme/{system.css, nginx.conf.template, fonts/}.
- NutriTrace themes itself with CSS variables (--bg, --surface-*, --accent, --text-*, --macro-*, radii), so the skin mostly overrides those + panels (.card brackets/scanlines/glow), page headers, bottom nav, buttons, sheets. Same palette/fonts/rules as OpenGym. Macro colours: protein violet, carbs cyan, fat orange, kcal amber.
- Follows the SAME switch: the injected script reads localStorage lut-skin/lut-motion (both apps share one origin) -> Settings -> Theme -> Classic also restores NutriTrace's original look LIVE (verified without reload). NutriTrace's own Appearance settings (theme/accent) have no visible effect while System is on.
- Developed against a THROWAWAY local NutriTrace copy (own empty DB, generated test account; your real instance and account were never touched); both throwaway containers and their data were deleted afterwards. Real instance verified through the production chain: login page themed inside the Food tab.
- Two real-world problems found and fixed: (1) NutriTrace's service worker (scope /food/) precaches index.html and serves every load from it, so devices that visited before the skin existed would never see it -> opengym/frontend/src/custom/ntSwReset.js runs once per device (flag lut-nt-sw-reset-v1) and unregisters only the /food/ worker + its workbox/pages caches; NutriTrace re-registers and saves the themed page. (2) Browser HTTP cache: a stale unthemed copy kept being revalidated with 304 -> nginx now strips If-None-Match/If-Modified-Since for HTML requests only (assets still cache 1 year). Do NOT change the injected snippet later (it gets precached by the service worker); change system.css instead (served no-cache).
- Contrast re-verified with an expanded checker (65 pairs incl. controls, macro tiles, and every point on the gradient buttons): all >= AA, lowest 4.89:1. Fixes made: text-3 alpha .66->.72 (both apps), NutriTrace --accent-2 #6d28d9 -> #8b7cf6 (dark button text was only ~3.5:1 on the violet end).
- smoke-test.ps1: now 19 checks (added foodtheme container + 'System skin is being added'). start-all/stop-all unchanged (top-level compose covers foodtheme).
- Upstream NutriTrace files modified: none. OpenGym: App.jsx (+1 import ntSwReset.js). Committed in opengym repo (ca7c787).
- Known/unverified: NutriTrace internal screens other than Diary/Foods/Statistics/Goals/Settings/Add-food/quantity sheet/login were not individually reviewed (e.g. Meals/Recipes editors, charts with real data, water/fasting screens) - they inherit the tokens and should look consistent; tell Claude about anything that looks off. Real-device (phone) look not yet seen by Yash.

## 2026-10-23 - Phase 8 step 3: motion + original emblems + System messages (requested: 'too static')
- MOTION (all CSS/SVG, transform/opacity only, no video/images). OpenGym: custom/system-motion.css (one file, plain non-nested CSS so older Android browsers work); NutriTrace: appended to nutritrace/theme/system.css. Effects: faint scan beam drifting down the screen (~11 s), panels rise in one-by-one on every screen with corner brackets drawing on, titles slide/blur in, XP/stat bars fill with number count-ups (JS, custom/motion.js), quests slide in with pop-in ticks, level/rank glow breathing, rank-badge pulse, primary-button highlight sweep every ~5.5 s, tab line draws over the active tab + START button breathing glow, workout: set row flash + checkbox pop + rest-timer border pulse, stats: charts/heatmap wipe in left-to-right, toast slides in. NutriTrace: panel rise-in, bracket draw, title in, tab line, button sweep, macro-bar shimmer, scan beam.
- Safety: every animation is wrapped in prefers-reduced-motion:no-preference AND html[data-motion!=off] -> Settings -> Theme -> Animations (or the phone's reduce-motion) turns ALL of it off (verified: 0 sys animations). Nothing flashes (fastest loop = ~2.2 s breathing). Classic skin: no overlays, no panels, 0 animations (verified via the real Settings switch).
- ORIGINAL ARTWORK (custom/Emblems.jsx, inline SVG, transparent, drawn here): Level Up Tracker logo mark (hexagon + stacked chevrons in a dashed ring), rank sigils E-S (hexagon + letter, wings grow with rank, glow for B/A/S), rune ring (two counter-rotating dashed rings) around the level box. Used on Home, the message overlays, Credits.
- DECISION: Yash asked for anime logos / transparent anime GIFs. NOT done: those are copyrighted, and his own build brief (Phase 8 IP rule) forbids official artwork, logos, wordmarks, character likenesses, screenshots and series UI text. Offered original animated art instead (above). If he wants his own images he owns/has licensed, they can be added to the slots on request.
- SYSTEM MESSAGES (custom/SystemEvents.jsx + levelup-events.js, 8 unit tests): a finished workout with PRs -> 'NEW RECORD' overlay (names + XP); otherwise a '+N XP' toast; level increase -> 'LEVEL UP' overlay (+rank sigil if rank rose); newly completed quest(s) -> System-styled toast. Rules: workout must be finished <2 min ago (so loading history never fakes a record); level/quests only evaluated after food data resolved; first look at a device/day sets a silent baseline; drops are silent. Any code can also fire one: window.dispatchEvent(new CustomEvent('lut:alert',{detail:{kind,title,sub,xp}})).
- VERIFIED END TO END in the test browser (sample profile, guest): real guided workout of 20 sets with 2 genuine PRs -> overlay 'NEW RECORD ... +300 XP' (= 20x10 + 50 + 2x25, matches formula); logging body weight -> 'Quest complete' toast; food data completing 2 quests -> '2 quests complete (+30 XP)'. NOT directly observed: the workout-quest toast at finish time (the quest list updated correctly on screen; the toast may have shown and expired unseen).
- Bugs found and fixed while testing: (1) nested CSS in the motion file (unsupported on older phones + a missing brace broke the build) -> flattened; (2) heatmap clipped to a sliver by the wipe animation (applied to a too-wide inner element) -> moved to its scroll container; (3) exercise names in lowercase -> capitalised; (4) a message requested in Classic would queue and pop out later -> now discarded.
- NutriTrace motion: stylesheet verified to parse in a real browser (7 keyframes, 19 motion rules) and the beam/bracket/button animations run on the live login page; its internal screens' motion was not visually inspected (no login available).
- Tests: frontend 198 pass (+8), API 15 pass, contrast 65 pairs all >= AA (lowest 4.89:1), health check 19/19. Same environmental coach.test.js load failure as before.
- Files touched upstream this step: frontend/src/App.jsx (+SystemEvents import and 1 line). Committed in opengym repo.

- 2026-10-23: removed the left-to-right 'wipe' on Stats charts/heatmap at Yash's request (looked odd); all other motion unchanged. Yash continues tomorrow morning; Phase 8 not yet re-tagged (v1-before-theme remains the rollback point).

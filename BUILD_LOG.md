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

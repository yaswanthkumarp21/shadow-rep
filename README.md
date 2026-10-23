# Shadow Rep

**Your gym, your food, your progress — levelled up.**

Shadow Rep is a private, self-hosted training and nutrition tracker with a game-style "System" look: levels, XP, stats,
daily quests and record celebrations, all earned from your real workouts and meals. It runs in Docker on your own
computer and reaches your phone over a private HTTPS address — no accounts with anyone, no cloud, nothing to pay.

- **Train:** weekly plan, guided workouts, progression, body weight, stats, an optional AI Coach.
- **Eat:** food diary with calories and macros, foods, recipes, goals, water — in the same app, under the **Food** tab.
- **Level up:** a level, rank (E → S) and four stats (STR, END, AGI, VIT) computed from what you actually do; daily quests; a
  "NEW RECORD" moment when you set a personal best. Every number is tunable in one file.
- **Yours:** passkey sign-in (no passwords), data in plain folders on your PC, nightly backups, no analytics or trackers.

## Built on

Shadow Rep is **inspired by and built on two open-source projects**, combined into one app with its own name, artwork and features.
Thank you to their authors.

| Part | Foundation | Licence |
|---|---|---|
| Gym app (`apps/gym`) | **[OpenGym](https://github.com/DuarteSantos8/openGym)** by Duarte Santos, via the fork [alexpcosta/opengym](https://github.com/alexpcosta/opengym) | AGPL-3.0 |
| Food app (`apps/food`) | **[NutriTrace](https://github.com/TraceApps/nutritrace)** by TraceApps, run unmodified and re-skinned | AGPL-3.0 |

The full story of what was inherited and what was changed is in [`ORIGINS.md`](ORIGINS.md). The in-app credits are under
**Settings → Credits & licences**.

## Layout

```
shadow-rep/
  apps/gym/          the gym app (web + API). Shadow Rep additions: frontend/src/custom, api/custom
  apps/food/         the food app: compose file, the Shadow Rep skin + branding (theme/), Indian foods starter list
  proxy/             one address for both: /  -> gym app,  /food/ -> food app (through the skin proxy)
  scripts/           backup, restore, health check, start/stop helpers
  docker-compose.yml proxy + the skin proxy
  ORIGINS.md  NOTICE.md  LICENSE  BUILD_LOG.md  README_MY_SETUP.md
```

## Set it up (outline — details in `README_MY_SETUP.md` and `BUILD_LOG.md`)

1. Install Docker Desktop (WSL2) and Tailscale (free personal plan; enable HTTPS certificates). Choose your private hostname **once** —
   passkeys are tied to it (`RP_ID`).
2. `git clone <this repo>`, then in `apps/gym`: copy `.env.example` to `.env`, set `RP_ID`, `ORIGIN`, `RP_NAME`; in `apps/food`: copy
   `.env.example` to `.env` and set a long random `JWT_SECRET`.
3. Start everything: `scripts\start-all.bat`. Publish privately: `tailscale serve --bg --https=443 http://127.0.0.1:8090`
   (never use Funnel unless you want it public).
4. Create a read-only token in the food app (Settings → API Tokens, scope `mcp:read` only) and put it in `apps/gym/.env` as
   `NUTRITRACE_TOKEN` (see `.env.example`).
5. Check it: `scripts\smoke-test.bat` (19 checks). Schedule `scripts\backup.ps1` daily.

## Security

- No secrets are in this repository (checked across the full history). `.env` files, data, backups and tokens stay on your computer.
- Backup zips contain passkey data and the encrypted Coach token — keep them private.
- The AI Coach (optional) uses your own Claude account via a setup token, only after you consent; keep the app single-user.

## Licence

Shadow Rep contains OpenGym and NutriTrace (both **AGPL-3.0**), so the whole combined work is offered under the **GNU AGPL v3.0** — see
[`LICENSE`](LICENSE). Original notices are kept in [`NOTICE.md`](NOTICE.md) and `apps/gym/NOTICE.md`. If you let other people use your own
copy over a network, the AGPL requires you to offer them the source, including your changes.
Third-party material: exercise media (hasaneyldrm/exercises-dataset), Open Food Facts data (ODbL), MuscleMap (MIT), Orbitron and
Rajdhani fonts (OFL-1.1) — see the in-app credits. The logo, rank sigils and rune ring are original artwork made for this project.

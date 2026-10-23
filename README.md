# Level Up Tracker

A private, self-hosted gym + food tracker with a game-style "System" look — runs in Docker on your own PC,
reachable from your phone over a private HTTPS address (Tailscale), free to run.

- **Gym:** [OpenGym](https://github.com/DuarteSantos8/openGym) (AGPL-3.0) — workouts, plan, body weight, stats, optional AI Coach.
- **Food:** [NutriTrace](https://github.com/TraceApps/nutritrace) (AGPL-3.0) — diary, foods, recipes, goals. Runs **unmodified** (prebuilt image).
- **This repo:** the glue — one address for both apps, the NutriTrace skin, backups, health check, helper scripts, and the Indian-foods starter list.
- **Level Up additions to OpenGym** (Food tab, "Today's nutrition" card, level/XP/stats/quests, System skin, motion, credits) live in a
  separate repository because OpenGym keeps its own history: **`level-up-tracker-opengym`** (see below).

> Everything here was built with Claude Code. The full story — decisions, every upstream file touched, open items — is in
> [`BUILD_LOG.md`](BUILD_LOG.md). A plain-language guide for the person running it is in [`README_MY_SETUP.md`](README_MY_SETUP.md).

## Layout

```
level-up-tracker/                 <- this repo
  docker-compose.yml              proxy (Caddy) + foodtheme (nginx that adds the skin to NutriTrace)
  proxy/Caddyfile                 one address: /  -> OpenGym,  /food/ -> NutriTrace (via foodtheme)
  nutritrace/
    docker-compose.yml            NutriTrace (prebuilt image)
    .env.example                  copy to .env and fill in (never commit .env)
    theme/                        system.css + fonts + nginx template (the NutriTrace skin)
    indian-foods-starter.csv      81 approximate Indian foods for NutriTrace's Bulk Import
  scripts/                        backup / restore / smoke-test / start-all / stop-all
  opengym/                        <- NOT in this repo: clone level-up-tracker-opengym here (git-ignored)
  BUILD_LOG.md  README_MY_SETUP.md
```

## Set it up (outline — details in README_MY_SETUP.md and BUILD_LOG.md)

1. Install Docker Desktop (WSL2) and Tailscale (free personal plan; enable HTTPS certificates). Pick your private hostname **once** —
   it is baked into passkeys (`RP_ID`); changing it later invalidates them.
2. `git clone <this repo> level-up-tracker` then, inside it: `git clone <level-up-tracker-opengym repo> opengym`
3. `opengym/.env`: copy `.env.example`, set `RP_ID`, `ORIGIN`, `RP_NAME`, then add
   `NUTRITRACE_URL=http://host.docker.internal:3001/food`, `NUTRITRACE_TOKEN=<read-only mcp:read token>` and (optional) `ADMIN_UIDS`.
4. `nutritrace/.env`: copy `.env.example`, set a long random `JWT_SECRET`.
5. Start: `scripts/start-all.bat`, publish privately: `tailscale serve --bg --https=443 http://127.0.0.1:8090`
   (never use Funnel unless you want it public).
6. Check: `scripts/smoke-test.bat` (19 checks), schedule `scripts/backup.ps1` daily.

## Security notes

- No secrets are in this repository (verified across full history before publishing). `.env`, data, backups and tokens stay on your PC.
- Backup zips contain passkey data and the encrypted Coach token — keep them private.
- The repository is private by default; its docs mention a private Tailscale hostname.

## Licences

- OpenGym and NutriTrace are AGPL-3.0; their notices are kept. OpenGym's modified source is the `level-up-tracker-opengym` repo.
- Exercise media (hasaneyldrm/exercises-dataset), Open Food Facts data (ODbL), MuscleMap (MIT), Orbitron and Rajdhani fonts (OFL-1.1):
  see the in-app **Settings → Credits & licences** and `NOTICE.md` in the OpenGym repo.
- Original artwork (logo, rank sigils, rune ring) was drawn for this project. No third-party or series artwork is used.
- The setup files in this repo (scripts, compose files, theme CSS, docs) have **no licence chosen yet** — add one before making the repo public.

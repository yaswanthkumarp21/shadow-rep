# Shadow Rep — gym app (web + API)

The gym half of Shadow Rep: workouts, weekly plan, body weight, stats, passkey sign-in, the AI Coach, plus the
Shadow Rep additions (Food tab, "Today's nutrition" card, levels / XP / stats / quests, the System skin and its motion).

- `frontend/` — React + Vite web app (installable PWA). Shadow Rep additions live in `frontend/src/custom/`.
- `api/` — small Node API (passkeys, per-user data as JSON, Coach). Shadow Rep additions live in `api/custom/`.
- `web/` — nginx that serves the app and proxies `/api`.
- `docs/` — self-hosting, AI Coach, and `docs/origins/` (history inherited from the projects this was built on).

Run it through the project root (`docker-compose.yml` there starts everything). See the root `README.md`.

Built on the open-source OpenGym project (AGPL-3.0, Duarte Santos) — see `NOTICE.md`, `LICENSE` and the root `ORIGINS.md`.

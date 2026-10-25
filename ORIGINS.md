# Origins

Shadow Rep did not start from a blank page. It combines two free-software projects and adds its own layer on top. This
page says plainly what came from where, so credit stays where it belongs.

## What it is built on

### OpenGym — the gym app (`apps/gym`)

- Author: **Duarte Santos** (© 2026), licence **AGPL-3.0**. Project: <https://github.com/DuarteSantos8/openGym>.
- The copy used here came through the fork <https://github.com/alexpcosta/opengym> (which added the AI Coach).
- Its full Git history is included in this repository (the original authors' commits are preserved), so you can see exactly who wrote what.
  Inherited planning and changelog documents are kept in `apps/gym/docs/origins/`.
- Inherited: workouts and plan, progression engine, body weight, stats, passkey sign-in, per-user data storage, the AI Coach,
  the exercise-library integration, and the design system the skin sits on.

### NutriTrace — the food app (`apps/food`)

- Author: **TraceApps**, licence **AGPL-3.0**. Project: <https://github.com/TraceApps/nutritrace>.
- Run as its published, **unmodified** container image. Shadow Rep re-skins and renames it from the outside: a proxy
  serves a stylesheet, an app icon set, a web-app manifest and a small script that swaps the visible product name. NutriTrace's
  own program code is not changed. Credit and licence lines inside its screens are deliberately left as they are.

## What Shadow Rep added

- A new name, logo mark, app icons, favicon and web-app manifest, and a rewritten credits screen.
- The **System** look (colour tokens, glowing panels, fonts, motion) for both apps, with a one-tap switch back to a plain look.
- The **Food** tab, the "Today's nutrition" card, and the link between the apps (a read-only token, kept on the server).
- The game layer: level, XP, stats, rank, daily quests, the record and level-up messages, and original rank sigils and rune ring.
- Backups, restore, a health check, start/stop helpers, a private-HTTPS setup (Tailscale), and an Indian-foods starter list.
- Removal of upstream marketing material (website, banners, screenshots, native app shells, CI that published the upstream images).

The detailed engineering log — every decision and every upstream file touched — is in [`BUILD_LOG.md`](BUILD_LOG.md).

## Licence obligations (why some names remain)

Both foundations are under the GNU AGPL v3.0. That licence lets you rename, restyle and extend the software, but requires that the
**licence text and original copyright notices are kept**, that modified versions say they are modified, and that anyone using a copy
over a network can get its source. That is why `LICENSE`, `NOTICE.md`, the credits screen and this page still name the original projects.
The product's own name, logo and interface are Shadow Rep's.

## Pulling upstream improvements

Because the gym app's history is part of this repository, upstream changes can be merged with
`git subtree pull --prefix=apps/gym <upstream-repo-url> main`. Expect conflicts around the renamed strings and the Shadow Rep
additions; the files that were modified upstream-side are listed in `BUILD_LOG.md`.

- Icons: 14 small icons from game-icons.net (CC BY 3.0; Lorc, Delapouite, DarkZaitzev) in apps/gym/frontend/src/custom/gameicons/, backdrop removed, shown as recolourable masks. Credit: in-app Credits, NOTICE.md, gameicons/NOTICE.txt.

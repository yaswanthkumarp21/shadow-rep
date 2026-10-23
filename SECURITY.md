# Security

This is a private, self-hosted app. There is no public service to report against.

- Keep `.env` files, `data/` folders, backup zips and tokens private; none of them belong in Git (see `.gitignore`).
- Keep the instance reachable only through your private network (Tailscale Serve). Do not enable Funnel unless you mean to publish it.
- If a token or secret may have been exposed: rotate the food-app token, and for the AI Coach use *Disconnect* and create a new setup token.
- Passkeys are tied to the private hostname (`RP_ID`); do not change it casually.
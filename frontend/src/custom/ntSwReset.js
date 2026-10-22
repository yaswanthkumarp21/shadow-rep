// Level Up Tracker — one-time cleanup so NutriTrace picks up the System skin on devices that
// visited it BEFORE the skin existed.
//
// NutriTrace registers a service worker (scope /food/) that pre-saves its index.html and serves
// every page load from that saved copy. A device that saved it before the proxy started adding the
// skin keeps the plain page until its saved copy is replaced — which NutriTrace only does when ITS
// OWN version changes. OpenGym shares the origin, so it can drop that worker and its saved pages
// once per device; NutriTrace then re-registers itself on the next visit, this time saving the
// themed page. Nothing but NutriTrace's offline cache is touched (not OpenGym's, not your data).
const FLAG = 'lut-nt-sw-reset-v1'

export async function resetNutriTraceSW() {
  try {
    if (localStorage.getItem(FLAG)) return
    if (!('serviceWorker' in navigator)) { localStorage.setItem(FLAG, 'n/a'); return }

    const regs = await navigator.serviceWorker.getRegistrations()
    let removed = 0
    for (const r of regs) {
      if (new URL(r.scope).pathname.startsWith('/food/')) { await r.unregister(); removed++ }
    }
    if (removed && typeof caches !== 'undefined') {
      for (const k of await caches.keys()) if (/^workbox-precache|^pages-cache/.test(k)) await caches.delete(k)
    }
    localStorage.setItem(FLAG, String(Date.now()))
  } catch { /* private mode / blocked storage: try again next load */ }
}

resetNutriTraceSW()

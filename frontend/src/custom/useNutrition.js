// Level Up Tracker — fetches the "Today's nutrition" summary from OpenGym's own API
// (which reads NutriTrace server-side; no token in the browser).
import { useEffect, useState } from 'react'
import { todayISO } from '../lib/format.js'

const REFRESH_MS = 60_000

export async function fetchNutrition(date = todayISO()) {
  try {
    const r = await fetch('/api/nutrition/today?date=' + encodeURIComponent(date), { credentials: 'same-origin', cache: 'no-store' })
    if (r.status === 401) return { ok: false, reason: 'not_configured' }   // guest / signed out: nothing to show, hide the card
    if (!r.ok) return { ok: false, reason: 'unavailable' }
    return await r.json()
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

// null = still loading. Refreshes while the screen is on and visible, and when the tab/app returns.
export function useNutrition() {
  const [data, setData] = useState(null)
  useEffect(() => {
    let alive = true
    const load = () => { if (!document.hidden) fetchNutrition().then(d => { if (alive) setData(d) }) }
    load()
    const id = setInterval(load, REFRESH_MS)
    document.addEventListener('visibilitychange', load)
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', load) }
  }, [])
  return data
}

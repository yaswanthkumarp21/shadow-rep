// Level Up Tracker — "System" skin switch.
//
// The skin is a layer on top of openGym's own light/dark theme: `data-skin="system"` on <html>
// restyles tokens and adds the game panels; `data-skin="classic"` is exactly the original look.
// Stored per device (localStorage), not in the synced profile, so a phone and a PC can differ and
// no server field is involved. Applied at import time so there is no flash of the wrong theme.
import { useSyncExternalStore } from 'react'

const SKIN_KEY = 'lut-skin'
const MOTION_KEY = 'lut-motion'

const read = (k, fallback, allowed) => {
  try { const v = localStorage.getItem(k); return allowed.includes(v) ? v : fallback } catch { return fallback }
}
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* private mode: keep it for this session only */ } }

let state = {
  skin: read(SKIN_KEY, 'system', ['system', 'classic']),
  motion: read(MOTION_KEY, 'on', ['on', 'off'])
}
const subs = new Set()

function apply() {
  const de = document.documentElement
  de.dataset.skin = state.skin
  de.dataset.motion = state.motion
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && state.skin === 'system') meta.content = '#05070d'
}
apply()

export const getSkinState = () => state
function set(patch) {
  state = { ...state, ...patch }
  apply()
  subs.forEach(f => f())
}
export const setSkin = v => { write(SKIN_KEY, v); set({ skin: v }) }
export const setMotion = v => { write(MOTION_KEY, v); set({ motion: v }) }

const subscribe = f => { subs.add(f); return () => subs.delete(f) }
export const useSkinState = () => useSyncExternalStore(subscribe, getSkinState, getSkinState)
export const useSystemSkin = () => useSkinState().skin === 'system'

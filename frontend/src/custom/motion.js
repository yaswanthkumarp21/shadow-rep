// Level Up Tracker — small helpers for the JS-driven motion (number count-up, bar fill).
// Everything else that moves is plain CSS (system-motion.css). All of it is skipped when the phone
// asks for reduced motion or when Settings -> Theme -> Animations is off: the final values just appear.
import { useEffect, useRef, useState } from 'react'

export const motionAllowed = () => {
  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.motion !== 'off'
  } catch { return true }
}
const easeOut = t => 1 - Math.pow(1 - t, 3)

/** Counts from the previous value (0 on first show) up to `target` over `ms`. */
export function useCountUp(target, ms = 900) {
  const start = motionAllowed() ? 0 : target
  const [v, setV] = useState(start)
  const cur = useRef(start)
  useEffect(() => {
    if (!motionAllowed()) { cur.current = target; setV(target); return undefined }
    const from = cur.current
    if (from === target) return undefined
    let raf, t0
    const step = ts => {
      if (t0 === undefined) t0 = ts
      const p = Math.min(1, (ts - t0) / ms)
      const val = from + (target - from) * easeOut(p)
      cur.current = val
      setV(Math.round(val))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

/** A percentage that starts at 0 and eases to `pct` (pair with a CSS width transition). */
export function useGrow(pct, delay = 80) {
  const [w, setW] = useState(() => (motionAllowed() ? 0 : pct))
  useEffect(() => {
    if (!motionAllowed()) { setW(pct); return undefined }
    const id = setTimeout(() => setW(pct), delay)
    return () => clearTimeout(id)
  }, [pct, delay])
  return w
}

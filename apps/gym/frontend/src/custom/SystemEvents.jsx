import './system-theme.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { todayISO } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import { t } from '../lib/i18n.js'
import { useSystemSkin } from './skin.js'
import { useNutritionRange } from './useNutrition.js'
import { playerStatus } from './levelup.js'
import { workoutXP, isFresh, newlyDone, levelChange, questToast } from './levelup-events.js'
import { LogoMark, RankSigil } from './Emblems.jsx'
import { GateArt, gateRank } from './Gate.jsx'
import GameIcon from './GameIcon.jsx'
import { setsDone } from '../lib/history.js'

const ls = {
  get: k => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } },
  del: k => { try { localStorage.removeItem(k) } catch { /* private mode */ } }
}

const SHOW_MS = 3400   // how long a System message stays up (tap to close sooner)
const CLEAR_MS = 7000  // the gate-cleared result screen stays a little longer: there are numbers to read
const LEAVE_MS = 450

function Alert({ a, onDone }) {
  const [leaving, setLeaving] = useState(false)
  const close = useCallback(() => setLeaving(true), [])
  useEffect(() => { const id = setTimeout(close, a.kind === 'clear' ? CLEAR_MS : SHOW_MS); return () => clearTimeout(id) }, [close, a.kind])
  useEffect(() => { if (!leaving) return undefined; const id = setTimeout(onDone, LEAVE_MS); return () => clearTimeout(id) }, [leaving, onDone])

  return <div className={`sys-alert-wrap ${a.kind || 'info'}${leaving ? ' leaving' : ''}`} role="status" aria-live="polite" onClick={close}>
    <div className="sys-alert">
      <span className="sys-ring" /><span className="sys-ring r2" />
      {Array.from({ length: 14 }, (_, i) => <i key={i} className="sys-spark" style={{ '--a': `${(i * 360) / 14}deg`, '--d': `${74 + (i % 3) * 24}px` }} />)}
      <div className="sys-alert-top"><LogoMark size={26} /><span className="sys-msg-tag">{t('SYSTEM')}</span></div>
      {a.kind === 'level' && a.rank && <div className="sys-alert-sigil"><RankSigil rank={a.rank} size={64} /></div>}
      {a.kind === 'clear' && <div className="sys-alert-gate"><GateArt rank={a.rank} size={92} /></div>}
      <div className="sys-alert-title">{t(a.title || 'NOTICE')}</div>
      {a.kind === 'clear' && <div className="sys-clear-sw" aria-hidden="true"><span /><GameIcon name="crossed-swords" size={20} /><span /></div>}
      {a.kind === 'clear' && <>
        <div className="sys-alert-sub">{a.rank}-{t('Rank')} {t('dungeon')}</div>
        <div className="sys-clear-grid">
          <div><b>{a.floors}</b><span>{t('Floors')}</span></div>
          <div><b>{a.sets}</b><span>{t('Sets')}</span></div>
          <div><b>{a.minutes}</b><span>{t('Minutes')}</span></div>
        </div>
        {a.records && a.records.length > 0 && <div className="sys-clear-rec">{t('NEW RECORD')}: {a.records.join(' · ')}</div>}
      </>}
      {a.kind === 'level' && <div className="sys-alert-level">LV {a.level}</div>}
      {a.sub && a.kind !== 'clear' && <div className="sys-alert-sub">{a.sub}</div>}
      {a.xp ? <div className="sys-alert-xp">+{a.xp} XP</div> : null}
    </div>
  </div>
}

// System-style messages: a record or level-up overlay, and quest-complete toasts. Everything fires from real
// data changes (see levelup-events.js for the rules). Nothing renders in the Classic skin.
export default function SystemEvents() {
  const sys = useSystemSkin()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const storeReady = useStore(s => s.ready)
  const isGuest = useStore(s => s.isGuest())
  const range = useNutritionRange(sys)
  const [queue, setQueue] = useState([])
  const seenWorkouts = useRef(null)
  const uid = user?.id || 'guest'
  const loaded = storeReady || isGuest

  const show = useCallback(a => setQueue(q => [...q, { ...a, id: Date.now() + Math.random() }]), [])
  const next = useCallback(() => setQueue(q => q.slice(1)), [])

  // anything can ask for a message:  window.dispatchEvent(new CustomEvent('sr:alert', { detail: { kind, title, sub } }))
  useEffect(() => {
    if (!sys) { setQueue([]); return undefined }   // Classic skin: show nothing, and don't hoard messages for later
    const h = e => show(e.detail || {})
    window.addEventListener('sr:alert', h)
    return () => window.removeEventListener('sr:alert', h)
  }, [sys, show])

  // 1) a workout was just finished -> new record overlay, or a quiet "+N XP" toast
  const n = S.workouts.length
  useEffect(() => {
    if (!sys || !loaded) return
    const prev = seenWorkouts.current
    seenWorkouts.current = n
    const last = S.workouts[n - 1]
    if (prev === null || n <= prev || !isFresh(last)) return
    const xp = workoutXP(last)
    const names = (last.prs || []).map(id => (EXIDX[id] || {}).n || id)
    const minutes = Math.max(1, Math.round(((last.end || 0) - (last.start || 0)) / 60000))
    show({
      kind: 'clear', title: 'GATE CLEARED', xp, rank: gateRank((last.entries || []).length),
      floors: (last.entries || []).length, sets: setsDone(last), minutes: Math.min(minutes, 999),
      records: names.slice(0, 2).concat(names.length > 2 ? [`+${names.length - 2}`] : [])
    })
  }, [sys, loaded, n]) // eslint-disable-line react-hooks/exhaustive-deps

  // 2) level-ups and completed quests — only once food data has resolved, so a late NutriTrace response
  //    can never look like a level-up
  const ready = range !== null && (range.ok || range.reason === 'not_configured')
  useEffect(() => {
    if (!sys || !loaded || !ready) return
    const nut = range.ok ? range : null
    const today = todayISO()
    const p = playerStatus(S, nut, today)

    const lk = `sr-level:${uid}`
    const seen = ls.get(lk)
    const ch = levelChange(seen == null ? null : Number(seen), p.level, ls.get(lk + ':rank'), p.stats.rank)
    if (ch.kind === 'up') {
      show({ kind: 'level', title: 'LEVEL UP', level: p.level, rank: ch.rankUp ? p.stats.rank : null, sub: ch.rankUp ? t('Rank {0} reached', p.stats.rank) : t('You are now level {0}', p.level) })
    }
    ls.set(lk, String(p.level)); ls.set(lk + ':rank', p.stats.rank)

    const qk = `sr-quests:${uid}:${today}`
    let prevIds = null
    try { prevIds = JSON.parse(ls.get(qk)) } catch { prevIds = null }
    const done = newlyDone(prevIds, p.quests)
    if (done.length) useUI.getState().toast(questToast(done))
    ls.set(qk, JSON.stringify(p.quests.filter(q => q.done).map(q => q.id)))
    // tidy yesterday's bookkeeping
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i)
        if (k && k.startsWith(`sr-quests:${uid}:`) && !k.endsWith(today)) ls.del(k)
      }
    } catch { /* ignore */ }
  }, [sys, loaded, ready, S, range, uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const cur = queue[0]
  return sys && cur ? <Alert key={cur.id} a={cur} onDone={next} /> : null
}

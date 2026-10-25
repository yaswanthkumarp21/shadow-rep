import './system-theme.css'
import { useId } from 'react'
import { t } from '../lib/i18n.js'
import { useSystemSkin } from './skin.js'

// Gates & dungeons for the Workout tab (System skin only). Original artwork — an arch of stone with a swirling
// portal inside — drawn here as inline SVG; the slow swirl lives in system-motion.css and stops with the
// Animations switch / reduced motion. Renders nothing in the Classic skin.

const GATE_RANKS = ['E', 'D', 'C', 'B', 'A', 'S']
const GATE_COLOR = { E: '#94a3b8', D: '#38bdf8', C: '#34d399', B: '#a78bfa', A: '#fbbf24', S: '#f472b6' }

/** A gate's rank from how big the dungeon is: more exercises = a harder gate. */
export function gateRank(exerciseCount) {
  const n = Math.max(0, Math.floor(exerciseCount || 0))
  return GATE_RANKS[Math.max(0, Math.min(GATE_RANKS.length - 1, n - 3))]   // <=3 E, 4 D, 5 C, 6 B, 7 A, 8+ S
}

export function GateArt({ rank = 'E', size = 120 }) {
  const c = GATE_COLOR[rank] || GATE_COLOR.E
  const id = 'gt' + useId().replace(/:/g, '')
  return <svg className={'sys-gate-art r-' + rank} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false" style={{ '--gc': c }}>
    <defs>
      <radialGradient id={id} cx="50%" cy="55%" r="55%"><stop offset="0" stopColor={c} stopOpacity=".95" /><stop offset=".55" stopColor={c} stopOpacity=".35" /><stop offset="1" stopColor="#05070d" stopOpacity="1" /></radialGradient>
    </defs>
    {/* light spilling onto the ground */}
    <ellipse cx="60" cy="108" rx="40" ry="6" fill={c} opacity=".22" />
    {/* the portal */}
    <path d="M30 108 V52 C30 28 44 14 60 14 C76 14 90 28 90 52 V108 Z" fill={`url(#${id})`} />
    <g className="gate-swirl" style={{ transformOrigin: '60px 62px' }} fill="none" stroke="#e8f3ff" strokeLinecap="round">
      <ellipse cx="60" cy="62" rx="22" ry="34" strokeWidth="1.2" strokeDasharray="10 8" opacity=".8" />
      <ellipse cx="60" cy="62" rx="14" ry="24" strokeWidth="1" strokeDasharray="4 7" opacity=".6" />
    </g>
    {/* the stone arch */}
    <path d="M22 112 V52 C22 22 40 6 60 6 C80 6 98 22 98 52 V112 H88 V52 C88 30 76 16 60 16 C44 16 32 30 32 52 V112 Z" fill="#0b1226" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M22 70 H32 M88 70 H98 M22 90 H32 M88 90 H98" stroke={c} strokeOpacity=".5" strokeWidth="1" />
    <path d="M52 8 L60 0 L68 8" fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M14 112 H106 M18 116 H102" stroke={c} strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
}

/** "A gate has appeared": today's routine as a dungeon, shown above the start button. */
export function GateBanner({ name, exercises }) {
  const sys = useSystemSkin()
  if (!sys) return null
  const rank = gateRank(exercises)
  return <div className={'sys-gate r-' + rank} role="note" aria-label={t('Gate rank {0}: {1}', rank, name)}>
    <GateArt rank={rank} />
    <div className="sys-gate-copy">
      <div className="sys-gate-tag">{t('Gate detected')}</div>
      <div className="sys-gate-rank">{rank}-{t('Rank')} {t('dungeon')}</div>
      <div className="sys-gate-name">{name}</div>
      <div className="sys-gate-sub">{t('{0} floors to clear', exercises)}</div>
    </div>
  </div>
}

/** Floors of the dungeon during a workout: one pip per exercise (or superset). */
export function DungeonFloors({ floor, floors }) {
  const sys = useSystemSkin()
  if (!sys || !floors) return null
  return <div className="sys-floors" aria-label={t('Floor {0} of {1}', floor, floors)}>
    <span className="sys-floors-k">{t('Dungeon')}</span>
    <span className="sys-floors-pips" aria-hidden="true">
      {Array.from({ length: floors }, (_, i) => <i key={i} className={i + 1 < floor ? 'done' : i + 1 === floor ? 'now' : ''} />)}
    </span>
    <span className="sys-floors-n">{floor}/{floors}</span>
  </div>
}

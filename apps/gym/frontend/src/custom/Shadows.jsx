// Original artwork for the System skin: the hooded Hunter (your hero) and the shadow soldiers.
// Drawn here from scratch as inline SVG silhouettes — not taken from any show, game or artist.
// Motion (eye glow, summon) lives in system-motion.css and stops with the Animations switch.

const RANK_AURA = { E: 0, D: 1, C: 2, B: 3, A: 4, S: 5 }
const RANK_COLOR = { E: '#94a3b8', D: '#38bdf8', C: '#34d399', B: '#a78bfa', A: '#fbbf24', S: '#f472b6' }

/** The Hunter: a hooded silhouette with glowing eyes. Gear and aura grow with rank (E → S). */
export function HeroSilhouette({ rank = 'E', size = 150 }) {
  const n = RANK_AURA[rank] ?? 0
  const c = RANK_COLOR[rank] || '#38bdf8'
  return <svg className={'sys-hero-art r-' + rank} viewBox="0 0 120 140" width={size * 120 / 140} height={size} aria-hidden="true" focusable="false" style={{ '--rk': c }}>
    <defs>
      <radialGradient id="heroAura" cx="50%" cy="55%" r="55%"><stop offset="0" stopColor={c} stopOpacity=".38" /><stop offset="1" stopColor={c} stopOpacity="0" /></radialGradient>
      <linearGradient id="heroCloak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#101a33" /><stop offset="1" stopColor="#04070f" /></linearGradient>
    </defs>
    <ellipse className="hero-aura" cx="60" cy="78" rx="58" ry="62" fill="url(#heroAura)" />
    {/* aura flames: one more pair per rank */}
    {Array.from({ length: n }, (_, i) => <g key={i} className="hero-flame" opacity={0.85 - i * 0.12} fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round">
      <path d={`M${22 - i * 3} ${118 - i * 14} C${14 - i * 3} ${100 - i * 14} ${26 - i * 3} ${92 - i * 14} ${20 - i * 3} ${78 - i * 14}`} />
      <path d={`M${98 + i * 3} ${118 - i * 14} C${106 + i * 3} ${100 - i * 14} ${94 + i * 3} ${92 - i * 14} ${100 + i * 3} ${78 - i * 14}`} />
    </g>)}
    {/* cape wings from rank B */}
    {n >= 3 && <path d="M30 60 L6 98 L24 92 L18 122 L40 100 Z M90 60 L114 98 L96 92 L102 122 L80 100 Z" fill="#0a1226" stroke={c} strokeWidth="1.2" strokeLinejoin="round" opacity=".9" />}
    {/* cloak + hood */}
    <path d="M60 8 C45 12 39 28 41 43 L34 50 C28 72 20 104 16 134 L104 134 C100 104 92 72 86 50 L79 43 C81 28 75 12 60 8 Z" fill="url(#heroCloak)" stroke={c} strokeOpacity=".7" strokeWidth="1.4" strokeLinejoin="round" />
    {/* fold lines */}
    <path d="M60 52 L58 134 M46 62 L38 134 M74 62 L82 134" stroke={c} strokeOpacity=".18" strokeWidth="1" fill="none" />
    {/* face void */}
    <path d="M60 22 C51 24 48 35 50 45 C53 52 67 52 70 45 C72 35 69 24 60 22 Z" fill="#010208" />
    {/* eyes */}
    <g className="hero-eyes" fill={c}>
      <polygon points="51.5,37 58,38.6 57,41 51,39.6" />
      <polygon points="68.5,37 62,38.6 63,41 69,39.6" />
    </g>
    {/* daggers on the hips from rank D */}
    {n >= 1 && <g fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><path d="M40 98 L30 122" /><path d="M80 98 L90 122" /><path d="M37 104 L43 107 M77 107 L83 104" strokeWidth="1.6" /></g>}
    {/* crown spikes at A and S */}
    {n >= 4 && <path d="M46 12 L50 2 L55 9 L60 0 L65 9 L70 2 L74 12" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />}
  </svg>
}

/** One shadow soldier. `on` = summoned (violet eyes lit); otherwise a faint outline. `fresh` plays the summon once. */
export function ShadowSoldier({ on = false, fresh = false, size = 52, variant = 0 }) {
  const horn = variant % 3 === 0
  return <svg className={'sys-soldier' + (on ? ' on' : '') + (fresh ? ' fresh' : '')} viewBox="0 0 44 60" width={size * 44 / 60} height={size} aria-hidden="true" focusable="false">
    {horn && <path d="M15 11 L10 2 M29 11 L34 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />}
    <path d="M22 5 C16 5 13 11 14 17 L9 22 C6 36 4 48 3 58 L41 58 C40 48 38 36 35 22 L30 17 C31 11 28 5 22 5 Z" fill="currentColor" />
    <g className="sol-eyes" fill={on ? '#a78bfa' : 'transparent'}>
      <polygon points="16.5,14.5 21,15.6 20.4,17.4 16,16.6" />
      <polygon points="27.5,14.5 23,15.6 23.6,17.4 28,16.6" />
    </g>
  </svg>
}

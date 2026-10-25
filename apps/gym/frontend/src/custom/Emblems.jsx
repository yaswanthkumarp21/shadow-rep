import { useId } from 'react'

// Original artwork for the System skin — drawn here, not taken from anywhere. Inline SVG, so it is
// transparent, resolution-independent and a few hundred bytes; the motion lives in system-motion.css
// (classes emb-*) and stops with the Animations switch / reduced-motion like everything else.

/** The Shadow Rep mark: a hexagon holding two stacked "level up" chevrons inside a dashed ring, with an offset "shadow" hexagon behind it. */
export function LogoMark({ size = 32, className = '' }) {
  const g = 'lg' + useId().replace(/:/g, '')
  return <svg className={'emb-logo ' + className} viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#8b7cf6" />
      </linearGradient>
    </defs>
    <g className="emb-ring"><circle cx="32" cy="32" r="30" fill="none" stroke={`url(#${g})`} strokeWidth="1.4" strokeDasharray="3 5" strokeLinecap="round" /></g>
    {/* the "shadow": the same hexagon, offset behind */}
    <polygon className="emb-shadow" points="32,6 54,18.5 54,45.5 32,58 10,45.5 10,18.5" transform="translate(3.4 3.4)" fill="none" stroke="#6d28d9" strokeOpacity=".75" strokeWidth="2.2" strokeLinejoin="round" />
    <polygon points="32,6 54,18.5 54,45.5 32,58 10,45.5 10,18.5" fill="rgba(56,189,248,.10)" stroke={`url(#${g})`} strokeWidth="2.2" strokeLinejoin="round" />
    <g className="emb-core" fill="none" stroke={`url(#${g})`} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 32 L32 22 L42 32" /><path d="M22 43 L32 33 L42 43" />
    </g>
  </svg>
}

const RANK_ART = {
  E: { c: '#94a3b8', wings: 0 }, D: { c: '#38bdf8', wings: 0 }, C: { c: '#34d399', wings: 0 },
  B: { c: '#a78bfa', wings: 1 }, A: { c: '#fbbf24', wings: 2 }, S: { c: '#f472b6', wings: 3 }
}

/** A hexagonal rank sigil: letter inside, with "wings" that grow with rank (none for E–C, three pairs for S). */
export function RankSigil({ rank = 'E', size = 44, className = '' }) {
  const a = RANK_ART[rank] || RANK_ART.E
  return <svg className={`emb-rank r-${rank} ${className}`} viewBox="0 0 64 56" width={size} height={size * 56 / 64} aria-hidden="true" focusable="false" style={{ '--rk': a.c }}>
    {Array.from({ length: a.wings }, (_, i) => <g key={i} className="emb-wing" fill="none" stroke={a.c} strokeWidth="2" strokeLinecap="round" opacity={0.95 - i * 0.2}>
      <path d={`M13 ${25 - i * 6} L${2 - i * 0} ${19 - i * 6}`} /><path d={`M51 ${25 - i * 6} L${62 + i * 0} ${19 - i * 6}`} />
    </g>)}
    <polygon className="emb-hex" points="32,4 50,14 50,38 32,48 14,38 14,14" fill="rgba(5,7,13,.65)" stroke={a.c} strokeWidth="2.2" strokeLinejoin="round" />
    <text x="32" y="33.5" textAnchor="middle" fontSize="19" fontWeight="700" fill={a.c} style={{ fontFamily: 'var(--font-hud)' }}>{rank}</text>
  </svg>
}

/** Two counter-rotating dashed rings; sits behind its parent (position it with the .emb-rune CSS). */
export function RuneRing({ pct = 0 }) {
  const C = 2 * Math.PI * 44
  const p = Math.max(0, Math.min(100, pct))
  return <svg className="emb-rune" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(56,189,248,.16)" strokeWidth="4" />
    <circle className="emb-xpring" cx="50" cy="50" r="44" fill="none" stroke="url(#xpg)" strokeWidth="4" strokeLinecap="round"
      strokeDasharray={C} strokeDashoffset={C * (1 - p / 100)} transform="rotate(-90 50 50)" />
    <defs><linearGradient id="xpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b7cf6" /><stop offset="1" stopColor="#38bdf8" /></linearGradient></defs>
    <g className="emb-rune-a"><circle cx="50" cy="50" r="48.5" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" strokeLinecap="round" /></g>
    <g className="emb-rune-b"><circle cx="50" cy="50" r="37" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="14 9 3 9" strokeLinecap="round" opacity=".7" /></g>
  </svg>
}

/** Four-axis stat radar (STR / END / AGI / VIT, 0-100 each). */
export function StatRadar({ values, size = 132 }) {
  const c = 50, R = 36
  const pts = values.map((v, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 2, r = R * Math.max(0.06, Math.min(100, v) / 100)
    return [c + r * Math.cos(a), c + r * Math.sin(a)]
  })
  const ring = k => [0, 1, 2, 3].map(i => { const a = -Math.PI / 2 + i * Math.PI / 2; return (c + R * k * Math.cos(a)).toFixed(1) + ',' + (c + R * k * Math.sin(a)).toFixed(1) }).join(' ')
  const labels = ['STR', 'END', 'AGI', 'VIT']
  return <svg className="emb-radar" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false">
    {[0.33, 0.66, 1].map(k => <polygon key={k} points={ring(k)} fill="none" stroke="rgba(56,189,248,.22)" strokeWidth=".7" />)}
    <path d={`M${c} ${c - R}V${c + R}M${c - R} ${c}H${c + R}`} stroke="rgba(56,189,248,.16)" strokeWidth=".6" />
    <polygon points={pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')} fill="rgba(56,189,248,.24)" stroke="#38bdf8" strokeWidth="1.4" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 3px rgba(56,189,248,.7))' }} />
    {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="1.8" fill="#e8f3ff" />)}
    {labels.map((l, i) => { const a = -Math.PI / 2 + i * Math.PI / 2; return <text key={l} x={c + (R + 9) * Math.cos(a)} y={c + (R + 9) * Math.sin(a) + 2.2} textAnchor="middle" fontSize="6" fontWeight="700" fill="rgba(184,208,245,.85)" style={{ fontFamily: 'var(--font-hud)' }}>{l}</text> })}
  </svg>
}

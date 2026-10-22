import { useId } from 'react'

// Original artwork for the System skin — drawn here, not taken from anywhere. Inline SVG, so it is
// transparent, resolution-independent and a few hundred bytes; the motion lives in system-motion.css
// (classes emb-*) and stops with the Animations switch / reduced-motion like everything else.

/** The Level Up Tracker mark: a hexagon holding two stacked "level up" chevrons inside a dashed ring. */
export function LogoMark({ size = 32, className = '' }) {
  const g = 'lg' + useId().replace(/:/g, '')
  return <svg className={'emb-logo ' + className} viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#8b7cf6" />
      </linearGradient>
    </defs>
    <g className="emb-ring"><circle cx="32" cy="32" r="30" fill="none" stroke={`url(#${g})`} strokeWidth="1.4" strokeDasharray="3 5" strokeLinecap="round" /></g>
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
export function RuneRing() {
  return <svg className="emb-rune" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g className="emb-rune-a"><circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" strokeLinecap="round" /></g>
    <g className="emb-rune-b"><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="14 9 3 9" strokeLinecap="round" opacity=".7" /></g>
  </svg>
}

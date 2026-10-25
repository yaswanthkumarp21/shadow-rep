import './system-theme.css'
import { useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { useSystemSkin } from './skin.js'
import { useNutritionRange } from './useNutrition.js'
import { playerStatus } from './levelup.js'
import { RANKS } from './levelup-config.js'
import { RankSigil } from './Emblems.jsx'

// Stats screen: the "Hunter record" panel — where your XP comes from, and how far the next rank is.
// Derived from the same real data as Home; renders nothing in the Classic skin.
const SOURCES = [
  { key: 'sets', label: 'Sets', c: '#38bdf8' },
  { key: 'workouts', label: 'Workouts', c: '#8b7cf6' },
  { key: 'prs', label: 'Records', c: '#fbbf24' },
  { key: 'foodDays', label: 'Food days', c: '#34d399' },
  { key: 'proteinDays', label: 'Protein', c: '#f87171' },
  { key: 'waterDays', label: 'Water', c: '#22d3ee' },
  { key: 'weighIns', label: 'Weigh-ins', c: '#94a3b8' }
]

/** Next rank above `rank`, with the overall score it needs; null at the top. */
export function nextRank(rank) {
  const i = RANKS.findIndex(r => r.rank === rank)
  return i >= 0 && i < RANKS.length - 1 ? RANKS[i + 1] : null
}

export default function SystemStats() {
  const sys = useSystemSkin()
  const S = useStore(s => s.S)
  const range = useNutritionRange(sys)
  const nut = range && range.ok ? range : null
  const p = useMemo(() => (sys ? playerStatus(S, nut, todayISO()) : null), [sys, S, nut])
  if (!sys || !p) return null

  const st = p.stats
  const total = Object.values(p.parts).reduce((a, b) => a + b, 0)
  const rows = SOURCES.map(s => ({ ...s, xp: p.parts[s.key] || 0 })).filter(r => r.xp > 0).sort((a, b) => b.xp - a.xp)
  const top = rows.length ? rows[0].xp : 1
  const nr = nextRank(st.rank)

  return <div className="card sys-card sys-record" aria-label={t('Hunter record')}>
    <div className="sys-head">
      <span className="sys-tag">{t('Hunter record')}</span>
      <span className="sys-count">{t('LV')} {p.level}</span>
    </div>
    <div className="sys-rec-top">
      <RankSigil rank={st.rank} size={54} />
      <div className="sys-rec-main">
        <div className="sys-rec-xp">{total.toLocaleString()} <small>{t('total XP')}</small></div>
        <div className="sys-rec-next">{nr
          ? t('{0} more overall score to reach rank {1}', Math.max(0, nr.min - st.overall), nr.rank)
          : t('Top rank reached')}</div>
      </div>
    </div>
    {rows.length > 0 && <div className="sys-src" role="list" aria-label={t('XP sources')}>
      {rows.map(r => <div className="sys-src-row" role="listitem" key={r.key} style={{ '--c': r.c }}>
        <span className="sys-src-k">{t(r.label)}</span>
        <span className="sys-src-bar" aria-hidden="true"><i style={{ width: Math.max(4, Math.round(r.xp / top * 100)) + '%' }} /></span>
        <span className="sys-src-v">{r.xp.toLocaleString()}</span>
      </div>)}
    </div>}
  </div>
}

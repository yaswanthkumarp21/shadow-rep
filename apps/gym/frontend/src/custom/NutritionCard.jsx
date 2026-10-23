import './custom.css'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { useNutrition } from './useNutrition.js'

const fmt = n => (n == null ? '–' : Math.round(n).toLocaleString())
const pct = (eaten, target) => (target > 0 ? Math.min(100, (eaten / target) * 100) : 0)

function Macro({ label, m }) {
  return <div className="nut-macro">
    <div className="nut-mlbl">{label}</div>
    <div className="nut-mval">{fmt(m.eaten)}<span className="muted small">{m.target ? ' / ' + fmt(m.target) : ''} g</span></div>
    <div className="nut-bar sm"><i style={{ width: pct(m.eaten, m.target) + '%' }} /></div>
  </div>
}

// Home card: calories + macros for today. Hidden when NutriTrace isn't linked (so a plain
// Shadow Rep install is unaffected), and shows a quiet "unavailable" line when it can't be reached.
export default function NutritionCard({ nav }) {
  const d = useNutrition()
  if (d && d.ok === false && d.reason === 'not_configured') return null

  const open = () => nav('/food')
  const head = <div className="today-row" onClick={open}>
    <div className="row" style={{ gap: 9, minWidth: 0 }}>
      <span className="lrow-i" style={{ background: 'var(--green, var(--acc))' }}><Icon name="food" /></span>
      <div style={{ minWidth: 0 }}>
        <div className="lbl2">{t('Food')}</div>
        <div className="ttl">{t("Today's nutrition")}</div>
      </div>
    </div>
    <Icon name="chevronRight" className="chev" />
  </div>

  if (!d) return <div className="card nut-card">{head}<div className="muted small nut-note">{t('Loading…')}</div></div>
  if (!d.ok) return <div className="card nut-card">{head}<div className="muted small nut-note">{t('Food data unavailable')}</div></div>

  const c = d.calories
  const over = c.target > 0 && c.eaten > c.target
  return <div className="card nut-card">
    {head}
    <div className="row between" style={{ alignItems: 'baseline', marginTop: 6 }}>
      <div className="big">{fmt(c.eaten)} <span className="muted" style={{ fontSize: '1rem' }}>{c.target ? '/ ' + fmt(c.target) + ' ' : ''}kcal</span></div>
      {c.target > 0 && <span className="small" style={{ color: over ? 'var(--orange)' : 'var(--label-2)' }}>
        {over ? t('{0} over', fmt(c.eaten - c.target)) : t('{0} left', fmt(c.target - c.eaten))}
      </span>}
    </div>
    <div className={'nut-bar' + (over ? ' over' : '')}><i style={{ width: pct(c.eaten, c.target) + '%' }} /></div>
    <div className="nut-macros">
      <Macro label={t('Protein')} m={d.protein} />
      <Macro label={t('Carbs')} m={d.carbs} />
      <Macro label={t('Fat')} m={d.fat} />
    </div>
    {!d.items && <div className="muted small nut-note">{t('Nothing logged yet today.')}</div>}
    {d.stale && <div className="dim small nut-note">{t('Showing the last known numbers.')}</div>}
  </div>
}

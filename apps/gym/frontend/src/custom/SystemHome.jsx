import './custom.css'
import './system-theme.css'
import { useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { useSystemSkin } from './skin.js'
import { useNutritionRange } from './useNutrition.js'
import { playerStatus } from './levelup.js'
import { useCountUp, useGrow } from './motion.js'
import { LogoMark, RankSigil, RuneRing } from './Emblems.jsx'

const STAT_NAMES = { STR: 'Strength', END: 'Endurance', AGI: 'Agility', VIT: 'Vitality' }

function Stat({ code, value, known = true }) {
  const shown = useCountUp(known ? value : 0, 1000)
  const width = useGrow(known ? Math.min(100, value) : 0, 160)
  return <div className="sys-stat" aria-label={`${STAT_NAMES[code]} ${known ? value : 'unknown'}`}>
    <div className="k">{code}</div>
    <div className="v">{known ? shown : '–'}</div>
    <div className="sys-bar sm"><i style={{ width: width + '%' }} /></div>
  </div>
}

function XpBar({ into, need, pct }) {
  const width = useGrow(pct, 200)
  const shown = useCountUp(into, 1100)
  return <>
    <div className="sys-bar" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={into} aria-label="XP">
      <i style={{ width: width + '%' }} />
    </div>
    <div className="sys-xp">{shown.toLocaleString()} / {need.toLocaleString()} XP</div>
  </>
}

// Home: PLAYER STATUS (level, XP, rank, stats) and DAILY QUESTS — all derived from real data.
// Renders nothing in the Classic skin, so the original Home is untouched.
export default function SystemHome() {
  const sys = useSystemSkin()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const range = useNutritionRange(sys)
  const nut = range && range.ok ? range : null

  const p = useMemo(() => (sys ? playerStatus(S, nut, todayISO()) : null), [sys, S, nut])
  const level = useCountUp(p ? p.level : 1, 800)
  if (!sys || !p) return null

  const st = p.stats
  const doneCount = p.quests.filter(q => q.done).length
  const allDone = p.quests.length > 0 && doneCount === p.quests.length

  return <>
    <div className="sys-msg" role="status">
      <LogoMark size={30} />
      <span className="sys-msg-tag">{t('SYSTEM')}</span>
      {allDone ? t('All daily quests complete. Well done.')
        : p.quests.length - doneCount === 1 ? t('1 daily quest active.')
        : t('{0} daily quests active.', p.quests.length - doneCount)}
    </div>

    <div className="card sys-card" aria-label={t('Player status')}>
      <div className="sys-head">
        <span className="sys-tag">{t('Player status')}</span>
        <span className="sys-rankbox">
          <RankSigil rank={st.rank} size={42} />
          <span className="sys-rank" title={t('Overall score {0}', st.overall)}>{t('RANK')} {st.rank}</span>
        </span>
      </div>
      <div className="sys-id">
        <div className="sys-levelwrap">
          <RuneRing />
          <div className="sys-level"><small>LV</small><b>{level}</b></div>
        </div>
        <div className="sys-who">
          <div className="sys-name">{user?.name || t('Player')}</div>
          <div className="sys-title">{st.rank}-{t('Rank')} · {t(st.title)}</div>
          <XpBar into={p.into} need={p.need} pct={p.pct} />
        </div>
      </div>
      <div className="sys-stats">
        <Stat code="STR" value={st.STR} />
        <Stat code="END" value={st.END} />
        <Stat code="AGI" value={st.AGI} />
        <Stat code="VIT" value={st.VIT} known={st.vitKnown} />
      </div>
    </div>

    <div className="card sys-card" aria-label={t('Daily quests')}>
      <div className="sys-head">
        <span className="sys-tag">{t('Daily quests')}</span>
        <span className="sys-count">{doneCount}/{p.quests.length}</span>
      </div>
      <div className="sys-quests">
        {p.quests.map(q => <div key={q.id} className={'sys-quest' + (q.done ? ' done' : '')}>
          <span className="sys-check" aria-hidden="true">{q.done && <Icon name="check" />}</span>
          <div className="sys-qtext">
            <div className="sys-qlabel">{t(q.label)}</div>
            {q.detail && <div className="sys-qdetail">{q.detail}</div>}
          </div>
          <span className="sys-xpgain">+{q.xp} XP</span>
        </div>)}
      </div>
    </div>
  </>
}

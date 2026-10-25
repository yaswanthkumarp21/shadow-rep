import './custom.css'
import './system-theme.css'
import { useMemo, useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { useSystemSkin } from './skin.js'
import { useNutritionRange } from './useNutrition.js'
import { playerStatus, shadowArmy } from './levelup.js'
import { HeroSilhouette, ShadowSoldier } from './Shadows.jsx'
import { useUI } from '../store/useUI.js'
import GameIcon from './GameIcon.jsx'
import { useCountUp, useGrow } from './motion.js'
import { LogoMark, RankSigil, RuneRing, StatRadar } from './Emblems.jsx'

const STAT_ICON = { STR: 'muscle-up', END: 'lungs', AGI: 'running-ninja', VIT: 'heart-beats' }
const QUEST_ICON = { workout: 'crossed-swords' }
const STAT_NAMES = { STR: 'Strength', END: 'Endurance', AGI: 'Agility', VIT: 'Vitality' }

function Stat({ code, value, known = true }) {
  const shown = useCountUp(known ? value : 0, 1000)
  const width = useGrow(known ? Math.min(100, value) : 0, 160)
  return <div className={'sys-stat s-' + code} aria-label={`${STAT_NAMES[code]} ${known ? value : 'unknown'}`}>
    <div className="k"><GameIcon name={STAT_ICON[code]} size={14} />{code}</div>
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

const SEEN_KEY = 'sr-army-seen'
const readSeen = () => { try { const n = parseInt(localStorage.getItem(SEEN_KEY), 10); return Number.isFinite(n) ? n : null } catch { return null } }
const writeSeen = n => { try { localStorage.setItem(SEEN_KEY, String(n)) } catch { /* private mode: the summon just replays */ } }

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
  const army = useMemo(() => (p ? shadowArmy(S, nut, p) : []), [S, nut, p])
  const have = army.filter(a => a.unlocked).length
  const [freshFrom, setFreshFrom] = useState(null)   // soldiers at index >= this were just summoned
  useEffect(() => {
    if (!sys || !p) return
    const seen = readSeen()
    if (seen === null) { writeSeen(have); return }          // first run: no fanfare for what you already earned
    if (have > seen) {
      setFreshFrom(seen)
      useUI.getState().toast(have - seen === 1 ? t('A shadow soldier has been summoned.') : t('{0} shadow soldiers have been summoned.', have - seen))
    }
    writeSeen(have)
  }, [sys, p, have])
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
        <span className="sys-tag"><GameIcon name="crown" />{t('Player status')}</span>
        <span className="sys-rankbox">
          <RankSigil rank={st.rank} size={42} />
          <span className="sys-rank" title={t('Overall score {0}', st.overall)}>{t('RANK')} {st.rank}</span>
        </span>
      </div>
      <div className="sys-hero">
        <HeroSilhouette rank={st.rank} />
        <div className="sys-hero-copy">
          <div className="sys-hero-k"><GameIcon name="ghost-ally" size={13} />{t('Hunter')}</div>
          <div className="sys-hero-v">{t(st.title)}</div>
          <div className="sys-hero-n">{t('{0} of {1} shadows summoned', have, army.length)}</div>
        </div>
      </div>
      <div className="sys-id">
        <div className="sys-levelwrap">
          <RuneRing pct={p.pct} />
          <div className="sys-level"><small>LV</small><b>{level}</b></div>
        </div>
        <div className="sys-who">
          <div className="sys-name">{user?.name || t('Player')}</div>
          <div className="sys-title">{st.rank}-{t('Rank')} · {t(st.title)}</div>
          <XpBar into={p.into} need={p.need} pct={p.pct} />
        </div>
      </div>
      <div className="sys-statrow">
        <StatRadar values={[st.STR, st.END, st.AGI, st.vitKnown ? st.VIT : 0]} />
        <div className="sys-stats">
          <Stat code="STR" value={st.STR} />
          <Stat code="END" value={st.END} />
          <Stat code="AGI" value={st.AGI} />
          <Stat code="VIT" value={st.VIT} known={st.vitKnown} />
        </div>
      </div>
    </div>

    <div className="card sys-card" aria-label={t('Shadow army')}>
      <div className="sys-head">
        <span className="sys-tag"><GameIcon name="shadow-follower" />{t('Shadow army')}</span>
        <span className="sys-count">{have}/{army.length}</span>
      </div>
      <div className="sys-army">
        {army.map((a, i) => <div key={a.id} className={'sys-sol' + (a.unlocked ? ' on' : '')} title={a.unlocked ? a.name : a.hint}
          aria-label={a.unlocked ? t('{0}, summoned', a.name) : t('{0}, locked: {1}', a.name, a.hint)}>
          <ShadowSoldier on={a.unlocked} fresh={freshFrom !== null && a.unlocked && army.filter(x => x.unlocked).indexOf(a) >= freshFrom} variant={i} />
          <span className="sys-sol-n">{a.unlocked ? t(a.name) : '???'}</span>
        </div>)}
      </div>
      {have < army.length && <div className="sys-army-next">{t('Next')}: {t((army.find(a => !a.unlocked) || {}).hint)}</div>}
    </div>

    <div className="card sys-card" aria-label={t('Daily quests')}>
      <div className="sys-head">
        <span className="sys-tag"><GameIcon name="scroll-unfurled" />{t('Daily quests')}</span>
        <span className="sys-count">{doneCount}/{p.quests.length}</span>
      </div>
      <div className="sys-quests">
        {p.quests.map(q => { const m = /^(\d+)\/(\d+)/.exec(q.detail || ''); const frac = q.done ? 100 : m ? Math.min(100, Math.round(+m[1] / Math.max(1, +m[2]) * 100)) : 0
          return <div key={q.id} className={'sys-quest' + (q.done ? ' done' : '')}>
          <span className="sys-check" aria-hidden="true">{q.done && <Icon name="check" />}</span>
          <div className="sys-qtext">
            <div className="sys-qlabel"><GameIcon name={QUEST_ICON[q.id] || 'rune-stone'} size={15} />{t(q.label)}</div>
            {q.detail && <div className="sys-qdetail">{q.detail}</div>}
            {m && <div className="sys-qbar" aria-hidden="true"><i style={{ width: frac + '%' }} /></div>}
          </div>
          <span className="sys-xpgain">+{q.xp} XP</span>
        </div>})}
      </div>
    </div>
  </>
}

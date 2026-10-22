import './custom.css'
import { useNavigate } from 'react-router-dom'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'

const A = ({ href, children }) => <a href={href} target="_blank" rel="noopener">{children}</a>

function Item({ title, children }) {
  return <div className="card credit">
    <h2 style={{ margin: '0 0 6px' }}>{title}</h2>
    <div className="small" style={{ lineHeight: 1.55, color: 'var(--label-2)' }}>{children}</div>
  </div>
}

// Credits & licences. Required by the AGPL (keep notices, offer the source) and by the Open Food
// Facts licence (attribution). Plain text on purpose — nothing here is fetched from a third party.
export default function CreditsView() {
  const nav = useNavigate()
  return <div className="narrow">
    <div className="hdr">
      <div><h1>{t('Credits & licences')}</h1><div className="sub">Level Up Tracker</div></div>
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Settings')}><Icon name="gear" /></button>
    </div>

    <Item title="Level Up Tracker">
      A private, self-hosted setup that runs openGym (workouts) and NutriTrace (food) behind one address.
      It is modified software: its source code (the upstream projects plus the additions made here) is
      available to anyone who uses this instance — ask the person who runs it.
      No analytics or trackers are used.
    </Item>

    <Item title="openGym">
      © 2026 Duarte Santos. Free software under the GNU Affero General Public License v3.0 (AGPL-3.0).
      Fork used here: <A href="https://github.com/alexpcosta/opengym">alexpcosta/opengym</A>; original:
      {' '}<A href="https://github.com/DuarteSantos8/openGym">DuarteSantos8/openGym</A>. This copy is modified
      (Food tab, nutrition card, this screen); the licence and copyright notices are kept.
    </Item>

    <Item title="NutriTrace">
      Food diary by TraceApps, free software under the AGPL-3.0:
      {' '}<A href="https://github.com/TraceApps/nutritrace">TraceApps/nutritrace</A>. It runs unmodified in its
      own container and is shown inside the Food tab.
    </Item>

    <Item title="Open Food Facts">
      Packaged-food data comes from <A href="https://world.openfoodfacts.org">Open Food Facts</A>,
      © Open Food Facts contributors, available under the{' '}
      <A href="https://opendatacommons.org/licenses/odbl/1-0/">Open Database Licence (ODbL)</A>; individual
      contents under the Database Contents Licence. The data is crowd-sourced and can be wrong — check the
      numbers.
    </Item>

    <Item title={t('Exercise data & media')}>
      Exercise names, instructions, images and animations come from{' '}
      <A href="https://github.com/hasaneyldrm/exercises-dataset">hasaneyldrm/exercises-dataset</A> and stay under
      that dataset's own terms (they are not part of openGym's AGPL licence).
    </Item>

    <Item title={t('Body diagrams')}>
      Muscle outlines derived from <A href="https://github.com/melihcolpan/MuscleMap">MuscleMap</A> by
      Melih Colpan, MIT licence.
    </Item>

    <Item title={t('AI Coach')}>
      Optional. Runs Claude (Anthropic) through the instance owner's own account. It is off until an
      admin turns it on, and each profile must agree separately.
    </Item>

    <Item title={t('Indian foods starter list')}>
      The foods marked "approx." were written as rough estimates for typical servings. They are not from
      any official table — correct them when you know better.
    </Item>

    <Item title={t('Built with')}>
      <A href="https://tailscale.com">Tailscale</A> (private access) and{' '}
      <A href="https://caddyserver.com">Caddy</A> (reverse proxy, Apache-2.0), running in Docker.
    </Item>
  </div>
}

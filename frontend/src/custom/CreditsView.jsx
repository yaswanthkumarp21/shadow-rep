import './custom.css'
import { useNavigate } from 'react-router-dom'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { LogoMark } from './Emblems.jsx'

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <LogoMark size={46} />
        <div><h1>{t('Credits & licences')}</h1><div className="sub">Shadow Rep</div></div>
      </div>
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Settings')}><Icon name="gear" /></button>
    </div>

    <Item title="Shadow Rep">
      A private, self-hosted gym and food tracker with a game-style System look. It is built on two
      open-source projects (below) and combines them into one app with its own name, artwork and features.
      The logo, rank sigils and rune ring are original artwork drawn for this project; no third-party or
      series artwork is used. No analytics or trackers are used.
      It is modified software: the full source code — the foundations plus everything added here — is available
      to anyone who uses this instance. Ask the person who runs it.
    </Item>

    <Item title="Built on: OpenGym">
      The gym half (workouts, plan, body weight, stats, passkey sign-in, AI Coach) is built on
      {' '}<A href="https://github.com/DuarteSantos8/openGym">OpenGym</A> by Duarte Santos
      (© 2026 Duarte Santos), via the fork <A href="https://github.com/alexpcosta/opengym">alexpcosta/opengym</A>.
      Free software under the GNU Affero General Public License v3.0 (AGPL-3.0). It has been modified
      here (renamed and re-skinned, Food tab, nutrition card, levels and quests); the licence and
      copyright notices are kept.
    </Item>

    <Item title="Built on: NutriTrace">
      The food half (diary, foods, recipes, goals) is{' '}
      <A href="https://github.com/TraceApps/nutritrace">NutriTrace</A> by TraceApps, free software under the
      AGPL-3.0. It runs in its own container; this app re-skins it with a stylesheet and replaces its name and
      logo, and does not change its program code.
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

    <Item title={t('Fonts')}>
      <A href="https://github.com/theleagueof/orbitron">Orbitron</A> and{' '}
      <A href="https://github.com/itfoundry/rajdhani">Rajdhani</A> in the System look, under the SIL Open
      Font Licence 1.1. They are served from this instance — nothing is loaded from the internet.
    </Item>

    <Item title={t('Built with')}>
      <A href="https://tailscale.com">Tailscale</A> (private access) and{' '}
      <A href="https://caddyserver.com">Caddy</A> (reverse proxy, Apache-2.0), running in Docker.
    </Item>
  </div>
}

import { t } from '../lib/i18n.js'
import { Section, Row, Segmented, Switch } from '../components/ui.jsx'
import { useSkinState, setSkin, setMotion } from './skin.js'

// Settings -> Theme. Per device (not synced): your phone and PC can look different.
export default function ThemeSettings() {
  const { skin, motion } = useSkinState()
  return <Section title={t('Theme')} footer={t('Classic is the plain look, without the game panels and effects. This setting is stored on this device only.')}>
    <Row icon="sparkles" iconTint="var(--acc)" title={t('Look')}>
      <Segmented className="seg-inline"
        options={[{ value: 'system', label: t('System') }, { value: 'classic', label: t('Classic') }]}
        value={skin} onChange={setSkin} />
    </Row>
    {skin === 'system' && <Row icon="timer" iconTint="var(--purple)" title={t('Animations')} subtitle={t('Glow and shimmer effects. Also off automatically if your phone asks to reduce motion.')}>
      <Switch checked={motion !== 'off'} onChange={v => setMotion(v ? 'on' : 'off')} />
    </Row>}
  </Section>
}

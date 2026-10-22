import './custom.css'
import { t } from '../lib/i18n.js'

// The Food tab: NutriTrace embedded at /food/ (same origin, so no CORS/cookie problems).
// Embedded rather than navigated-to so OpenGym's tab bar stays on screen — one tap gets you back,
// and the phone's back button never has to leave the app.
export default function FoodView() {
  return <iframe className="food-frame" src="/food/" title={t('Food')} allow="camera; clipboard-write" />
}

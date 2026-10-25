import './system-theme.css'

// Icons from game-icons.net (CC BY 3.0) — authors credited in Settings -> Credits & licences, NOTICE.md and
// gameicons/NOTICE.txt. Each file is the original artwork with its black backdrop removed; here it is used as a
// mask so it takes the colour of the surrounding text (cyan, violet, …). Decorative: hidden from screen readers.
const URLS = import.meta.glob('./gameicons/*.svg', { eager: true, query: '?url', import: 'default' })

export default function GameIcon({ name, size = 16, className = '' }) {
  const u = URLS['./gameicons/' + name + '.svg']
  if (!u) return null
  const m = 'url(' + JSON.stringify(u) + ')'
  return <span className={'gi ' + className} aria-hidden="true" style={{ width: size, height: size, WebkitMaskImage: m, maskImage: m }} />
}

import GameIcon from './GameIcon.jsx'
import { useSystemSkin } from './skin.js'
import { weaponFor } from './weapons.js'

/** A small weapon icon for an equipment name (or, with `name`, a specific icon). Nothing in the Classic skin. */
export default function Weapon({ eq, name, size = 14 }) {
  const sys = useSystemSkin()
  if (!sys) return null
  return <GameIcon name={name || weaponFor(eq)} size={size} className="wp" />
}

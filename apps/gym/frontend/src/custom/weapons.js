// Which weapon icon stands for which equipment (System skin). Pure data + two small helpers.
// Icons: game-icons.net, CC BY 3.0 (credited in Settings -> Credits & licences).
export const WEAPON_FOR_EQ = {
  'body weight': 'mailed-fist', assisted: 'mailed-fist', weighted: 'mailed-fist',
  barbell: 'broadsword', 'olympic barbell': 'broadsword', 'ez barbell': 'broadsword', 'trap bar': 'broadsword',
  dumbbell: 'battle-axe',
  cable: 'spear-hook', rope: 'spear-hook',
  'leverage machine': 'checked-shield', 'smith machine': 'checked-shield', 'sled machine': 'checked-shield',
  kettlebell: 'thor-hammer', hammer: 'thor-hammer', tire: 'thor-hammer',
  band: 'bow-arrow', 'resistance band': 'bow-arrow'
}

export const weaponFor = eq => WEAPON_FOR_EQ[String(eq || '').toLowerCase()] || 'plain-dagger'

/** The weapon of the equipment used most in a routine (ties: the first one met). `lookup` maps an exercise id to { eq }. */
export function routineWeapon(routine, lookup) {
  const count = {}
  let best = null
  for (const x of (routine && routine.ex) || []) {
    const w = weaponFor((lookup(x.id) || {}).eq)
    count[w] = (count[w] || 0) + 1
    if (best === null || count[w] > count[best]) best = w
  }
  return best || 'crossed-swords'
}

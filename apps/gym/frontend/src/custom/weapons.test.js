import { describe, it, expect } from 'vitest'
import { weaponFor, routineWeapon } from './weapons.js'

describe('weapons', () => {
  it('maps equipment to a weapon, with a default', () => {
    expect(weaponFor('barbell')).toBe('broadsword')
    expect(weaponFor('Dumbbell')).toBe('battle-axe')
    expect(weaponFor('body weight')).toBe('mailed-fist')
    expect(weaponFor('something new')).toBe('plain-dagger')
    expect(weaponFor(undefined)).toBe('plain-dagger')
  })
  it('a routine carries the weapon of its most used equipment', () => {
    const eq = { a: { eq: 'barbell' }, b: { eq: 'barbell' }, c: { eq: 'dumbbell' } }
    const look = id => eq[id]
    expect(routineWeapon({ ex: [{ id: 'a' }, { id: 'c' }, { id: 'b' }] }, look)).toBe('broadsword')
    expect(routineWeapon({ ex: [] }, look)).toBe('crossed-swords')
    expect(routineWeapon({ ex: [{ id: 'zzz' }] }, look)).toBe('plain-dagger')
  })
})

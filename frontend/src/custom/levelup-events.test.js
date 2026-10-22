import { describe, it, expect } from 'vitest'
import { workoutXP, isFresh, newlyDone, levelChange, questToast } from './levelup-events.js'
import { XP } from './levelup-config.js'

const w = (sets, prs = [], end = 1_000_000) => ({ end, prs, entries: [{ id: 'x', sets: Array.from({ length: sets }, () => ({ w: 50, r: 5, done: true })) }] })

describe('workoutXP', () => {
  it('is sets + workout + PRs', () => {
    expect(workoutXP(w(4, ['a', 'b']))).toBe(4 * XP.perSet + XP.perWorkout + 2 * XP.perPR)
    expect(workoutXP(w(0))).toBe(XP.perWorkout)
  })
})

describe('isFresh', () => {
  it('accepts a workout finished in the last two minutes only', () => {
    expect(isFresh(w(1, [], 100_000), 130_000)).toBe(true)
    expect(isFresh(w(1, [], 100_000), 100_000 + 119_000)).toBe(true)
    expect(isFresh(w(1, [], 100_000), 100_000 + 121_000)).toBe(false)   // loaded long after it happened
    expect(isFresh(w(1, [], 100_000), 90_000)).toBe(false)               // implausibly in the future
    expect(isFresh({}, 1)).toBe(false)
    expect(isFresh(null)).toBe(false)
  })
})

describe('newlyDone', () => {
  const qs = [{ id: 'a', done: true, xp: 20, label: 'A' }, { id: 'b', done: true, xp: 10, label: 'B' }, { id: 'c', done: false, xp: 5, label: 'C' }]
  it('stays silent on the first look', () => { expect(newlyDone(null, qs)).toEqual([]) })
  it('reports only quests completed since last time', () => {
    expect(newlyDone(['a'], qs).map(q => q.id)).toEqual(['b'])
    expect(newlyDone(['a', 'b'], qs)).toEqual([])
    expect(newlyDone([], qs).map(q => q.id)).toEqual(['a', 'b'])
  })
})

describe('levelChange', () => {
  it('baselines silently the first time', () => { expect(levelChange(null, 5, null, 'E').kind).toBe('baseline') })
  it('detects a level up and whether the rank rose', () => {
    expect(levelChange(4, 5, 'E', 'E')).toEqual({ kind: 'up', from: 4, to: 5, rankUp: false })
    expect(levelChange(9, 10, 'E', 'D')).toMatchObject({ kind: 'up', rankUp: true })
  })
  it('does not celebrate a drop (e.g. a deleted workout) or no change', () => {
    expect(levelChange(5, 4, 'D', 'E').kind).toBe('down')
    expect(levelChange(5, 5, 'D', 'D').kind).toBe('same')
  })
})

describe('questToast', () => {
  it('words one vs many', () => {
    expect(questToast([{ label: 'Log your meals', xp: 20 }])).toBe('Quest complete: Log your meals (+20 XP)')
    expect(questToast([{ label: 'A', xp: 20 }, { label: 'B', xp: 10 }])).toBe('2 quests complete (+30 XP)')
    expect(questToast([])).toBe('')
  })
})

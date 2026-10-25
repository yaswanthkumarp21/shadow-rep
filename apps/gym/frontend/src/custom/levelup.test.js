import { describe, it, expect } from 'vitest'
import { xpToReach, levelFor, rankFor, breakdownXP, computeStats, dailyQuests, playerStatus } from './levelup.js'
import { XP, STATS } from './levelup-config.js'
import { todayISO, isoOf } from '../lib/format.js'

const today = todayISO()
const ago = n => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - n); return isoOf(d) }

// A finished workout: `sets` done sets of `w` x `r` on exercise `id`, lasting `min` minutes.
const workout = (d, { id = 'bench', w = 100, r = 5, sets = 3, min = 45, prs = [] } = {}) => ({
  id: 'w' + d, d, start: 1_000_000, end: 1_000_000 + min * 60000,
  entries: [{ id, sets: Array.from({ length: sets }, () => ({ w, r, done: true })) }], prs
})
const base = (over = {}) => ({ unit: 'kg', bodyweight: [], routines: [], week: {}, dayPlan: {}, workouts: [], ...over })

describe('levels', () => {
  it('level 1 starts at 0 XP and the curve rises', () => {
    expect(xpToReach(1)).toBe(0)
    expect(xpToReach(2)).toBe(100)
    expect(xpToReach(5)).toBeGreaterThan(xpToReach(4))
    expect(xpToReach(10)).toBe(Math.round(100 * Math.pow(9, 1.6)))
  })
  it('levelFor reports the level, progress into it and what is needed', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, into: 0, need: 100, pct: 0 })
    expect(levelFor(99).level).toBe(1)
    expect(levelFor(100).level).toBe(2)
    const l = levelFor(150)
    expect(l.level).toBe(2)
    expect(l.into).toBe(50)
    expect(l.pct).toBeGreaterThan(0)
    expect(l.pct).toBeLessThan(100)
  })
  it('never exceeds the max level and tolerates junk', () => {
    expect(levelFor(1e12).level).toBe(99)
    expect(levelFor(1e12).pct).toBe(100)
    expect(levelFor(-5).level).toBe(1)
    expect(levelFor(undefined).level).toBe(1)
  })
})

describe('rank', () => {
  it('maps the overall score to E..S', () => {
    expect(rankFor(0).rank).toBe('E')
    expect(rankFor(24).rank).toBe('E')
    expect(rankFor(25).rank).toBe('D')
    expect(rankFor(74).rank).toBe('C')
    expect(rankFor(75).rank).toBe('B')
    expect(rankFor(100).rank).toBe('A')
    expect(rankFor(130).rank).toBe('S')
    expect(rankFor(500).rank).toBe('S')
  })
})

describe('XP from real data', () => {
  it('is zero with no data', () => {
    expect(breakdownXP(base(), null).total).toBe(0)
  })
  it('counts sets, workouts, PRs and weigh-ins', () => {
    const S = base({ workouts: [workout(ago(1), { sets: 3, prs: ['bench'] }), workout(ago(2), { sets: 4 })], bodyweight: [{ d: ago(1), w: 70 }] })
    const { parts, total } = breakdownXP(S, null)
    expect(parts.sets).toBe(7 * XP.perSet)
    expect(parts.workouts).toBe(2 * XP.perWorkout)
    expect(parts.prs).toBe(1 * XP.perPR)
    expect(parts.weighIns).toBe(XP.perWeighIn)
    expect(total).toBe(70 + 100 + 25 + 5)
  })
  it('counts food, protein and water days from NutriTrace', () => {
    const nut = {
      goals: { protein: 100, water: 2000 },
      days: [
        { date: ago(1), items: 4, proteins: 95, water_ml: 2500 },   // food + protein (>=90%) + water
        { date: ago(2), items: 2, proteins: 50, water_ml: 100 },    // nothing
        { date: ago(3), items: 3, proteins: 90, water_ml: 0 }       // food + protein (exactly 90%)
      ]
    }
    const { parts } = breakdownXP(base(), nut)
    expect(parts.foodDays).toBe(2 * XP.perFoodDay)
    expect(parts.proteinDays).toBe(2 * XP.perProteinDay)
    expect(parts.waterDays).toBe(1 * XP.perWaterDay)
  })
  it('does not award protein/water XP when there is no target', () => {
    const nut = { goals: {}, days: [{ date: ago(1), items: 5, proteins: 500, water_ml: 9999 }] }
    const { parts } = breakdownXP(base(), nut)
    expect(parts.proteinDays).toBe(0)
    expect(parts.waterDays).toBe(0)
    expect(parts.foodDays).toBe(XP.perFoodDay)
  })
})

describe('stats', () => {
  it('are all zero for a brand-new player (rank E)', () => {
    const s = computeStats(base(), null, today)
    expect(s).toMatchObject({ STR: 0, END: 0, AGI: 0, VIT: 0, overall: 0, rank: 'E', vitKnown: false })
  })
  it('STR is the best estimated 1RMs relative to body weight', () => {
    // 100 x 1 => e1RM 100 exactly (a single rep is the measurement); body weight 50 => ratio 2 => STR 20
    const S = base({ workouts: [workout(ago(1), { w: 100, r: 1 })], bodyweight: [{ d: ago(1), w: 50 }] })
    expect(computeStats(S, null, today).STR).toBe(20)
  })
  it('STR falls back to the default body weight until one is logged', () => {
    const S = base({ workouts: [workout(ago(1), { w: 70, r: 1 })] })
    expect(computeStats(S, null, today).STR).toBe(10)   // 10 x 70/70
  })
  it('END is recent training minutes / minutes-per-point, and ignores old workouts', () => {
    const S = base({ workouts: [workout(ago(2), { min: 50 }), workout(ago(3), { min: 50 }), workout(ago(STATS.enduranceDays + 5), { min: 600 })] })
    expect(computeStats(S, null, today).END).toBe(10)   // 100 min / 10
  })
  it('AGI is plan adherence over the window (assumes 3/week with no plan)', () => {
    // 6 sessions in the last 28 days vs 3/wk * 4 = 12 planned => 50%  (+ streak bonus, which is >= 0)
    const ws = [1, 3, 6, 9, 12, 15].map(n => workout(ago(n)))
    const { AGI } = computeStats(base({ workouts: ws }), null, today)
    expect(AGI).toBeGreaterThanOrEqual(50)
    expect(AGI).toBeLessThanOrEqual(50 + STATS.agiStreakCap)
  })
  it('VIT counts on-target days in the window; unknown without NutriTrace data', () => {
    const nut = { goals: { protein: 100 }, days: [0, 1, 2, 3, 4, 5, 6].map(i => ({ date: ago(i), items: 3, proteins: 100, water_ml: 0 })) }
    const s = computeStats(base(), nut, today)
    expect(s.vitKnown).toBe(true)
    expect(s.VIT).toBe(50)   // 7 of 14 days
    expect(computeStats(base(), null, today).vitKnown).toBe(false)
  })
  it('VIT falls back to "food logged" when no protein goal exists', () => {
    const nut = { goals: {}, days: [0, 1].map(i => ({ date: ago(i), items: 3, proteins: 0, water_ml: 0 })) }
    expect(computeStats(base(), nut, today).VIT).toBe(Math.round((2 / STATS.vitDays) * 100))
  })
})

describe('daily quests', () => {
  const routine = { id: 'r1', name: 'Push day', ex: [] }
  const wd = new Date(today + 'T12:00:00').getDay()
  const planned = over => base({ routines: [routine], week: { [wd]: 'r1' }, ...over })

  it('offers only the weigh-in on a rest day with no NutriTrace', () => {
    const q = dailyQuests(base(), null, today)
    expect(q.map(x => x.id)).toEqual(['weight'])
  })
  it("adds today's workout when one is planned, and ticks it when done", () => {
    expect(dailyQuests(planned(), null, today)[0]).toMatchObject({ id: 'workout', done: false, detail: 'Push day', xp: XP.perWorkout })
    const done = dailyQuests(planned({ workouts: [workout(today)] }), null, today)[0]
    expect(done.done).toBe(true)
  })
  it('builds the food quests from today\'s NutriTrace totals and goals', () => {
    const nut = { goals: { protein: 100, water: 2000 }, days: [{ date: today, items: 3, proteins: 95, water_ml: 500 }] }
    const q = Object.fromEntries(dailyQuests(base(), nut, today).map(x => [x.id, x]))
    expect(q.meals).toMatchObject({ done: true, detail: '3/3 foods' })
    expect(q.protein).toMatchObject({ done: true, detail: '95/100 g' })
    expect(q.water).toMatchObject({ done: false, detail: '500/2000 ml' })
  })
  it('skips protein/water quests when no goals are set, but keeps meals', () => {
    const nut = { goals: {}, days: [] }
    expect(dailyQuests(base(), nut, today).map(x => x.id)).toEqual(['meals', 'weight'])
  })
  it('ticks the weigh-in when one is logged today', () => {
    expect(dailyQuests(base({ bodyweight: [{ d: today, w: 70 }] }), null, today).find(x => x.id === 'weight').done).toBe(true)
  })
})

describe('playerStatus', () => {
  it('bundles level, stats and quests, and agrees with the XP breakdown', () => {
    const S = base({ workouts: [workout(ago(1))] })
    const p = playerStatus(S, null, today)
    expect(p.total).toBe(3 * XP.perSet + XP.perWorkout)
    expect(p.level).toBe(levelFor(p.total).level)
    expect(p.stats.rank).toBeDefined()
    expect(Array.isArray(p.quests)).toBe(true)
  })
})

describe('shadow army', () => {
  it('starts empty and summons soldiers as milestones are reached', async () => {
    const { shadowArmy } = await import('./levelup.js')
    const empty = base()
    const p0 = playerStatus(empty, null, today)
    const a0 = shadowArmy(empty, null, p0)
    expect(a0.length).toBe(8)
    expect(a0.filter(a => a.unlocked)).toHaveLength(0)
    const S = base({ workouts: [workout(today, { prs: ['bench'] })] })
    const a1 = shadowArmy(S, null, playerStatus(S, null, today))
    const on = a1.filter(a => a.unlocked).map(a => a.id)
    expect(on).toContain('vanguard'); expect(on).toContain('striker'); expect(on).not.toContain('ironclad')
  })
})

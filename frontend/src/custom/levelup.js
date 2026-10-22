// Level Up Tracker — the game layer: level, XP, stats, rank and daily quests.
// Pure functions of (OpenGym state, NutriTrace day totals, today's date). Nothing is stored:
// everything is recomputed from your real data, so the numbers can never drift from reality.
// All tunable numbers live in levelup-config.js.
import { XP, LEVEL, RANKS, STATS, MIN_MEAL_ITEMS, MAX_STAT } from './levelup-config.js'
import { best1RM } from '../lib/onerm.js'
import { setsDone, lastBW, streakWeeks, effectiveRoutine } from '../lib/history.js'
import { isoOf } from '../lib/format.js'

const RANK_TITLES = { E: 'Novice', D: 'Apprentice', C: 'Adept', B: 'Veteran', A: 'Elite', S: 'Sovereign' }
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const parseISO = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
const daysAgoISO = (today, n) => { const d = parseISO(today); d.setDate(d.getDate() - n); return isoOf(d) }

/* ------------------------------------------------------------------ levels -- */

/** Total XP needed to reach `level` (level 1 = 0 XP). */
export const xpToReach = level => (level <= 1 ? 0 : Math.round(LEVEL.base * Math.pow(level - 1, LEVEL.power)))

/** Level, progress into it and what the next one needs, for a total XP. */
export function levelFor(xp) {
  const total = Math.max(0, Math.round(xp || 0))
  let level = 1
  while (level < LEVEL.max && xpToReach(level + 1) <= total) level++
  const floor = xpToReach(level)
  const ceil = level >= LEVEL.max ? floor : xpToReach(level + 1)
  const need = Math.max(1, ceil - floor)
  const into = total - floor
  return { level, total, into, need, pct: level >= LEVEL.max ? 100 : clamp((into / need) * 100, 0, 100) }
}

export function rankFor(score) {
  let r = RANKS[0].rank
  for (const x of RANKS) if (score >= x.min) r = x.rank
  return { rank: r, title: RANK_TITLES[r] }
}

/* --------------------------------------------------------------- nutrition -- */
// `nut` = { days: [{ date, proteins, calories, water_ml, items }], goals: { protein, water } } | null
const dayMap = nut => new Map((nut?.days || []).map(d => [d.date, d]))
const proteinHit = (day, goal) => !!goal && (day?.proteins || 0) >= goal * STATS.proteinHitRatio
const waterHit = (day, goal) => !!goal && (day?.water_ml || 0) >= goal

/* --------------------------------------------------------------------- XP -- */

export function breakdownXP(S, nut) {
  const workouts = S.workouts || []
  const sets = workouts.reduce((n, w) => n + setsDone(w), 0)
  const prs = workouts.reduce((n, w) => n + ((w.prs || []).length), 0)
  const weighIns = (S.bodyweight || []).length
  let foodDays = 0, proteinDays = 0, waterDays = 0
  for (const d of nut?.days || []) {
    if ((d.items || 0) >= MIN_MEAL_ITEMS) foodDays++
    if (proteinHit(d, nut?.goals?.protein)) proteinDays++
    if (waterHit(d, nut?.goals?.water)) waterDays++
  }
  const parts = {
    sets: sets * XP.perSet, workouts: workouts.length * XP.perWorkout, prs: prs * XP.perPR,
    weighIns: weighIns * XP.perWeighIn, foodDays: foodDays * XP.perFoodDay,
    proteinDays: proteinDays * XP.perProteinDay, waterDays: waterDays * XP.perWaterDay
  }
  return { parts, total: Object.values(parts).reduce((a, b) => a + b, 0) }
}

/* ------------------------------------------------------------------ stats -- */

export function computeStats(S, nut, today) {
  const workouts = S.workouts || []

  // STR — strength relative to body weight, from estimated 1RMs.
  const ids = [...new Set(workouts.flatMap(w => w.entries.map(e => e.id)))]
  const bests = ids.map(id => best1RM(S, id)?.est || 0).filter(v => v > 0).sort((a, b) => b - a).slice(0, STATS.strTopLifts)
  const bw = lastBW(S)?.w || STATS.strDefaultBodyweight
  const STR = clamp(Math.round(10 * bests.reduce((a, b) => a + b, 0) / bw), 0, MAX_STAT)

  // END — minutes trained in the recent window.
  const since = daysAgoISO(today, STATS.enduranceDays)
  const recent = workouts.filter(w => w.d > since && w.d <= today)
  const minutes = recent.reduce((n, w) => n + clamp(((w.end || 0) - (w.start || 0)) / 60000, 0, 180), 0)
  const END = clamp(Math.round(minutes / STATS.endMinutesPerPoint), 0, MAX_STAT)

  // AGI — consistency against the weekly plan, plus a streak bonus.
  const plannedPerWeek = Object.keys(S.week || {}).filter(k => S.week[k]).length || STATS.agiDefaultPerWeek
  const planned = plannedPerWeek * (STATS.enduranceDays / 7)
  const ratio = clamp(recent.length / planned, 0, 1)
  const AGI = clamp(Math.round(ratio * 100) + Math.min(STATS.agiStreakCap, streakWeeks(S) * STATS.agiStreakBonus), 0, MAX_STAT)

  // VIT — how many of the last N days were "on target" nutritionally.
  const dm = dayMap(nut)
  let on = 0
  for (let i = 0; i < STATS.vitDays; i++) {
    const day = dm.get(daysAgoISO(today, i))
    if (!day) continue
    if (nut?.goals?.protein ? proteinHit(day, nut.goals.protein) : (day.items || 0) >= MIN_MEAL_ITEMS) on++
  }
  const vitKnown = !!nut
  const VIT = vitKnown ? clamp(Math.round((on / STATS.vitDays) * 100), 0, MAX_STAT) : 0

  const overall = Math.round((STR + END + AGI + VIT) / 4)
  return { STR, END, AGI, VIT, overall, vitKnown, ...rankFor(overall) }
}

/* ----------------------------------------------------------------- quests -- */

/** Today's quests — each is one of the XP sources above, so finishing them is what levels you up. */
export function dailyQuests(S, nut, today) {
  const q = []
  const routine = effectiveRoutine(S, today)
  if (routine) {
    q.push({ id: 'workout', label: "Complete today's workout", detail: routine.name, done: (S.workouts || []).some(w => w.d === today), xp: XP.perWorkout })
  }
  const day = dayMap(nut).get(today)
  if (nut) {
    const items = day?.items || 0
    q.push({ id: 'meals', label: 'Log your meals', detail: `${Math.min(items, MIN_MEAL_ITEMS)}/${MIN_MEAL_ITEMS} foods`, done: items >= MIN_MEAL_ITEMS, xp: XP.perFoodDay })
    if (nut.goals?.protein) {
      const eaten = Math.round(day?.proteins || 0)
      q.push({ id: 'protein', label: 'Hit your protein target', detail: `${eaten}/${Math.round(nut.goals.protein)} g`, done: proteinHit(day, nut.goals.protein), xp: XP.perProteinDay })
    }
    if (nut.goals?.water) {
      const ml = Math.round(day?.water_ml || 0)
      q.push({ id: 'water', label: 'Drink your water', detail: `${ml}/${Math.round(nut.goals.water)} ml`, done: waterHit(day, nut.goals.water), xp: XP.perWaterDay })
    }
  }
  q.push({ id: 'weight', label: 'Log your body weight', detail: '', done: (S.bodyweight || []).some(b => b.d === today), xp: XP.perWeighIn })
  return q
}

/** Everything the Home panels need, in one call. */
export function playerStatus(S, nut, today) {
  const { total, parts } = breakdownXP(S, nut)
  return { ...levelFor(total), parts, stats: computeStats(S, nut, today), quests: dailyQuests(S, nut, today) }
}

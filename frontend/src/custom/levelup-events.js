// Level Up Tracker — decides WHEN a System message should fire. Pure functions, no UI.
// The screen (SystemEvents.jsx) feeds these with real data and only shows what they return.
import { XP } from './levelup-config.js'
import { setsDone } from '../lib/history.js'

const RANK_ORDER = 'EDCBAS'

/** XP a single finished workout is worth (same formula as levelup.js, for the "+N XP" message). */
export const workoutXP = w => setsDone(w) * XP.perSet + XP.perWorkout + ((w.prs || []).length * XP.perPR)

/**
 * Was this workout finished just now? Guards against a false "new record" when saved workouts are
 * loaded from the server after sign-in (they arrive in bulk, long after they were finished).
 */
export const isFresh = (w, now = Date.now(), withinMs = 120000) =>
  !!w && typeof w.end === 'number' && now - w.end >= -5000 && now - w.end < withinMs

/** Quests that are done now but were not in the previously-seen set. `prevIds` null = first look (no messages). */
export function newlyDone(prevIds, quests) {
  if (prevIds == null) return []
  const seen = new Set(prevIds)
  return (quests || []).filter(q => q.done && !seen.has(q.id))
}

/** What changed since the last level we showed? kind: baseline | up | down | same */
export function levelChange(seenLevel, level, seenRank, rank) {
  if (seenLevel == null) return { kind: 'baseline' }
  if (level > seenLevel) {
    const rankUp = !!seenRank && RANK_ORDER.indexOf(rank) > RANK_ORDER.indexOf(seenRank)
    return { kind: 'up', from: seenLevel, to: level, rankUp }
  }
  if (level < seenLevel) return { kind: 'down' }
  return { kind: 'same' }
}

/** Short toast text for newly completed quests. */
export function questToast(done) {
  if (!done.length) return ''
  const xp = done.reduce((n, q) => n + q.xp, 0)
  return done.length === 1 ? `Quest complete: ${done[0].label} (+${xp} XP)` : `${done.length} quests complete (+${xp} XP)`
}

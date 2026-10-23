// Shadow Rep — every number that drives levels, XP, stats and rank lives HERE.
// Change a value, rebuild (docker compose up -d --build), and the whole game layer follows.
// Everything is derived from your real data (workouts in Shadow Rep, food/water in NutriTrace);
// nothing is stored, so changing the formula re-scores your whole history.

export const XP = {
  perSet: 10,          // every completed set
  perWorkout: 50,      // every finished workout
  perPR: 25,           // every personal record set in a workout
  perFoodDay: 20,      // a day with at least MIN_MEAL_ITEMS foods logged
  perProteinDay: 20,   // a day that reached the protein target (when a target exists)
  perWaterDay: 10,     // a day that reached the water goal (when a goal exists)
  perWeighIn: 5        // a body-weight entry
}

// Level n needs  base * (n-1)^power  total XP.  base 100, power 1.6 => L2 100, L5 ~ 970, L10 ~ 3,370, L20 ~ 11,900.
export const LEVEL = { base: 100, power: 1.6, max: 99 }

// Rank from the overall stat score (average of STR, END, AGI, VIT).
// Roughly: D after your first couple of consistent weeks, B after a few solid months, S is rare.
export const RANKS = [
  { rank: 'E', min: 0 }, { rank: 'D', min: 25 }, { rank: 'C', min: 50 },
  { rank: 'B', min: 75 }, { rank: 'A', min: 100 }, { rank: 'S', min: 130 }
]

export const STATS = {
  // STR = 10 x (sum of your best estimated 1RMs across your TOP_LIFTS best exercises / body weight)
  strTopLifts: 5,
  strDefaultBodyweight: 70,   // used until you log a weigh-in (in your own unit — it is a ratio)
  // END = minutes trained in the last ENDURANCE_DAYS days / endMinutesPerPoint
  enduranceDays: 28,
  endMinutesPerPoint: 10,
  // AGI = % of planned sessions done in the window (cap 100) + agiStreakBonus per streak week (cap agiStreakCap)
  agiDefaultPerWeek: 3,       // planned sessions per week if you have not set a weekly plan
  agiStreakBonus: 3,
  agiStreakCap: 30,           // so AGI tops out at 130 and cannot single-handedly set your rank
  // VIT = % of the last VIT_DAYS days that were "on target" (protein target hit, else food logged)
  vitDays: 14,
  proteinHitRatio: 0.9        // 90% of the protein target counts as a hit
}

export const MIN_MEAL_ITEMS = 3   // foods logged for the "Log your meals" quest / food-day XP
export const MAX_STAT = 999

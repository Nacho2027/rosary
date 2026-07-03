export type Lang = 'en' | 'es'
export type MysterySetId = 'joyful' | 'luminous' | 'sorrowful' | 'glorious'
export type PrayerId =
  | 'signOfCross'
  | 'creed'
  | 'ourFather'
  | 'hailMary'
  | 'gloryBe'
  | 'fatima'
  | 'hailHolyQueen'
  | 'closing'

export type BeadKind = 'crucifix' | 'large' | 'small' | 'medal'

/**
 * The physical rosary, in praying order:
 * crucifix(0) · large(1) · small(2–4) · medal(5) ·
 * then five decades of large + 10 small (6–60).
 */
export const BEADS: readonly BeadKind[] = [
  'crucifix',
  'large',
  'small',
  'small',
  'small',
  'medal',
  ...Array.from({ length: 5 }, () => ['large' as const, ...Array<BeadKind>(10).fill('small')]).flat(),
]

export interface Step {
  bead: number
  prayer: PrayerId | 'announce'
  /** 1–5 while inside a decade */
  decade?: number
  /** e.g. Hail Mary [3, 10] */
  count?: readonly [n: number, of: number]
  /** mystery index 0–4, on announce steps */
  mystery?: number
}

const decadeLarge = (d: number) => 6 + d * 11
const decadeSmall = (d: number, i: number) => 7 + d * 11 + i

function buildSequence(): Step[] {
  const steps: Step[] = [
    { bead: 0, prayer: 'signOfCross' },
    { bead: 0, prayer: 'creed' },
    { bead: 1, prayer: 'ourFather' },
    ...Array.from({ length: 3 }, (_, i): Step => ({ bead: 2 + i, prayer: 'hailMary', count: [i + 1, 3] })),
    { bead: 5, prayer: 'gloryBe' },
  ]
  for (let d = 0; d < 5; d++) {
    const decade = d + 1
    steps.push(
      { bead: decadeLarge(d), prayer: 'announce', decade, mystery: d },
      { bead: decadeLarge(d), prayer: 'ourFather', decade },
      ...Array.from({ length: 10 }, (_, i): Step => ({
        bead: decadeSmall(d, i),
        prayer: 'hailMary',
        decade,
        count: [i + 1, 10],
      })),
      // Glory Be and Fatima Prayer are said on the chain after the tenth bead
      { bead: decadeSmall(d, 9), prayer: 'gloryBe', decade },
      { bead: decadeSmall(d, 9), prayer: 'fatima', decade },
    )
  }
  steps.push(
    { bead: 5, prayer: 'hailHolyQueen' },
    { bead: 5, prayer: 'closing' },
    { bead: 0, prayer: 'signOfCross' },
  )
  return steps
}

export const SEQUENCE: readonly Step[] = buildSequence()

/** Sunday-first; the modern default (Luminous on Thursday). */
const DAY_SETS = ['glorious', 'joyful', 'sorrowful', 'glorious', 'luminous', 'sorrowful', 'joyful'] as const

export const mysterySetForDay = (date: Date): MysterySetId => DAY_SETS[date.getDay()]

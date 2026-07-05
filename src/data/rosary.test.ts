import { describe, expect, it } from 'vitest'
import { BEADS, SEQUENCE, mysterySetForDay } from './rosary'

describe('the physical rosary', () => {
  it('has 59 beads plus crucifix and medal', () => {
    expect(BEADS).toHaveLength(61)
    expect(BEADS.filter((b) => b === 'small')).toHaveLength(53)
    expect(BEADS.filter((b) => b === 'large')).toHaveLength(6)
  })
})

describe('the praying sequence', () => {
  it('is the full traditional rosary, 80 steps', () => {
    expect(SEQUENCE).toHaveLength(80)
  })

  it('prays 53 Hail Marys and 6 Our Fathers', () => {
    expect(SEQUENCE.filter((s) => s.prayer === 'hailMary')).toHaveLength(53)
    expect(SEQUENCE.filter((s) => s.prayer === 'ourFather')).toHaveLength(6)
  })

  it('announces five mysteries and closes each decade with Glory Be + Fatima', () => {
    expect(SEQUENCE.filter((s) => s.prayer === 'announce').map((s) => s.decade)).toEqual([
      1, 2, 3, 4, 5,
    ])
    expect(SEQUENCE.filter((s) => s.prayer === 'gloryBe')).toHaveLength(6)
    expect(SEQUENCE.filter((s) => s.prayer === 'fatima')).toHaveLength(5)
  })

  it('touches every bead', () => {
    const prayed = new Set(SEQUENCE.map((s) => s.bead))
    expect(prayed.size).toBe(BEADS.length)
  })

  it('opens and closes with the Sign of the Cross on the crucifix', () => {
    expect(SEQUENCE[0]).toMatchObject({ bead: 0, prayer: 'signOfCross' })
    expect(SEQUENCE.at(-1)).toMatchObject({ bead: 0, prayer: 'signOfCross' })
  })

  it('counts Hail Marys within each decade', () => {
    const decadeOne = SEQUENCE.filter((s) => s.decade === 1 && s.prayer === 'hailMary')
    expect(decadeOne.map((s) => s.count![0])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })
})

describe('day-aware mysteries', () => {
  it('follows the traditional weekly cycle', () => {
    // 2026-07-02 is a Thursday → Luminous
    expect(mysterySetForDay(new Date(2026, 6, 2))).toBe('luminous')
    expect(mysterySetForDay(new Date(2026, 6, 3))).toBe('sorrowful') // Friday
    expect(mysterySetForDay(new Date(2026, 6, 4))).toBe('joyful') // Saturday
    expect(mysterySetForDay(new Date(2026, 6, 5))).toBe('glorious') // Sunday
  })
})


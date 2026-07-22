import { describe, expect, it } from 'vitest'
import { BEADS } from '../data/rosary'
import {
  ANCHOR,
  buildChain,
  holdBead,
  isAsleep,
  nearestParticle,
  stepChain,
  PARTICLE_COUNT,
} from './verlet'

const settle = (chain: ReturnType<typeof buildChain>, frames: number) => {
  for (let i = 0; i < frames; i++) stepChain(chain, 1 / 60)
}

describe('the verlet chain', () => {
  it('maps every bead to a distinct particle', () => {
    const chain = buildChain(0)
    expect(chain.beadParticle).toHaveLength(BEADS.length)
    expect(new Set(chain.beadParticle).size).toBe(BEADS.length)
    for (const p of chain.beadParticle) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThan(PARTICLE_COUNT)
    }
  })

  it('holds the current bead at the fingers anchor', () => {
    const chain = buildChain(0) // the crucifix, praying position one
    settle(chain, 300)
    const p = chain.beadParticle[0] * 3
    expect(chain.pos[p]).toBeCloseTo(ANCHOR[0], 1)
    expect(chain.pos[p + 1]).toBeCloseTo(ANCHOR[1], 1)

    // everything else dangles below the fingers
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      expect(chain.pos[i * 3 + 1]).toBeLessThanOrEqual(ANCHOR[1] + 0.4)
    }
  })

  it('stays finite and keeps link lengths after settling', () => {
    const chain = buildChain(0)
    settle(chain, 600)
    for (let i = 0; i < chain.pos.length; i++) {
      expect(Number.isFinite(chain.pos[i])).toBe(true)
    }
    const { links, pos } = chain
    for (let l = 0; l < links.length; l += 3) {
      const i = links[l] * 3
      const j = links[l + 1] * 3
      const d = Math.hypot(pos[j] - pos[i], pos[j + 1] - pos[i + 1], pos[j + 2] - pos[i + 2])
      expect(d).toBeLessThan(links[l + 2] * 1.2)
    }
  })

  it('glides the next bead up into the fingers on transfer', () => {
    const chain = buildChain(0)
    settle(chain, 300)
    holdBead(chain, 30) // deep in the second decade
    settle(chain, 600)
    const p = chain.beadParticle[30] * 3
    expect(chain.pos[p]).toBeCloseTo(ANCHOR[0], 1)
    expect(chain.pos[p + 1]).toBeCloseTo(ANCHOR[1], 1)
  })

  it('tracks a grab exactly and settles back after release', () => {
    const chain = buildChain(5) // hold the medal
    settle(chain, 300)
    const grab = nearestParticle(chain, 0.5, ANCHOR[1] - 4, 3)
    expect(grab).toBeGreaterThanOrEqual(0)
    chain.grabbed = grab
    chain.grabTarget = [5, 0, 0]
    settle(chain, 90)
    expect(chain.pos[grab * 3]).toBeCloseTo(5, 4) // exact finger tracking

    chain.grabbed = -1
    settle(chain, 1200)
    // gravity brings the dangle back under the anchor
    expect(Math.abs(chain.pos[grab * 3] - ANCHOR[0])).toBeLessThan(2.5)
  })

  it('falls asleep at rest and wakes on transfer', () => {
    const chain = buildChain(0)
    settle(chain, 1200)
    expect(isAsleep(chain)).toBe(true)
    holdBead(chain, 1)
    expect(isAsleep(chain)).toBe(false)
  })

  it('keeps beads from interpenetrating while dangling', () => {
    const chain = buildChain(28) // mid-loop: the loop dangles doubled
    settle(chain, 600)
    const { beadParticle, bodyRadius, pos } = chain
    for (let a = 0; a < beadParticle.length; a++) {
      for (let b = a + 1; b < beadParticle.length; b++) {
        const pa = beadParticle[a]
        const pb = beadParticle[b]
        const i = pa * 3
        const j = pb * 3
        const d = Math.hypot(pos[j] - pos[i], pos[j + 1] - pos[i + 1], pos[j + 2] - pos[i + 2])
        // allow a whisker of overlap: the solver interleaves links + contacts
        expect(d).toBeGreaterThan((bodyRadius[pa] + bodyRadius[pb]) * 0.8)
      }
    }
  })
})

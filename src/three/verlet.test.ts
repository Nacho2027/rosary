import { describe, expect, it } from 'vitest'
import { BEADS } from '../data/rosary'
import { buildChain, nearestParticle, stepChain, PARTICLE_COUNT } from './verlet'

describe('the verlet chain', () => {
  it('maps every bead to a distinct particle', () => {
    const chain = buildChain(8.5)
    expect(chain.beadParticle).toHaveLength(BEADS.length)
    expect(new Set(chain.beadParticle).size).toBe(BEADS.length)
    for (const p of chain.beadParticle) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThan(PARTICLE_COUNT)
    }
  })

  it('stays hung on the hook and keeps link lengths after settling', () => {
    const chain = buildChain(8.5)
    for (let i = 0; i < 600; i++) stepChain(chain, 1 / 60)

    // the hook particle never moves
    expect(chain.pos[chain.hook * 3 + 1]).toBeCloseTo(8.5, 3)

    // no NaN anywhere, nothing exploded
    for (let i = 0; i < chain.pos.length; i++) {
      expect(Number.isFinite(chain.pos[i])).toBe(true)
    }

    // links stay within 15% of rest length under gravity
    const { links, pos } = chain
    for (let l = 0; l < links.length; l += 3) {
      const i = links[l] * 3
      const j = links[l + 1] * 3
      const d = Math.hypot(pos[j] - pos[i], pos[j + 1] - pos[i + 1], pos[j + 2] - pos[i + 2])
      expect(d).toBeLessThan(links[l + 2] * 1.15)
    }
  })

  it('lets a grabbed particle pull the chain and settle back', () => {
    const chain = buildChain(8.5)
    for (let i = 0; i < 120; i++) stepChain(chain, 1 / 60)

    const grab = nearestParticle(chain, 1.5, 0, 3)
    expect(grab).toBeGreaterThanOrEqual(0)
    chain.grabbed = grab
    chain.grabTarget = [5, -3, 0]
    for (let i = 0; i < 60; i++) stepChain(chain, 1 / 60)
    expect(chain.pos[grab * 3]).toBeGreaterThan(3)

    chain.grabbed = -1
    for (let i = 0; i < 900; i++) stepChain(chain, 1 / 60)
    // gravity brings it back under the hook
    expect(Math.abs(chain.pos[grab * 3])).toBeLessThan(3)
  })
})

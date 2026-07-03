import { BEADS } from '../data/rosary'

/**
 * Verlet rope shaped like a rosary on a hook: a closed loop pinned at its
 * top, the medal at the loop's bottom, and the pendant (three beads, the
 * first Our Father bead, the crucifix) hanging below the medal.
 *
 * Particles alternate bead-node / midpoint so chain drapes smoothly;
 * bead b sits at particle beadParticle[b].
 */

export const SPACING = 0.3
const LOOP_NODES = 56 // medal + 5 large + 50 small
const LOOP_PARTICLES = LOOP_NODES * 2
const PENDANT_PARTICLES = 11
export const PARTICLE_COUNT = LOOP_PARTICLES + PENDANT_PARTICLES

export interface Chain {
  pos: Float32Array
  prev: Float32Array
  /** inverse mass; 0 = pinned */
  w: Float32Array
  /** flattened [i, j, rest] triplets */
  links: Float32Array
  /** flattened [i, j, minDist]: one-sided, keeps the two strands apart */
  spreaders: Float32Array
  beadParticle: number[]
  hook: number
  grabbed: number
  grabTarget: [number, number, number]
}

export function buildChain(hookY: number): Chain {
  const pos = new Float32Array(PARTICLE_COUNT * 3)
  const w = new Float32Array(PARTICLE_COUNT).fill(1)

  // The loop starts already draped: two strands falling from the hook to the
  // medal in an open teardrop. (A circle would be a valid — if unstable —
  // equilibrium for rigid links, so we never pass through it.)
  const half = LOOP_PARTICLES / 2
  const drop = half * SPACING * 0.98
  const medalY = hookY - drop
  for (let i = 0; i < LOOP_PARTICLES; i++) {
    const up = i <= half ? i / half : (LOOP_PARTICLES - i) / half // 0 medal → 1 hook
    const width = 1.9 * Math.sin(Math.PI * up) + 0.05
    pos[i * 3] = i <= half ? -width : width
    pos[i * 3 + 1] = medalY + up * drop
    pos[i * 3 + 2] = Math.sin(i * 1.7) * 0.02
  }
  // Pendant hangs straight down from the medal.
  for (let i = 0; i < PENDANT_PARTICLES; i++) {
    const p = LOOP_PARTICLES + i
    pos[p * 3] = 0
    pos[p * 3 + 1] = medalY - (i + 1) * SPACING
    pos[p * 3 + 2] = Math.sin(i * 2.3) * 0.02
  }

  const linkList: number[] = []
  for (let i = 0; i < LOOP_PARTICLES; i++) {
    // extra rest length beside the medal so beads clear its rim
    const nearMedal = i === 0 || i === LOOP_PARTICLES - 1
    linkList.push(i, (i + 1) % LOOP_PARTICLES, nearMedal ? SPACING * 1.6 : SPACING)
  }
  linkList.push(0, LOOP_PARTICLES, SPACING * 1.6) // medal → pendant
  for (let i = 0; i < PENDANT_PARTICLES - 1; i++) {
    const p = LOOP_PARTICLES + i
    linkList.push(p, p + 1, i === PENDANT_PARTICLES - 2 ? SPACING * 1.5 : SPACING)
  }

  // Praying order → particle index (see BEADS in data/rosary.ts).
  // Pendant particles from the medal down: mid, HM3, mid, HM2, mid, HM1,
  // mid, Our Father, mid, mid, crucifix.
  const pend = (i: number) => LOOP_PARTICLES + i
  const beadParticle = BEADS.map((_, b) => {
    if (b === 0) return pend(10) // crucifix
    if (b === 1) return pend(7) // first Our Father
    if (b <= 4) return pend(5 - (b - 2) * 2) // pendant Hail Marys: 5, 3, 1
    if (b === 5) return 0 // medal
    return (b - 5) * 2 // loop nodes at even particles
  })

  // ponytail: real beads spread the hanging loop by their thickness; instead of
  // n² collisions, a few one-sided constraints between mirrored strand particles
  // hold the classic open-teardrop drape.
  const spreadList: number[] = []
  for (let k = 6; k <= 50; k += 6) {
    spreadList.push(k, LOOP_PARTICLES - k, 0.6 + 3.2 * Math.sin((k / LOOP_NODES) * Math.PI))
  }

  const hook = LOOP_PARTICLES / 2 + 1 // a midpoint particle opposite the medal
  w[hook] = 0
  pos[hook * 3] = 0
  pos[hook * 3 + 1] = hookY
  pos[hook * 3 + 2] = 0
  w[pend(10)] = 0.45 // the crucifix swings heavy
  w[0] = 0.6 // so does the medal

  return {
    pos,
    prev: pos.slice(),
    w,
    links: new Float32Array(linkList),
    spreaders: new Float32Array(spreadList),
    beadParticle,
    hook,
    grabbed: -1,
    grabTarget: [0, 0, 0],
  }
}

const GRAVITY = -14
const MAX_DT = 1 / 30

export function stepChain(chain: Chain, dt: number, damping = 0.985, iterations = 20): void {
  const { pos, prev, w, links } = chain
  const h = Math.min(dt, MAX_DT)
  const g = GRAVITY * h * h

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    if (w[i] === 0 && i !== chain.grabbed) continue
    const x = i * 3
    const vx = (pos[x] - prev[x]) * damping
    const vy = (pos[x + 1] - prev[x + 1]) * damping
    const vz = (pos[x + 2] - prev[x + 2]) * damping
    prev[x] = pos[x]
    prev[x + 1] = pos[x + 1]
    prev[x + 2] = pos[x + 2]
    pos[x] += vx
    pos[x + 1] += vy + g
    pos[x + 2] += vz
  }

  const grabbed = chain.grabbed
  for (let iter = 0; iter < iterations; iter++) {
    if (grabbed >= 0) {
      const x = grabbed * 3
      // soft-pin toward the pointer so a drag tugs rather than teleports
      pos[x] += (chain.grabTarget[0] - pos[x]) * 0.55
      pos[x + 1] += (chain.grabTarget[1] - pos[x + 1]) * 0.55
      pos[x + 2] += (chain.grabTarget[2] - pos[x + 2]) * 0.55
    }
    const sp = chain.spreaders
    for (let s = 0; s < sp.length; s += 3) {
      const i = sp[s] * 3
      const j = sp[s + 1] * 3
      const dx = pos[j] - pos[i]
      const dy = pos[j + 1] - pos[i + 1]
      const dz = pos[j + 2] - pos[i + 2]
      const dist = Math.hypot(dx, dy, dz) || 1e-6
      if (dist >= sp[s + 2]) continue
      const push = ((sp[s + 2] - dist) / dist) * 0.5
      pos[i] -= dx * push
      pos[i + 1] -= dy * push
      pos[i + 2] -= dz * push
      pos[j] += dx * push
      pos[j + 1] += dy * push
      pos[j + 2] += dz * push
    }
    for (let l = 0; l < links.length; l += 3) {
      const i = links[l] * 3
      const j = links[l + 1] * 3
      const rest = links[l + 2]
      const wi = w[links[l]]
      const wj = w[links[l + 1]]
      const wSum = wi + wj
      if (wSum === 0) continue
      const dx = pos[j] - pos[i]
      const dy = pos[j + 1] - pos[i + 1]
      const dz = pos[j + 2] - pos[i + 2]
      const dist = Math.hypot(dx, dy, dz) || 1e-6
      const s = (dist - rest) / dist / wSum
      pos[i] += dx * s * wi
      pos[i + 1] += dy * s * wi
      pos[i + 2] += dz * s * wi
      pos[j] -= dx * s * wj
      pos[j + 1] -= dy * s * wj
      pos[j + 2] -= dz * s * wj
    }
  }
}

/** Nearest particle to a world point, within maxDist (for grabbing). */
export function nearestParticle(chain: Chain, x: number, y: number, maxDist: number): number {
  let best = -1
  let bestD = maxDist * maxDist
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    if (chain.w[i] === 0) continue
    const dx = chain.pos[i * 3] - x
    const dy = chain.pos[i * 3 + 1] - y
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

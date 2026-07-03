import { BEADS } from '../data/rosary'

/**
 * Verlet rope shaped like a rosary held between finger and thumb: the
 * current bead is pinned at a fixed anchor and everything else dangles
 * from it. Advancing transfers the pin to the next bead, which glides up
 * into the fingers while the rest of the chain re-drapes.
 *
 * The simulation runs on a fixed timestep so it feels identical at
 * 30/60/120 Hz. Particles alternate bead-node / midpoint; bead b sits at
 * particle beadParticle[b].
 */

const SPACING = 0.3
const LOOP_NODES = 56 // medal + 5 large + 50 small
const LOOP_PARTICLES = LOOP_NODES * 2
const PENDANT_PARTICLES = 11
export const PARTICLE_COUNT = LOOP_PARTICLES + PENDANT_PARTICLES

export const ANCHOR: readonly [number, number, number] = [0, 6, 0]

/** collision radius per bead kind (slightly under visual radius) */
const BODY_RADIUS = { small: 0.2, large: 0.23, medal: 0.36, crucifix: 0.45 } as const

/** invisible fingers at the anchor: beads drape around them, not into them */
const FINGER_RADIUS = 0.52

const H = 1 / 120 // fixed substep
const MAX_FRAME = 1 / 30
const GRAVITY = -22
const DAMPING = 0.998 // per substep: long, weighty pendulum swings
const DAMPING_CALM = 0.97 // prefers-reduced-motion
const ITERATIONS = 12
/** how fast the next bead is drawn up into the fingers, units/s */
const PULL_SPEED = 14

export interface Chain {
  pos: Float32Array
  prev: Float32Array
  /** inverse mass; the solver treats held/grabbed as 0 */
  w: Float32Array
  /** flattened [i, j, rest] triplets */
  links: Float32Array
  beadParticle: number[]
  /** particle indices that carry a bead body (for collisions) */
  bodies: number[]
  /** collision radius per bodies[] entry */
  bodyRadius: number[]
  /** particle currently held at the anchor */
  held: number
  grabbed: number
  grabTarget: [number, number, number]
  accumulator: number
  /** substeps spent almost motionless; past a threshold the solver sleeps */
  calmFor: number
}

/** praying-order neighbours: particle index for bead b (see data/rosary.ts) */
const pend = (i: number) => LOOP_PARTICLES + i
const beadToParticle = (b: number): number => {
  if (b === 0) return pend(10) // crucifix
  if (b === 1) return pend(7) // first Our Father
  if (b <= 4) return pend(5 - (b - 2) * 2) // pendant Hail Marys: 5, 3, 1
  if (b === 5) return 0 // medal
  return (b - 5) * 2 // loop nodes at even particles
}

function buildLinks(): Float32Array {
  const list: number[] = []
  for (let i = 0; i < LOOP_PARTICLES; i++) {
    // extra rest length beside the medal so beads clear its rim
    const nearMedal = i === 0 || i === LOOP_PARTICLES - 1
    list.push(i, (i + 1) % LOOP_PARTICLES, nearMedal ? SPACING * 1.6 : SPACING)
  }
  list.push(0, pend(0), SPACING * 1.6) // medal → pendant
  for (let i = 0; i < PENDANT_PARTICLES - 1; i++) {
    list.push(pend(i), pend(i) + 1, i === PENDANT_PARTICLES - 2 ? SPACING * 1.5 : SPACING)
  }
  return new Float32Array(list)
}

/**
 * Lay every particle straight down from the held bead by chain distance —
 * the "future" side of the loop bows right, the "past" side left, so the
 * next bead always arrives from the right (the counter-clockwise
 * tradition). A pre-settle pass turns this sketch into a natural drape.
 */
function layout(chain: Chain): void {
  const { pos, links, held } = chain
  const neighbours: number[][] = Array.from({ length: PARTICLE_COUNT }, () => [])
  for (let l = 0; l < links.length; l += 3) {
    neighbours[links[l]].push(links[l + 1])
    neighbours[links[l + 1]].push(links[l])
  }

  // BFS from the held particle: depth = chain distance, branch = which side
  const depth = new Int32Array(PARTICLE_COUNT).fill(-1)
  const branch = new Float32Array(PARTICLE_COUNT)
  depth[held] = 0
  const queue = [held]
  while (queue.length) {
    const p = queue.shift()!
    for (const n of neighbours[p]) {
      if (depth[n] >= 0) continue
      depth[n] = depth[p] + 1
      // the loop ring is ordered in praying direction: +1 index = future,
      // bowing right; past bows left. When the walk enters the ring at the
      // medal (from the pendant), the two strands must still split ±.
      branch[n] =
        depth[p] === 0 && p < LOOP_PARTICLES
          ? n === (p + 1) % LOOP_PARTICLES
            ? 1
            : -1
          : p === 0 && n < LOOP_PARTICLES
            ? n === 1
              ? 1
              : -1
            : branch[p]
      queue.push(n)
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const d = depth[i] * SPACING
    // gentle sideways bow, fading out down the strand
    const bow = branch[i] * Math.min(d * 0.35, 1.1) * Math.exp(-d * 0.12)
    pos[i * 3] = ANCHOR[0] + bow
    pos[i * 3 + 1] = ANCHOR[1] - d
    // strands pass on either side; the pendant hangs behind the loop so the
    // crucifix doesn't tangle through the doubled strands
    pos[i * 3 + 2] = i >= LOOP_PARTICLES ? -0.24 : branch[i] * 0.07
  }
  chain.prev.set(pos)
}

export function buildChain(heldBead: number): Chain {
  const beadParticle = BEADS.map((_, b) => beadToParticle(b))
  const bodies: number[] = []
  const bodyRadius: number[] = []
  BEADS.forEach((kind, b) => {
    bodies.push(beadParticle[b])
    bodyRadius.push(BODY_RADIUS[kind])
  })

  const w = new Float32Array(PARTICLE_COUNT).fill(1)
  w[pend(10)] = 0.45 // the crucifix swings heavy
  w[0] = 0.6 // so does the medal

  const chain: Chain = {
    pos: new Float32Array(PARTICLE_COUNT * 3),
    prev: new Float32Array(PARTICLE_COUNT * 3),
    w,
    links: buildLinks(),
    beadParticle,
    bodies,
    bodyRadius,
    held: beadParticle[heldBead],
    grabbed: -1,
    grabTarget: [0, 0, 0],
    accumulator: 0,
    calmFor: 0,
  }
  layout(chain)
  for (let i = 0; i < 360; i++) substep(chain, DAMPING_CALM) // settle before first frame
  return chain
}

export function holdBead(chain: Chain, bead: number): void {
  const p = chain.beadParticle[bead]
  if (p === chain.held) {
    // same bead, next prayer: a gentle tug on the chain below so the tap
    // still lands physically even though nothing transfers
    for (const n of [p - 1, p + 1]) {
      if (n >= 0 && n < PARTICLE_COUNT) chain.prev[n * 3 + 1] += 0.05
    }
  }
  chain.held = p
  chain.calmFor = 0
}

const SLEEP_AFTER = 45 // substeps (~0.4s) of stillness
const SLEEP_EPSILON = 4e-4

/** True while the chain is asleep — callers can skip GPU uploads too. */
export const isAsleep = (chain: Chain): boolean =>
  chain.calmFor >= SLEEP_AFTER && chain.grabbed < 0

function substep(chain: Chain, damping: number): void {
  const { pos, prev, w, links, held, grabbed } = chain
  const g = GRAVITY * H * H
  let maxMove = 0

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = i * 3
    if (i === grabbed) {
      // exact finger tracking; prev keeps the pointer's velocity for the flick
      prev[x] = pos[x]
      prev[x + 1] = pos[x + 1]
      prev[x + 2] = pos[x + 2]
      pos[x] = chain.grabTarget[0]
      pos[x + 1] = chain.grabTarget[1]
      pos[x + 2] = chain.grabTarget[2]
      continue
    }
    if (i === held) {
      // glide toward the anchor at a capped speed, then rest there
      const dx = ANCHOR[0] - pos[x]
      const dy = ANCHOR[1] - pos[x + 1]
      const dz = ANCHOR[2] - pos[x + 2]
      const dist = Math.hypot(dx, dy, dz)
      // exponential ease for the last stretch (a soft ~0.4s draw into the
      // fingers), linear speed cap for long transfers, snap when arrived
      const s = dist < 0.01 ? 1 : Math.min((PULL_SPEED * H) / dist, 0.055)
      prev[x] = pos[x]
      prev[x + 1] = pos[x + 1]
      prev[x + 2] = pos[x + 2]
      pos[x] += dx * s
      pos[x + 1] += dy * s
      pos[x + 2] += dz * s
      continue
    }
    const vx = (pos[x] - prev[x]) * damping
    const vy = (pos[x + 1] - prev[x + 1]) * damping
    const vz = (pos[x + 2] - prev[x + 2]) * damping
    prev[x] = pos[x]
    prev[x + 1] = pos[x + 1]
    prev[x + 2] = pos[x + 2]
    pos[x] += vx
    pos[x + 1] += vy + g
    pos[x + 2] += vz
    // velocity only (not g): at rest the constraint solve cancels gravity's
    // sink each substep, so v→0 while |g| alone would keep us awake forever
    const m = Math.abs(vx) + Math.abs(vy) + Math.abs(vz)
    if (m > maxMove) maxMove = m
  }
  chain.calmFor = maxMove < SLEEP_EPSILON ? chain.calmFor + 1 : 0

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (let l = 0; l < links.length; l += 3) {
      const a = links[l]
      const b = links[l + 1]
      const i = a * 3
      const j = b * 3
      const wi = a === held || a === grabbed ? 0 : w[a]
      const wj = b === held || b === grabbed ? 0 : w[b]
      const wSum = wi + wj
      if (wSum === 0) continue
      const dx = pos[j] - pos[i]
      const dy = pos[j + 1] - pos[i + 1]
      const dz = pos[j + 2] - pos[i + 2]
      const dist = Math.hypot(dx, dy, dz) || 1e-6
      const s = (dist - links[l + 2]) / dist / wSum
      pos[i] += dx * s * wi
      pos[i + 1] += dy * s * wi
      pos[i + 2] += dz * s * wi
      pos[j] -= dx * s * wj
      pos[j + 1] -= dy * s * wj
      pos[j + 2] -= dz * s * wj
    }
  }

  // the fingers holding the current bead occupy space: push every other
  // bead out of a small sphere at the anchor so nothing piles onto it
  const { bodies, bodyRadius } = chain
  for (let a = 0; a < bodies.length; a++) {
    const pa = bodies[a]
    if (pa === held || pa === grabbed) continue
    const i = pa * 3
    const dx = pos[i] - ANCHOR[0]
    const dy = pos[i + 1] - ANCHOR[1]
    const dz = pos[i + 2] - ANCHOR[2]
    const minDist = FINGER_RADIUS + bodyRadius[a]
    const d2 = dx * dx + dy * dy + dz * dz
    if (d2 >= minDist * minDist || d2 === 0) continue
    const dist = Math.sqrt(d2)
    const push = ((minDist - dist) / dist) * 0.8
    pos[i] += dx * push
    pos[i + 1] += dy * push
    pos[i + 2] += dz * push
  }

  // bead-to-bead collisions so dangling beads rest against each other
  // instead of interpenetrating. ponytail: O(n²) over 61 bodies is ~1.8k
  // pairs — cheaper than any broadphase at this scale.
  for (let a = 0; a < bodies.length; a++) {
    const pa = bodies[a]
    const i = pa * 3
    for (let b = a + 1; b < bodies.length; b++) {
      const pb = bodies[b]
      const minDist = bodyRadius[a] + bodyRadius[b]
      const j = pb * 3
      const dx = pos[j] - pos[i]
      if (dx > minDist || dx < -minDist) continue
      const dy = pos[j + 1] - pos[i + 1]
      if (dy > minDist || dy < -minDist) continue
      const dz = pos[j + 2] - pos[i + 2]
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 >= minDist * minDist || d2 === 0) continue
      const dist = Math.sqrt(d2)
      const wi = pa === held || pa === grabbed ? 0 : w[pa]
      const wj = pb === held || pb === grabbed ? 0 : w[pb]
      const wSum = wi + wj
      if (wSum === 0) continue
      const push = ((minDist - dist) / dist / wSum) * 0.8
      pos[i] -= dx * push * wi
      pos[i + 1] -= dy * push * wi
      pos[i + 2] -= dz * push * wi
      pos[j] += dx * push * wj
      pos[j + 1] += dy * push * wj
      pos[j + 2] += dz * push * wj
    }
  }
}

/** Advance the simulation by a rendered frame's dt (fixed-timestep inside). */
export function stepChain(chain: Chain, dt: number, calm = false): void {
  if (isAsleep(chain)) return // at rest: skip the whole solve
  chain.accumulator = Math.min(chain.accumulator + dt, MAX_FRAME)
  const damping = calm ? DAMPING_CALM : DAMPING
  // the H epsilon stops 0/2-substep alternation on 120Hz displays, where
  // dt hovers exactly at the substep boundary
  while (chain.accumulator >= H - 1e-4) {
    substep(chain, damping)
    chain.accumulator = Math.max(0, chain.accumulator - H)
  }
}

/**
 * Release the grabbed particle with the pointer's real velocity — the
 * substep-quantized prev would zero the flick on 60Hz displays.
 */
export function releaseGrab(chain: Chain, vx: number, vy: number): void {
  if (chain.grabbed >= 0) {
    const speed = Math.hypot(vx, vy)
    const s = speed > 30 ? 30 / speed : 1 // clamp runaway flicks
    const x = chain.grabbed * 3
    chain.prev[x] = chain.pos[x] - vx * s * H
    chain.prev[x + 1] = chain.pos[x + 1] - vy * s * H
  }
  chain.grabbed = -1
  chain.calmFor = 0
}

/** Nearest grabbable particle to a world point, within maxDist. */
export function nearestParticle(chain: Chain, x: number, y: number, maxDist: number): number {
  let best = -1
  let bestD = maxDist * maxDist
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    if (i === chain.held) continue
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

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import {
  Color,
  CylinderGeometry,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { BEADS, SEQUENCE } from '../data/rosary'
import { useRosary } from '../store'
import { buildChain, holdBead, isAsleep, nearestParticle, releaseGrab, stepChain } from './verlet'
import { grabApi, view } from './interaction'

const RADIUS = { small: 0.21, large: 0.24 } as const

/* crucifix proportions — the highlight ring is derived from these */
const CROSS_H = 1.5
const CROSS_CENTER_Y = -0.5
const CROSS_RING_R = (CROSS_H / 2) * 1.35

/* fixed attachment points (local space) — chain rods bolt to these */
const MEDAL_LUG_R = new Vector3(0.13, 0.3, 0)
const MEDAL_LUG_L = new Vector3(-0.13, 0.3, 0)
const MEDAL_LUG_B = new Vector3(0, -0.36, 0)
const CROSS_LUG = new Vector3(0, 0.3, 0)

const PEARL = new Color('#f2ebee')
/* the Our Father beads are garnet — smaller, darker, instantly distinct */
const GARNET = new Color('#7a2f3a')
const GILT = new Color('#d8bc82')
const GARNET_PRAYED = new Color('#a05a52')

/** last step index that touches each bead — a bead is "prayed" once past it */
const LAST_STEP = BEADS.map((_, b) => SEQUENCE.reduce((last, s, i) => (s.bead === b ? i : last), -1))

/* glossy glass beads: crisp window reflections, like lacquered stone */
const pearlMaterial = new MeshPhysicalMaterial({
  color: '#ffffff',
  roughness: 0.09,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  iridescence: 0.3,
  iridescenceIOR: 1.22,
  iridescenceThicknessRange: [120, 480],
  sheen: 0.25,
  sheenColor: '#ffe8f0',
  sheenRoughness: 0.5,
  envMapIntensity: 1.15,
})

const goldMaterial = new MeshStandardMaterial({
  color: '#d4af4e',
  metalness: 1,
  roughness: 0.32,
  envMapIntensity: 1.3,
})

/* the crucifix and medal glow themselves when current (no halo sphere fits them) */
const activeGold = () => {
  const m = goldMaterial.clone()
  m.emissive.set('#93690d')
  return m
}
const crossMaterial = activeGold()
const medalMaterial = activeGold()

/* same satin finish as every other bead — just lit from within */
const haloMaterial = pearlMaterial.clone()
haloMaterial.emissive.set('#93690d')
haloMaterial.emissiveIntensity = 0.4

const ringMaterial = new MeshBasicMaterial({ color: '#b8912e', transparent: true, opacity: 0.85 })

const beadGeometry = new SphereGeometry(1, 48, 32)
/* eye-pin hardware, proportioned from real rosary-making guides: bare
   ~0.8mm wire exits the bead flush (no collar), rolled into a loop about
   a third of the bead's diameter; loops interlock chain-link style */
const LOOP_R = 0.048
const pinGeometry = new CylinderGeometry(0.011, 0.011, 1, 12, 1, true)
const loopGeometry = new TorusGeometry(LOOP_R, 0.011, 10, 24)
const ringGeometry = new TorusGeometry(1, 0.03, 12, 64)

const tmpObj = new Object3D()
const tmpV = new Vector3()
const tmpV2 = new Vector3()
const tmpQ = new Quaternion()
const UP = new Vector3(0, 1, 0)
const tmpColor = new Color()

/** instanced beads exclude the crucifix (0) and medal (5) */
const INST_BEADS = BEADS.map((_, b) => b).filter((b) => b !== 0 && b !== 5)

/** deterministic per-pearl variation so no two beads read identical */
const seeded = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const at = (pos: Float32Array, p: number, out: Vector3) =>
  out.set(pos[p * 3], pos[p * 3 + 1], pos[p * 3 + 2])

export function Rosary() {
  const step = useRosary((s) => s.step)
  const chain = useMemo(
    () => buildChain(SEQUENCE[Math.min(useRosary.getState().step, SEQUENCE.length - 1)].bead),
    [],
  )
  const beadsRef = useRef<InstancedMesh>(null)
  const pinsRef = useRef<InstancedMesh>(null)
  const loopsRef = useRef<InstancedMesh>(null)
  const haloRef = useRef<Mesh>(null)
  const ringRef = useRef<Mesh>(null)
  const crossRef = useRef<Object3D>(null)
  const medalRef = useRef<Object3D>(null)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const pulse = useRef(0)
  const lastDrag = useRef({ x: 0, y: 0, t: 0, vx: 0, vy: 0 })

  // visual radius per particle: hardware stops at these surfaces instead of
  // running bead-center to bead-center
  const particleR = useMemo(() => {
    const r = new Float32Array(chain.pos.length / 3)
    BEADS.forEach((kind, b) => {
      r[chain.beadParticle[b]] =
        kind === 'small' ? 0.21 : kind === 'large' ? 0.24 : kind === 'medal' ? 0.38 : 0.07
    })
    return r
  }, [chain])

  // the strand as bead-to-bead gaps (each physics midpoint spans one gap);
  // hardware renders per gap: pin · loop ⟷ loop · pin
  const gaps = useMemo(() => {
    const bp = chain.beadParticle
    const list: { a: number; b: number }[] = []
    for (let k = 0; k < 112; k += 2) list.push({ a: k, b: (k + 2) % 112 })
    list.push(
      { a: 0, b: bp[4] },
      { a: bp[4], b: bp[3] },
      { a: bp[3], b: bp[2] },
      { a: bp[2], b: bp[1] },
      { a: bp[1], b: bp[0] },
    )
    return list
  }, [chain])

  // pointer ↔ world: a ray from the camera onto the chain's z=0 plane
  const worldAt = (clientX: number, clientY: number, out: Vector3) => {
    out.set((clientX / size.width) * 2 - 1, -(clientY / size.height) * 2 + 1, 0.5)
    out.unproject(camera)
    out.sub(camera.position).normalize()
    const t = -camera.position.z / out.z
    return out.multiplyScalar(t).add(camera.position)
  }

  // no dependency array on purpose: re-registers each render so worldAt
  // always closes over the current camera and canvas size
  useEffect(() => {
    grabApi.current = {
      grab: (x, y) => {
        worldAt(x, y, tmpV)
        const p = nearestParticle(chain, tmpV.x, tmpV.y, 1.6)
        if (p < 0) return
        chain.grabbed = p
        chain.grabTarget = [tmpV.x, tmpV.y, 0]
        chain.calmFor = 0
        lastDrag.current = { x: tmpV.x, y: tmpV.y, t: performance.now(), vx: 0, vy: 0 }
      },
      drag: (x, y) => {
        if (chain.grabbed < 0) return
        worldAt(x, y, tmpV)
        chain.grabTarget = [tmpV.x, tmpV.y, 0]
        const d = lastDrag.current
        const dt = (performance.now() - d.t) / 1000
        if (dt > 0.004) {
          d.vx = (tmpV.x - d.x) / dt
          d.vy = (tmpV.y - d.y) / dt
          d.x = tmpV.x
          d.y = tmpV.y
          d.t = performance.now()
        }
      },
      release: () => {
        releaseGrab(chain, lastDrag.current.vx, lastDrag.current.vy)
      },
    }
    return () => {
      grabApi.current = null
    }
  })

  // hand the next bead to the fingers + re-tint prayed beads
  useEffect(() => {
    holdBead(chain, SEQUENCE[Math.min(step, SEQUENCE.length - 1)].bead)
    pulse.current = 1
    const inst = beadsRef.current
    if (!inst) return
    INST_BEADS.forEach((b, i) => {
      const garnet = BEADS[b] === 'large'
      tmpColor.copy(garnet ? GARNET : PEARL)
      // subtle per-bead variation: hue drift + lightness sparkle
      tmpColor.offsetHSL((seeded(b, 1) - 0.5) * 0.045, seeded(b, 2) * 0.03, (seeded(b, 3) - 0.5) * 0.04)
      if (LAST_STEP[b] < step) tmpColor.lerp(garnet ? GARNET_PRAYED : GILT, 0.5)
      inst.setColorAt(i, tmpColor)
    })
    inst.instanceColor!.needsUpdate = true
  }, [step, chain])

  useFrame((_, dt) => {
    stepChain(chain, dt, view.reducedMotion)
    const { pos, beadParticle } = chain

    // positions are frozen while asleep, so the uploaded matrices stay
    // valid and every per-particle update below can be skipped
    if (!isAsleep(chain)) {
      // beads
      const inst = beadsRef.current!
      for (let i = 0; i < INST_BEADS.length; i++) {
        const b = INST_BEADS[i]
        at(pos, beadParticle[b], tmpObj.position)
        tmpObj.scale.setScalar(RADIUS[BEADS[b] as 'small' | 'large'])
        tmpObj.quaternion.identity()
        tmpObj.updateMatrix()
        inst.setMatrixAt(i, tmpObj.matrix)
      }
      inst.instanceMatrix.needsUpdate = true

      // medal: a coin hanging where the loop meets the pendant, tilting
      // with the pendant it carries (positioned before the chain so rods
      // can attach to its fixed lugs)
      const medal = medalRef.current!
      at(pos, 0, medal.position)
      at(pos, beadParticle[1], tmpV) // toward the Our Father bead below
      tmpV2.copy(medal.position).sub(tmpV).normalize()
      medal.quaternion.setFromUnitVectors(UP, tmpV2)

      // crucifix: follows the last pendant segment with damped rotation, so
      // it swings like a weighted pendant instead of snapping — and if the
      // chain points it downward, the mirrored target keeps it upright
      const cross = crossRef.current!
      at(pos, beadParticle[0], cross.position)
      at(pos, beadParticle[0] - 1, tmpV)
      tmpV2.copy(cross.position).sub(tmpV).normalize().negate()
      if (tmpV2.y < 0.05) tmpV2.y = 0.05 + (0.05 - tmpV2.y) * 0.4
      tmpV2.normalize()
      tmpQ.setFromUnitVectors(UP, tmpV2)
      cross.quaternion.slerp(tmpQ, 1 - Math.exp(-7 * dt))

      // where a rod meets the medal or crucifix it attaches to a FIXED lug
      // on the piece — real hardware, not a point sliding around the rim
      const lugFor = (self: number, other: number, out: Vector3): boolean => {
        if (self === 0) {
          // the three links at the medal: →1 (decades right), →111 (decades
          // left), →112 (pendant below)
          out.copy(other === 1 ? MEDAL_LUG_R : other === 111 ? MEDAL_LUG_L : MEDAL_LUG_B)
          out.applyQuaternion(medal.quaternion).add(medal.position)
          return true
        }
        if (self === beadParticle[0]) {
          out.copy(CROSS_LUG).applyQuaternion(cross.quaternion).add(cross.position)
          return true
        }
        return false
      }

      // per gap: bare pin · loop ⟷ loop · pin — the two loops interlock at
      // 90° like real bent-wire eye pins; gaps longer than the hardware
      // (around the centerpiece and the crucifix drop) get a run of fine
      // chain links instead of any rigid bar
      const pins = pinsRef.current!
      const loops = loopsRef.current!
      const hide = (mesh: InstancedMesh, i: number) => {
        tmpObj.scale.setScalar(0)
        tmpObj.updateMatrix()
        mesh.setMatrixAt(i, tmpObj.matrix)
      }
      let chainlet = gaps.length * 2 // spare loop instances for chain runs
      for (let gi = 0; gi < gaps.length; gi++) {
        const { a, b } = gaps[gi]
        at(pos, a, tmpV)
        at(pos, b, tmpV2)
        const lugA = lugFor(a, b, tmpV)
        const lugB = lugFor(b, a, tmpV2)
        tmpV2.sub(tmpV)
        const len = tmpV2.length() || 1e-6
        tmpV2.divideScalar(len)
        const ra = lugA ? 0 : particleR[a] * 0.97
        const rb = lugB ? 0 : particleR[b] * 0.97
        const span = len - ra - rb
        if (span < 0.06) {
          hide(loops, gi * 2)
          hide(loops, gi * 2 + 1)
          hide(pins, gi * 2)
          hide(pins, gi * 2 + 1)
          continue
        }
        const pinLen = Math.min(0.06, Math.max(0.004, span / 2 - LOOP_R * 1.4))
        const roll = gi * (Math.PI / 2)

        const seat = (dist: number, sign: 1 | -1, pinI: number, loopI: number) => {
          tmpObj.position.copy(tmpV).addScaledVector(tmpV2, dist + (sign * pinLen) / 2)
          tmpObj.quaternion.setFromUnitVectors(UP, tmpV2)
          tmpObj.scale.set(1, pinLen, 1)
          tmpObj.updateMatrix()
          pins.setMatrixAt(pinI, tmpObj.matrix)
          tmpObj.position.copy(tmpV).addScaledVector(tmpV2, dist + sign * (pinLen + LOOP_R * 0.9))
          tmpObj.quaternion.setFromUnitVectors(UP, tmpV2)
          tmpObj.rotateY(roll + (sign > 0 ? 0 : Math.PI / 2))
          tmpObj.rotateX(Math.PI / 2)
          tmpObj.scale.setScalar(1)
          tmpObj.updateMatrix()
          loops.setMatrixAt(loopI, tmpObj.matrix)
        }
        seat(ra, 1, gi * 2, gi * 2)
        seat(ra + span, -1, gi * 2 + 1, gi * 2 + 1)

        // fine chain filling a long run: interlocked links, alternating 90°
        const from = ra + pinLen + LOOP_R * 1.6
        const to = ra + span - pinLen - LOOP_R * 1.6
        const n = Math.min(10, Math.floor((to - from) / (LOOP_R * 1.5)))
        for (let c = 0; c < n && chainlet < loops.count; c++) {
          tmpObj.position
            .copy(tmpV)
            .addScaledVector(tmpV2, from + ((c + 0.5) / n) * (to - from))
          tmpObj.quaternion.setFromUnitVectors(UP, tmpV2)
          tmpObj.rotateY(roll + (c % 2) * (Math.PI / 2))
          tmpObj.rotateX(Math.PI / 2)
          tmpObj.scale.setScalar(0.9)
          tmpObj.updateMatrix()
          loops.setMatrixAt(chainlet++, tmpObj.matrix)
        }
      }
      while (chainlet < loops.count) hide(loops, chainlet++)
      pins.instanceMatrix.needsUpdate = true
      loops.instanceMatrix.needsUpdate = true
    }

    // current bead: held at the anchor — halo + ring mark it
    const current = SEQUENCE[Math.min(step, SEQUENCE.length - 1)]
    at(pos, beadParticle[current.bead], view.beadPos)
    pulse.current = MathUtils.damp(pulse.current, 0, 6, dt)
    const kind = BEADS[current.bead]
    const halo = haloRef.current!
    halo.visible = kind === 'small' || kind === 'large'
    if (halo.visible) {
      halo.position.copy(view.beadPos)
      const r = RADIUS[kind as 'small' | 'large']
      halo.scale.setScalar(r * 1.12 * (1 + pulse.current * 0.45))
      haloMaterial.color.copy(kind === 'large' ? GARNET : PEARL)
      haloMaterial.emissiveIntensity = kind === 'large' ? 0.18 : 0.4
    }
    const glow = 0.55 * (1 + pulse.current)
    crossMaterial.emissiveIntensity = MathUtils.damp(
      crossMaterial.emissiveIntensity,
      kind === 'crucifix' ? glow : 0,
      7,
      dt,
    )
    medalMaterial.emissiveIntensity = MathUtils.damp(
      medalMaterial.emissiveIntensity,
      kind === 'medal' ? glow : 0,
      7,
      dt,
    )

    // a thin gold ring floats around the current bead, facing the camera
    const ring = ringRef.current!
    ring.position.copy(view.beadPos)
    if (kind === 'crucifix') ring.position.y += CROSS_CENTER_Y
    const ringR = kind === 'crucifix' ? CROSS_RING_R : kind === 'medal' ? 0.52 : RADIUS[kind] + 0.17
    ring.scale.setScalar(ringR * (1 + pulse.current * 0.3))
    ring.quaternion.copy(camera.quaternion)
  })

  return (
    <group>
      <instancedMesh
        ref={beadsRef}
        args={[beadGeometry, pearlMaterial, INST_BEADS.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={pinsRef}
        args={[pinGeometry, goldMaterial, gaps.length * 2]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={loopsRef}
        args={[loopGeometry, goldMaterial, gaps.length * 2 + 24]}
        frustumCulled={false}
      />
      <mesh ref={haloRef} geometry={beadGeometry} material={haloMaterial} frustumCulled={false} />
      <mesh ref={ringRef} geometry={ringGeometry} material={ringMaterial} frustumCulled={false} />
      <group ref={medalRef}>
        {/* an oval medal with a raised rim and embossed cross */}
        <group scale={[1, 1.22, 1]}>
          <mesh material={medalMaterial} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.27, 0.27, 0.06, 32]} />
          </mesh>
          <mesh material={goldMaterial}>
            <torusGeometry args={[0.27, 0.035, 12, 40]} />
          </mesh>
        </group>
        <mesh material={goldMaterial} position={[0, 0, 0.055]}>
          <boxGeometry args={[0.05, 0.3, 0.035]} />
        </mesh>
        <mesh material={goldMaterial} position={[0, 0.06, 0.055]}>
          <boxGeometry args={[0.18, 0.05, 0.035]} />
        </mesh>
        {/* the three bail rings the chain bolts to */}
        {[MEDAL_LUG_R, MEDAL_LUG_L, MEDAL_LUG_B].map((lug, i) => (
          <mesh key={i} material={goldMaterial} position={lug}>
            <torusGeometry args={[0.05, 0.018, 10, 20]} />
          </mesh>
        ))}
      </group>
      <group ref={crossRef} frustumCulled={false}>
        <RoundedBox
          args={[0.16, CROSS_H, 0.1]}
          radius={0.035}
          material={crossMaterial}
          position={[0, CROSS_CENTER_Y, 0]}
        />
        <RoundedBox
          args={[0.9, 0.16, 0.1]}
          radius={0.035}
          material={crossMaterial}
          position={[0, -0.28, 0]}
        />
        <mesh material={goldMaterial} position={[0, 0.3, 0]}>
          <torusGeometry args={[0.08, 0.026, 10, 20]} />
        </mesh>
      </group>
    </group>
  )
}

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

const PEARL = new Color('#f2ebee')
/* the Our Father beads are garnet — smaller, darker, instantly distinct */
const GARNET = new Color('#7a2f3a')
const GILT = new Color('#d8bc82')
const GARNET_PRAYED = new Color('#a05a52')

/** last step index that touches each bead — a bead is "prayed" once past it */
const LAST_STEP = BEADS.map((_, b) => SEQUENCE.reduce((last, s, i) => (s.bead === b ? i : last), -1))

const pearlMaterial = new MeshPhysicalMaterial({
  color: '#ffffff',
  roughness: 0.16,
  clearcoat: 1,
  clearcoatRoughness: 0.22,
  iridescence: 0.45,
  iridescenceIOR: 1.22,
  iridescenceThicknessRange: [120, 480],
  sheen: 0.4,
  sheenColor: '#ffe8f0',
  sheenRoughness: 0.6,
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

const haloMaterial = new MeshPhysicalMaterial({
  color: '#f2ebee',
  roughness: 0.1,
  clearcoat: 1,
  emissive: '#93690d',
  emissiveIntensity: 0.4,
})

const ringMaterial = new MeshBasicMaterial({ color: '#b8912e', transparent: true, opacity: 0.85 })

const beadGeometry = new SphereGeometry(1, 32, 24)
const linkGeometry = new CylinderGeometry(0.02, 0.02, 1, 6, 1, true)
const capGeometry = new CylinderGeometry(0.06, 0.075, 0.05, 10, 1)
const ringGeometry = new TorusGeometry(1, 0.03, 10, 48)

const tmpObj = new Object3D()
const tmpV = new Vector3()
const tmpV2 = new Vector3()
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

/** chain direction through a bead, from its neighbouring particles */
const tangent = (pos: Float32Array, p: number, out: Vector3) => {
  const a = Math.max(0, p - 1)
  const b = Math.min(pos.length / 3 - 1, p + 1)
  out.set(pos[b * 3] - pos[a * 3], pos[b * 3 + 1] - pos[a * 3 + 1], pos[b * 3 + 2] - pos[a * 3 + 2])
  const len = out.length()
  return len > 1e-6 ? out.divideScalar(len) : out.set(0, 1, 0)
}

export function Rosary() {
  const step = useRosary((s) => s.step)
  const chain = useMemo(
    () => buildChain(SEQUENCE[Math.min(useRosary.getState().step, SEQUENCE.length - 1)].bead),
    [],
  )
  const beadsRef = useRef<InstancedMesh>(null)
  const capsRef = useRef<InstancedMesh>(null)
  const linksRef = useRef<InstancedMesh>(null)
  const haloRef = useRef<Mesh>(null)
  const ringRef = useRef<Mesh>(null)
  const crossRef = useRef<Object3D>(null)
  const medalRef = useRef<Object3D>(null)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const pulse = useRef(0)
  const lastDrag = useRef({ x: 0, y: 0, t: 0, vx: 0, vy: 0 })

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
      // beads + their gold end-caps
      const inst = beadsRef.current!
      const caps = capsRef.current!
      for (let i = 0; i < INST_BEADS.length; i++) {
        const b = INST_BEADS[i]
        const p = beadParticle[b]
        const r = RADIUS[BEADS[b] as 'small' | 'large']
        at(pos, p, tmpObj.position)
        tmpObj.scale.setScalar(r)
        tmpObj.quaternion.identity()
        tmpObj.updateMatrix()
        inst.setMatrixAt(i, tmpObj.matrix)

        tangent(pos, p, tmpV2)
        tmpObj.quaternion.setFromUnitVectors(UP, tmpV2)
        tmpObj.scale.setScalar(1)
        tmpObj.position.addScaledVector(tmpV2, r * 0.94)
        tmpObj.updateMatrix()
        caps.setMatrixAt(i * 2, tmpObj.matrix)
        at(pos, p, tmpObj.position)
        tmpObj.position.addScaledVector(tmpV2, -r * 0.94)
        tmpObj.rotateX(Math.PI)
        tmpObj.updateMatrix()
        caps.setMatrixAt(i * 2 + 1, tmpObj.matrix)
      }
      inst.instanceMatrix.needsUpdate = true
      caps.instanceMatrix.needsUpdate = true

      // chain links between particles
      const links = linksRef.current!
      const { links: L } = chain
      for (let l = 0; l < L.length; l += 3) {
        at(pos, L[l], tmpV)
        at(pos, L[l + 1], tmpV2)
        tmpObj.position.copy(tmpV).add(tmpV2).multiplyScalar(0.5)
        tmpV2.sub(tmpV)
        const len = tmpV2.length() || 1e-6
        tmpObj.quaternion.setFromUnitVectors(UP, tmpV2.divideScalar(len))
        tmpObj.scale.set(1, len, 1)
        tmpObj.updateMatrix()
        links.setMatrixAt(l / 3, tmpObj.matrix)
      }
      links.instanceMatrix.needsUpdate = true

      // medal: a coin hanging where the loop meets the pendant, tilting
      // with the pendant it carries
      const medal = medalRef.current!
      at(pos, 0, medal.position)
      at(pos, beadParticle[1], tmpV) // toward the Our Father bead below
      tmpV2.copy(medal.position).sub(tmpV).normalize()
      medal.quaternion.setFromUnitVectors(UP, tmpV2)

      // crucifix: hangs along the last pendant segment — but never inverted,
      // even while held with the chain below it
      const cross = crossRef.current!
      at(pos, beadParticle[0], cross.position)
      at(pos, beadParticle[0] - 1, tmpV)
      tmpV2.copy(cross.position).sub(tmpV).normalize().negate()
      if (tmpV2.y < 0.35) {
        // smooth floor: the cross leans but never swings past horizontal
        tmpV2.y = 0.35 * Math.exp((tmpV2.y - 0.35) * 2)
        tmpV2.normalize()
      }
      cross.quaternion.setFromUnitVectors(UP, tmpV2)
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
    const ringR = kind === 'crucifix' ? CROSS_RING_R : kind === 'medal' ? 0.62 : RADIUS[kind] + 0.17
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
        ref={capsRef}
        args={[capGeometry, goldMaterial, INST_BEADS.length * 2]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={linksRef}
        args={[linkGeometry, goldMaterial, chain.links.length / 3]}
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
        <mesh material={goldMaterial} position={[0, 0, 0.045]}>
          <boxGeometry args={[0.05, 0.3, 0.03]} />
        </mesh>
        <mesh material={goldMaterial} position={[0, 0.06, 0.045]}>
          <boxGeometry args={[0.18, 0.05, 0.03]} />
        </mesh>
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

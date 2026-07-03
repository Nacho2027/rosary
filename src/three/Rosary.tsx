import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import {
  Color,
  CylinderGeometry,
  InstancedMesh,
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
import { buildChain, nearestParticle, stepChain, PARTICLE_COUNT } from './verlet'
import { grabApi, view } from './interaction'

export const HOOK_Y = 8.5

const RADIUS = { small: 0.21, large: 0.3 } as const

const PEARL = new Color('#f2ebee')
const PEARL_LARGE = new Color('#efe3d3')
const GILT = new Color('#d8bc82')

/** last step index that touches each bead — a bead is "prayed" once past it */
const LAST_STEP = BEADS.map((_, b) => SEQUENCE.reduce((last, s, i) => (s.bead === b ? i : last), -1))

const pearlMaterial = new MeshPhysicalMaterial({
  color: '#ffffff',
  roughness: 0.13,
  clearcoat: 1,
  clearcoatRoughness: 0.18,
  iridescence: 0.32,
  iridescenceIOR: 1.25,
  envMapIntensity: 1.15,
})

const goldMaterial = new MeshStandardMaterial({
  color: '#d4af4e',
  metalness: 1,
  roughness: 0.32,
  envMapIntensity: 1.3,
})

/* the crucifix and medal glow themselves when current (no halo sphere fits them) */
const activeGold = () =>
  new MeshStandardMaterial({
    color: '#d4af4e',
    metalness: 1,
    roughness: 0.32,
    envMapIntensity: 1.3,
    emissive: '#93690d',
    emissiveIntensity: 0,
  })
const crossMaterial = activeGold()
const medalMaterial = activeGold()

const haloMaterial = new MeshPhysicalMaterial({
  color: '#f2ebee',
  roughness: 0.1,
  clearcoat: 1,
  emissive: '#93690d',
  emissiveIntensity: 0.4,
})

const beadGeometry = new SphereGeometry(1, 32, 24)
const linkGeometry = new CylinderGeometry(0.028, 0.028, 1, 6, 1, true)
const ringGeometry = new TorusGeometry(1, 0.03, 10, 48)

const ringMaterial = new MeshBasicMaterial({
  color: '#b8912e',
  transparent: true,
  opacity: 0.85,
})

const tmpObj = new Object3D()
const tmpV = new Vector3()
const tmpV2 = new Vector3()
const tmpQ = new Quaternion()
const UP = new Vector3(0, 1, 0)
const tmpColor = new Color()

/** instanced beads exclude the crucifix (0) and medal (5) */
const INST_BEADS = BEADS.map((_, b) => b).filter((b) => b !== 0 && b !== 5)

export function Rosary() {
  const chain = useMemo(() => buildChain(HOOK_Y), [])
  const beadsRef = useRef<InstancedMesh>(null)
  const linksRef = useRef<InstancedMesh>(null)
  const haloRef = useRef<Mesh>(null)
  const ringRef = useRef<Mesh>(null)
  const crossRef = useRef<Object3D>(null)
  const medalRef = useRef<Object3D>(null)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const step = useRosary((s) => s.step)
  const pulse = useRef(0)

  // pointer ↔ world: a ray from the camera onto the chain's z=0 plane
  const worldAt = (clientX: number, clientY: number, out: Vector3) => {
    out.set((clientX / size.width) * 2 - 1, -(clientY / size.height) * 2 + 1, 0.5)
    out.unproject(camera)
    out.sub(camera.position).normalize()
    const t = -camera.position.z / out.z
    return out.multiplyScalar(t).add(camera.position)
  }

  useEffect(() => {
    grabApi.current = {
      grab: (x, y) => {
        worldAt(x, y, tmpV)
        const p = nearestParticle(chain, tmpV.x, tmpV.y, 1.6)
        if (p < 0) return false
        chain.grabbed = p
        chain.grabTarget = [tmpV.x, tmpV.y, 0]
        return true
      },
      drag: (x, y) => {
        if (chain.grabbed < 0) return
        worldAt(x, y, tmpV)
        chain.grabTarget = [tmpV.x, tmpV.y, 0]
      },
      release: () => {
        chain.grabbed = -1
      },
    }
    return () => {
      grabApi.current = null
    }
  })

  // re-tint instances when progress changes (61 beads — cheap)
  useEffect(() => {
    const inst = beadsRef.current
    if (!inst) return
    INST_BEADS.forEach((b, i) => {
      const base = BEADS[b] === 'large' ? PEARL_LARGE : PEARL
      tmpColor.copy(base)
      if (LAST_STEP[b] < step) tmpColor.lerp(GILT, 0.45)
      inst.setColorAt(i, tmpColor)
    })
    inst.instanceColor!.needsUpdate = true
    pulse.current = 1
  }, [step])

  useFrame((_, dt) => {
    stepChain(chain, dt, view.reducedMotion ? 0.9 : 0.985)
    const { pos, beadParticle } = chain

    const at = (p: number, out: Vector3) => out.set(pos[p * 3], pos[p * 3 + 1], pos[p * 3 + 2])

    // beads
    const inst = beadsRef.current!
    INST_BEADS.forEach((b, i) => {
      at(beadParticle[b], tmpObj.position)
      const r = RADIUS[BEADS[b] as 'small' | 'large']
      tmpObj.scale.setScalar(r)
      tmpObj.rotation.set(0, 0, 0)
      tmpObj.updateMatrix()
      inst.setMatrixAt(i, tmpObj.matrix)
    })
    inst.instanceMatrix.needsUpdate = true

    // chain links between particles
    const links = linksRef.current!
    const { links: L } = chain
    for (let l = 0; l < L.length; l += 3) {
      at(L[l], tmpV)
      at(L[l + 1], tmpV2)
      tmpObj.position.copy(tmpV).add(tmpV2).multiplyScalar(0.5)
      tmpV2.sub(tmpV)
      const len = tmpV2.length() || 1e-6
      tmpQ.setFromUnitVectors(UP, tmpV2.divideScalar(len))
      tmpObj.quaternion.copy(tmpQ)
      tmpObj.scale.set(1, len, 1)
      tmpObj.updateMatrix()
      links.setMatrixAt(l / 3, tmpObj.matrix)
    }
    links.instanceMatrix.needsUpdate = true

    // medal: a coin hanging where the loop meets the pendant
    at(0, medalRef.current!.position)

    // crucifix: hangs along the last pendant segment
    const cross = crossRef.current!
    at(PARTICLE_COUNT - 1, cross.position)
    at(PARTICLE_COUNT - 2, tmpV)
    tmpV2.copy(cross.position).sub(tmpV).normalize()
    cross.quaternion.setFromUnitVectors(UP, tmpV2.negate())

    // current bead: halo mesh + camera focus target
    const current = SEQUENCE[Math.min(step, SEQUENCE.length - 1)]
    at(beadParticle[current.bead], view.beadPos)
    pulse.current += (0 - pulse.current) * Math.min(1, dt * 6)
    const kind = BEADS[current.bead]
    const halo = haloRef.current!
    halo.visible = kind === 'small' || kind === 'large'
    if (halo.visible) {
      halo.position.copy(view.beadPos)
      const r = RADIUS[kind as 'small' | 'large']
      halo.scale.setScalar(r * 1.12 * (1 + pulse.current * 0.45))
    }
    const glow = 0.55 * (1 + pulse.current)
    crossMaterial.emissiveIntensity +=
      ((kind === 'crucifix' ? glow : 0) - crossMaterial.emissiveIntensity) * Math.min(1, dt * 7)
    medalMaterial.emissiveIntensity +=
      ((kind === 'medal' ? glow : 0) - medalMaterial.emissiveIntensity) * Math.min(1, dt * 7)

    // a thin gold ring floats around the current bead, facing the camera
    const ring = ringRef.current!
    ring.position.copy(view.beadPos)
    if (kind === 'crucifix') ring.position.y -= 0.5 // circle the whole cross
    const ringR = kind === 'crucifix' ? 1.05 : kind === 'medal' ? 0.62 : RADIUS[kind] + 0.19
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
        ref={linksRef}
        args={[linkGeometry, goldMaterial, chain.links.length / 3]}
        frustumCulled={false}
      />
      <mesh ref={haloRef} geometry={beadGeometry} material={haloMaterial} frustumCulled={false} />
      <mesh ref={ringRef} geometry={ringGeometry} material={ringMaterial} frustumCulled={false} />
      <group ref={medalRef}>
        <mesh material={medalMaterial} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.07, 32]} />
        </mesh>
        <mesh material={goldMaterial}>
          <torusGeometry args={[0.36, 0.045, 12, 40]} />
        </mesh>
      </group>
      <group ref={crossRef} frustumCulled={false}>
        <RoundedBox args={[0.16, 1.5, 0.1]} radius={0.035} material={crossMaterial} position={[0, -0.5, 0]} />
        <RoundedBox args={[0.9, 0.16, 0.1]} radius={0.035} material={crossMaterial} position={[0, -0.28, 0]} />
        <mesh material={goldMaterial} position={[0, 0.3, 0]}>
          <torusGeometry args={[0.08, 0.026, 10, 20]} />
        </mesh>
      </group>
    </group>
  )
}

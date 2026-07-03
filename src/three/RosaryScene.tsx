import { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { BackSide, MathUtils, Vector3 } from 'three'
import { Rosary } from './Rosary'
import { ANCHOR } from './verlet'
import { view } from './interaction'

const FOV = 35
/** the dangling rosary's visual center, below the fingers anchor */
const OVERVIEW = new Vector3(ANCHOR[0], ANCHOR[1] - 6.2, 0)
const FINGERS = new Vector3(...ANCHOR)

const tmp = new Vector3()

function CameraRig() {
  const camera = useThree((s) => s.camera)
  const aspect = useThree((s) => s.viewport.aspect)
  const target = useRef(new Vector3().copy(OVERVIEW))

  useFrame((_, dt) => {
    const landscape = aspect > 1
    const zoom = view.zoom
    const far = landscape ? 24 : 42
    const z = MathUtils.lerp(far, 5.5, Math.pow(zoom, 1.15))
    const viewH = 2 * z * Math.tan((FOV * Math.PI) / 360)

    // blend the dangling-rosary overview → the fingers anchor, then bias so
    // the rosary sits clear of the prayer card (up in portrait, left in
    // landscape)
    const follow = MathUtils.smoothstep(zoom, 0.05, 0.5)
    tmp.copy(OVERVIEW).lerp(FINGERS, follow)
    if (landscape) tmp.x += viewH * aspect * 0.17
    else tmp.y -= viewH * (0.08 + 0.17 * follow) // fingers ride high, clear of the card

    const t = target.current
    const k = view.reducedMotion ? 20 : 4.5
    t.x = MathUtils.damp(t.x, tmp.x, k, dt)
    t.y = MathUtils.damp(t.y, tmp.y, k, dt)
    camera.position.set(t.x, t.y, MathUtils.damp(camera.position.z, z, k, dt))
    camera.lookAt(t)
  })
  return null
}

export function RosaryScene() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <Canvas
        camera={{ fov: FOV, position: [0, OVERVIEW.y, 30] }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Rosary />
        <CameraRig />
        <Environment resolution={256} frames={1}>
          {/* a warm room for the metals, a bright window key for crisp pearl
              highlights, a cool fill, and a floor bounce */}
          <mesh scale={60}>
            <sphereGeometry />
            <meshBasicMaterial color="#7d6f5b" side={BackSide} />
          </mesh>
          <Lightformer
            intensity={5}
            color="#fff6e4"
            position={[-7, 8, 7]}
            rotation={[0, Math.PI / 4, 0]}
            scale={[10, 18, 1]}
          />
          <Lightformer
            intensity={1.6}
            color="#e6ebf5"
            position={[9, 1, 5]}
            rotation={[0, -Math.PI / 3, 0]}
            scale={[8, 14, 1]}
          />
          <Lightformer
            intensity={1}
            color="#f5e3c4"
            position={[0, -9, 5]}
            rotation={[Math.PI / 2.6, 0, 0]}
            scale={[16, 8, 1]}
          />
          <Lightformer
            intensity={2.2}
            color="#fffdf5"
            position={[2, 12, -2]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[6, 6, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  )
}

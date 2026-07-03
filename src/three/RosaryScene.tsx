import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { BackSide, MathUtils, Vector3 } from 'three'
import { Rosary, HOOK_Y } from './Rosary'
import { view } from './interaction'

const FOV = 35
const OVERVIEW = new Vector3(0, HOOK_Y - 10.5, 0)
const target = new Vector3().copy(OVERVIEW)

function CameraRig() {
  const camera = useThree((s) => s.camera)
  const aspect = useThree((s) => s.viewport.aspect)

  useFrame((_, dt) => {
    const landscape = aspect > 1
    const zoom = view.zoom
    const far = landscape ? 40 : 60
    const z = MathUtils.lerp(far, 6.5, Math.pow(zoom, 1.15))
    const viewH = 2 * z * Math.tan((FOV * Math.PI) / 360)

    // blend overview → current bead, then bias so the rosary sits clear of
    // the prayer card (upward in portrait, leftward in landscape)
    const follow = MathUtils.smoothstep(zoom, 0.05, 0.5)
    tmp.copy(OVERVIEW).lerp(view.beadPos, follow)
    if (landscape) tmp.x += viewH * aspect * 0.19
    else tmp.y -= viewH * 0.13

    const k = view.reducedMotion ? 20 : 4.5
    target.x = MathUtils.damp(target.x, tmp.x, k, dt)
    target.y = MathUtils.damp(target.y, tmp.y, k, dt)
    target.z = MathUtils.damp(target.z, tmp.z, k, dt)
    camera.position.set(target.x, target.y, MathUtils.damp(camera.position.z, z, k, dt))
    camera.lookAt(target)
  })
  return null
}

const tmp = new Vector3()

export function RosaryScene() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <Canvas
        camera={{ fov: FOV, position: [0, OVERVIEW.y, 40] }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Rosary />
        <CameraRig />
        <Environment resolution={256} frames={1}>
          {/* a warm room for the metals to reflect, then a quiet studio:
              one warm key, a cool fill, a floor bounce */}
          <mesh scale={60}>
            <sphereGeometry />
            <meshBasicMaterial color="#8a7a63" side={BackSide} />
          </mesh>
          <Lightformer
            intensity={2.6}
            color="#fff5e1"
            position={[-6, 9, 6]}
            rotation={[0, Math.PI / 4, 0]}
            scale={[12, 14, 1]}
          />
          <Lightformer
            intensity={1.1}
            color="#e8ecf5"
            position={[8, 2, 5]}
            rotation={[0, -Math.PI / 3, 0]}
            scale={[10, 16, 1]}
          />
          <Lightformer
            intensity={0.7}
            color="#f5e9d0"
            position={[0, -9, 4]}
            rotation={[Math.PI / 2.5, 0, 0]}
            scale={[16, 8, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  )
}

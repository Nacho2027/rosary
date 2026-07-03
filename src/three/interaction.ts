import { MathUtils, Vector3 } from 'three'

/**
 * Shared mutable state between the DOM (gestures in App) and the R3F scene.
 * Written at gesture/frame rate, so it deliberately lives outside React.
 */
export const view = {
  /** 0 = whole rosary · 1 = close on the held bead */
  zoom:
    typeof matchMedia !== 'undefined' && matchMedia('(orientation: portrait)').matches ? 0.55 : 0.3,
  /** world position of the current bead, written by <Rosary> each frame */
  beadPos: new Vector3(0, 0, 0),
  reducedMotion:
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
}

export interface GrabApi {
  grab: (clientX: number, clientY: number) => void
  drag: (clientX: number, clientY: number) => void
  release: () => void
}

/** Registered by <Rosary> once the scene mounts. */
export const grabApi: { current: GrabApi | null } = { current: null }

export function zoomBy(delta: number): void {
  view.zoom = MathUtils.clamp(view.zoom + delta, 0, 1)
}

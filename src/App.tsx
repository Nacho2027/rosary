import { useEffect, useRef } from 'react'
import { SEQUENCE } from './data/rosary'
import { UI } from './data/texts'
import { useGuideVisible, useRosary } from './store'
import { grabApi, zoomBy } from './three/interaction'
import { RosaryScene } from './three/RosaryScene'
import { Guide } from './ui/Guide'
import { PrayerCard } from './ui/PrayerCard'
import { SettingsSheet } from './ui/SettingsSheet'

const TAP_SLOP = 9
const TAP_MS = 600

export default function App() {
  const step = useRosary((s) => s.step)
  const lang = useRosary((s) => s.lang)
  const guideVisible = useGuideVisible()

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const tap = useRef<{ x: number; y: number; t: number } | null>(null)
  const pinchDist = useRef<number | null>(null)

  // keyboard: space/→ advance, ←/backspace correct
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { settingsOpen, guideOpen, guideSeen, advance, back } = useRosary.getState()
      if (settingsOpen || guideOpen || !guideSeen) return
      // let focused controls keep their native keyboard activation
      if (document.activeElement?.closest('button, a, input, [tabindex]')) return
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        advance()
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault()
        back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /** true when the event started on chrome that handles its own input */
  const isUi = (e: React.PointerEvent) =>
    (e.target as Element).closest('button, [data-card]') !== null

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const onUi = isUi(e)
    // capture so a release outside the window still delivers pointerup
    if (!onUi) e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      // pinch begins: stop dragging the chain, remember the finger gap
      grabApi.current?.release()
      tap.current = null
      const [a, b] = [...pointers.current.values()]
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y)
      return
    }
    if (pointers.current.size > 2) return
    tap.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }
    if (!onUi) grabApi.current?.grab(e.clientX, e.clientY)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointers.current.get(e.pointerId)
    if (!p) return
    p.x = e.clientX
    p.y = e.clientY
    if (pinchDist.current !== null && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      zoomBy((d - pinchDist.current) * 0.004)
      pinchDist.current = d
      return
    }
    if (tap.current && Math.hypot(e.clientX - tap.current.x, e.clientY - tap.current.y) > TAP_SLOP) {
      tap.current = null // it's a drag now
    }
    grabApi.current?.drag(e.clientX, e.clientY)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchDist.current = null
    grabApi.current?.release()
    const t = tap.current
    tap.current = null
    if (t && e.timeStamp - t.t < TAP_MS) useRosary.getState().advance()
  }

  const onPointerCancel = (e: React.PointerEvent) => {
    // the browser took the gesture (e.g. card scroll) — never advance
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchDist.current = null
    grabApi.current?.release()
    tap.current = null
  }

  const settings = useRosary((s) => s.openSettings)
  const back = useRosary((s) => s.back)
  const done = step >= SEQUENCE.length

  return (
    <main
      className="parchment relative h-full touch-none overflow-hidden select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onWheel={(e) => zoomBy(-(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * 0.002)}
    >
      <RosaryScene />

      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label={UI.back[lang]}
          onClick={back}
          className={`cursor-pointer rounded-md border-0 bg-transparent p-3 text-ink-2 transition-opacity duration-300 hover:text-ink ${
            step > 0 && !done ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={UI.settings[lang]}
          onClick={() => settings(true)}
          className="cursor-pointer rounded-md border-0 bg-transparent p-3 text-ink-2 transition-colors duration-200 hover:text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 6.5h14M3 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12.5" cy="6.5" r="1.75" fill="var(--color-card)" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="7.5" cy="13.5" r="1.75" fill="var(--color-card)" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </header>

      <PrayerCard />
      <SettingsSheet />
      {guideVisible && <Guide />}
    </main>
  )
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEQUENCE, mysterySetForDay, type Lang, type MysterySetId } from './data/rosary'
import { beadFeedback } from './lib/feedback'

interface RosaryState {
  /** index into SEQUENCE; SEQUENCE.length = rosary complete */
  step: number
  lang: Lang
  mysteryOverride: MysterySetId | 'auto'
  /** the 'auto' set is pinned when a rosary begins, so praying across
   *  midnight never switches mysteries mid-rosary */
  sessionSet: MysterySetId
  sound: boolean
  guideSeen: boolean
  guideOpen: boolean
  settingsOpen: boolean
  advance: () => void
  back: () => void
  reset: () => void
  setLang: (lang: Lang) => void
  setMysteryOverride: (set: MysterySetId | 'auto') => void
  toggleSound: () => void
  openGuide: (open: boolean) => void
  openSettings: (open: boolean) => void
}

export const useRosary = create<RosaryState>()(
  persist(
    (set, get) => ({
      step: 0,
      lang: 'en',
      mysteryOverride: 'auto',
      sessionSet: mysterySetForDay(new Date()),
      sound: false,
      guideSeen: false,
      guideOpen: false,
      settingsOpen: false,
      advance: () => {
        const { step, sound } = get()
        if (step >= SEQUENCE.length) return
        beadFeedback(sound)
        set(step === 0 ? { step: 1, sessionSet: mysterySetForDay(new Date()) } : { step: step + 1 })
      },
      back: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
      reset: () => set({ step: 0, sessionSet: mysterySetForDay(new Date()) }),
      setLang: (lang) => set({ lang }),
      setMysteryOverride: (mysteryOverride) => set({ mysteryOverride }),
      toggleSound: () => set((s) => ({ sound: !s.sound })),
      openGuide: (guideOpen) => set(guideOpen ? { guideOpen } : { guideOpen, guideSeen: true }),
      openSettings: (settingsOpen) => set({ settingsOpen }),
    }),
    {
      name: 'rosary',
      partialize: ({ step, lang, mysteryOverride, sessionSet, sound, guideSeen }) => ({
        step,
        lang,
        mysteryOverride,
        sessionSet,
        sound,
        guideSeen,
      }),
    },
  ),
)

/** True while the how-to-pray overlay should cover the app. */
export const useGuideVisible = () => useRosary((s) => s.guideOpen || !s.guideSeen)

export const useMysterySet = (): MysterySetId => {
  const override = useRosary((s) => s.mysteryOverride)
  const sessionSet = useRosary((s) => s.sessionSet)
  const started = useRosary((s) => s.step > 0)
  if (override !== 'auto') return override
  return started ? sessionSet : mysterySetForDay(new Date())
}

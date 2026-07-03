import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEQUENCE, mysterySetForDay, type Lang, type MysterySetId } from './data/rosary'
import { beadFeedback } from './lib/feedback'

interface RosaryState {
  /** index into SEQUENCE; SEQUENCE.length = rosary complete */
  step: number
  lang: Lang
  mysteryOverride: MysterySetId | 'auto'
  sound: boolean
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
      sound: false,
      guideOpen: true, // first visit; persisted false once dismissed
      settingsOpen: false,
      advance: () => {
        const { step, sound } = get()
        if (step >= SEQUENCE.length) return
        beadFeedback(sound)
        set({ step: step + 1 })
      },
      back: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
      reset: () => set({ step: 0 }),
      setLang: (lang) => set({ lang }),
      setMysteryOverride: (mysteryOverride) => set({ mysteryOverride }),
      toggleSound: () => set((s) => ({ sound: !s.sound })),
      openGuide: (guideOpen) => set({ guideOpen }),
      openSettings: (settingsOpen) => set({ settingsOpen }),
    }),
    {
      name: 'rosary',
      partialize: ({ step, lang, mysteryOverride, sound, guideOpen }) => ({
        step,
        lang,
        mysteryOverride,
        sound,
        guideOpen,
      }),
    },
  ),
)

export const useMysterySet = (): MysterySetId => {
  const override = useRosary((s) => s.mysteryOverride)
  return override === 'auto' ? mysterySetForDay(new Date()) : override
}

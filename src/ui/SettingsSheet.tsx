import type { Lang, MysterySetId } from '../data/rosary'
import { mysterySetForDay } from '../data/rosary'
import { UI } from '../data/texts'
import { useRosary } from '../store'

const SETS: (MysterySetId | 'auto')[] = ['auto', 'joyful', 'luminous', 'sorrowful', 'glorious']
const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
]

export function SettingsSheet() {
  const open = useRosary((s) => s.settingsOpen)
  return open ? <Sheet /> : null
}

function Sheet() {
  const s = useRosary()
  const close = () => s.openSettings(false)

  return (
    <div
      className="absolute inset-0 z-20 flex items-end justify-center bg-ink/20 md:items-center"
      onPointerDown={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) close()
      }}
      onPointerUp={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="rise w-full rounded-t-xl border border-ink/10 bg-card px-7 pt-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] md:w-[24rem] md:rounded-xl md:pb-7">
        <header className="flex items-baseline justify-between">
          <h2 className="caps m-0 text-base font-normal text-ink-2">{UI.settings[s.lang]}</h2>
          <button type="button" onClick={close} className="caps cursor-pointer border-0 bg-transparent p-1 text-sm text-ink-3 hover:text-ink">
            {UI.close[s.lang]}
          </button>
        </header>

        <Field label={UI.language[s.lang]}>
          {LANGS.map((l) => (
            <Chip key={l.id} active={s.lang === l.id} onClick={() => s.setLang(l.id)}>
              {l.label}
            </Chip>
          ))}
        </Field>

        <Field label={UI.mysteries[s.lang]}>
          {SETS.map((m) => (
            <Chip key={m} active={s.mysteryOverride === m} onClick={() => s.setMysteryOverride(m)}>
              {m === 'auto'
                ? `${UI.auto[s.lang]} · ${UI.setNames[mysterySetForDay(new Date())][s.lang]}`
                : UI.setNames[m][s.lang]}
            </Chip>
          ))}
        </Field>

        <Field label={UI.sound[s.lang]}>
          <Chip active={s.sound} onClick={() => !s.sound && s.toggleSound()}>
            {UI.on[s.lang]}
          </Chip>
          <Chip active={!s.sound} onClick={() => s.sound && s.toggleSound()}>
            {UI.off[s.lang]}
          </Chip>
        </Field>

        <div className="mt-7 flex items-center justify-between border-t border-ink/8 pt-5">
          <button
            type="button"
            onClick={() => {
              close()
              s.openGuide(true)
            }}
            className="caps cursor-pointer border-0 bg-transparent p-0 text-sm text-gold-deep hover:underline"
          >
            {UI.howToPray[s.lang]}
          </button>
          <button
            type="button"
            onClick={() => {
              s.reset()
              close()
            }}
            className="caps cursor-pointer border-0 bg-transparent p-0 text-sm text-ink-3 hover:text-ink"
          >
            {UI.startOver[s.lang]}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="caps mb-2 text-xs text-ink-3">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`caps cursor-pointer rounded-md border px-3.5 py-1.5 text-sm transition-colors duration-200 ${
        active
          ? 'border-gold-deep/60 bg-gold-deep/8 text-gold-deep'
          : 'border-ink/12 bg-transparent text-ink-2 hover:border-ink/25'
      }`}
    >
      {children}
    </button>
  )
}

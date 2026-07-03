import { SEQUENCE, type Step } from '../data/rosary'
import { announceTitle, MYSTERIES, PRAYERS, UI } from '../data/texts'
import { useMysterySet, useRosary } from '../store'
import { GoldButton } from './Button'

export function PrayerCard() {
  const step = useRosary((s) => s.step)
  const lang = useRosary((s) => s.lang)
  const reset = useRosary((s) => s.reset)
  const set = useMysterySet()

  const done = step >= SEQUENCE.length

  return (
    <section
      aria-live="polite"
      className="pointer-events-none absolute inset-x-3 bottom-3 pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:top-[24dvh] md:right-[4vw] md:bottom-auto md:w-[27rem]"
    >
      <div
        data-card
        onWheel={(e) => e.stopPropagation()}
        className="pointer-events-auto touch-pan-y rounded-xl border border-ink/10 bg-card/95 px-6 py-5 select-text md:px-9 md:py-8"
      >
        {done ? (
          <Complete lang={lang} onReset={reset} />
        ) : (
          <StepView key={step} step={SEQUENCE[step]} lang={lang} set={set} first={step === 0} />
        )}
      </div>
    </section>
  )
}

function StepView({
  step,
  lang,
  set,
  first,
}: {
  step: Step
  lang: 'en' | 'es'
  set: ReturnType<typeof useMysterySet>
  first: boolean
}) {
  const mystery = step.decade ? MYSTERIES[set].items[step.decade - 1] : null

  const context = step.decade
    ? announceTitle(set, step.decade - 1, lang)
    : step.prayer === 'hailHolyQueen' || step.prayer === 'closing'
      ? UI.closingLabel[lang]
      : UI.opening[lang]

  const { prayer } = step
  const isAnnounce = prayer === 'announce'
  const title = prayer === 'announce' ? mystery!.name[lang] : PRAYERS[prayer].title[lang]
  const text = prayer === 'announce' ? mystery!.meditation[lang] : PRAYERS[prayer].text[lang]

  return (
    <div className="rise">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="caps m-0 text-sm font-normal text-ink-2">{context}</h2>
        {step.count && (
          <span className="caps text-sm whitespace-nowrap text-ink-2">
            {step.count[0]} {UI.of[lang]} {step.count[1]}
          </span>
        )}
      </header>

      {step.count && (
        <div className="mt-2.5 flex gap-1.5" aria-hidden>
          {Array.from({ length: step.count[1] }, (_, i) => (
            <span
              key={i}
              className={`size-1.5 rounded-full transition-colors duration-500 ${
                i < step.count![0] - 1
                  ? 'bg-gold'
                  : i === step.count![0] - 1
                    ? 'bg-gold-deep'
                    : 'bg-ink/15'
              }`}
            />
          ))}
        </div>
      )}

      <h1 className={`mt-3 mb-0 text-xl font-medium ${isAnnounce ? '' : 'italic'}`}>{title}</h1>

      <div className="prayer-text mt-3 max-h-[38dvh] overflow-y-auto md:max-h-[58dvh]">
        {isAnnounce ? (
          <p className="prayer-line m-0 italic text-ink-2" style={{ '--line': 0 } as React.CSSProperties}>
            {text}
          </p>
        ) : (
          <PrayerLines text={text} />
        )}
      </div>

      {first && <p className="caps mt-5 mb-0 text-xs text-ink-3">{UI.tapHint[lang]}</p>}
    </div>
  )
}

function PrayerLines({ text }: { text: string }) {
  let line = 0
  return (
    <>
      {text.split('\n').map((l, i) =>
        l === '' ? (
          <div key={i} className="h-[0.7em]" />
        ) : (
          <p key={i} className="prayer-line m-0" style={{ '--line': line++ } as React.CSSProperties}>
            {l}
          </p>
        ),
      )}
    </>
  )
}

function Complete({ lang, onReset }: { lang: 'en' | 'es'; onReset: () => void }) {
  return (
    <div className="rise py-4 text-center">
      <p className="prayer-text m-0 italic">{UI.amen[lang]}</p>
      <p className="caps mt-3 mb-0 text-sm text-ink-2">{UI.complete[lang]}</p>
      <GoldButton onClick={onReset} className="mt-6">
        {UI.prayAgain[lang]}
      </GoldButton>
    </div>
  )
}

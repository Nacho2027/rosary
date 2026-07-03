import { UI } from '../data/texts'
import { useRosary } from '../store'
import { GoldButton } from './Button'

const STEPS = {
  en: [
    'On the crucifix, make the Sign of the Cross and pray the Apostles’ Creed.',
    'On the first bead, pray the Our Father.',
    'On the three beads, pray a Hail Mary for faith, hope, and charity.',
    'On the medal, pray the Glory Be.',
    'Announce the first mystery, then pray the Our Father on the large bead.',
    'Pray ten Hail Marys on the small beads while meditating on the mystery.',
    'After each decade, pray the Glory Be and the Fatima Prayer.',
    'Repeat for all five decades, then close with the Hail, Holy Queen.',
  ],
  es: [
    'En el crucifijo, haz la Señal de la Cruz y reza el Credo.',
    'En la primera cuenta, reza el Padrenuestro.',
    'En las tres cuentas, reza un Avemaría por la fe, la esperanza y la caridad.',
    'En la medalla, reza el Gloria.',
    'Anuncia el primer misterio y reza el Padrenuestro en la cuenta grande.',
    'Reza diez Avemarías en las cuentas pequeñas meditando el misterio.',
    'Después de cada decena, reza el Gloria y la Oración de Fátima.',
    'Repite las cinco decenas y concluye con la Salve.',
  ],
}

export function Guide() {
  const lang = useRosary((s) => s.lang)
  const close = useRosary((s) => s.openGuide)

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-parchment/70 p-5 backdrop-blur-[3px]"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="rise max-h-[85dvh] w-[30rem] max-w-full overflow-y-auto rounded-xl border border-ink/10 bg-card px-8 py-7 md:px-10">
        <h1 className="m-0 text-xl font-medium italic">{UI.guideTitle[lang]}</h1>
        <ol className="mt-4 mb-0 flex list-none flex-col gap-3 p-0">
          {STEPS[lang].map((step, i) => (
            <li key={i} className="flex gap-3.5 text-base leading-relaxed">
              <span className="caps mt-px shrink-0 text-sm text-gold-deep">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <GoldButton onClick={() => close(false)} className="mt-6 w-full">
          {UI.begin[lang]}
        </GoldButton>
      </div>
    </div>
  )
}

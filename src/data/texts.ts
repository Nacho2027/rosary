import type { Lang, MysterySetId, PrayerId } from './rosary'

/**
 * Prayer texts verified against the Vatican Compendium of the Catechism
 * (EN + ES Common Prayers) and USCCB rosary resources. English uses the
 * traditional thee/thou forms of common recitation.
 */

export type Localized = Record<Lang, string>

export interface PrayerText {
  title: Localized
  text: Localized
}

export const PRAYERS: Record<PrayerId, PrayerText> = {
  signOfCross: {
    title: { en: 'The Sign of the Cross', es: 'La Señal de la Cruz' },
    text: {
      en: 'In the name of the Father,\nand of the Son,\nand of the Holy Spirit.\nAmen.',
      es: 'En el nombre del Padre,\ny del Hijo,\ny del Espíritu Santo.\nAmén.',
    },
  },
  creed: {
    title: { en: "The Apostles' Creed", es: 'El Credo de los Apóstoles' },
    text: {
      en: 'I believe in God,\nthe Father almighty,\nCreator of heaven and earth,\nand in Jesus Christ, his only Son, our Lord,\nwho was conceived by the Holy Spirit,\nborn of the Virgin Mary,\nsuffered under Pontius Pilate,\nwas crucified, died and was buried;\nhe descended into hell;\non the third day he rose again from the dead;\nhe ascended into heaven,\nand is seated at the right hand of God the Father almighty;\nfrom there he will come to judge the living and the dead.\n\nI believe in the Holy Spirit,\nthe holy catholic Church,\nthe communion of saints,\nthe forgiveness of sins,\nthe resurrection of the body,\nand life everlasting.\nAmen.',
      es: 'Creo en Dios, Padre todopoderoso,\nCreador del cielo y de la tierra.\n\nCreo en Jesucristo, su único Hijo, nuestro Señor,\nque fue concebido por obra y gracia del Espíritu Santo,\nnació de Santa María Virgen,\npadeció bajo el poder de Poncio Pilato,\nfue crucificado, muerto y sepultado,\ndescendió a los infiernos,\nal tercer día resucitó de entre los muertos,\nsubió a los cielos\ny está sentado a la derecha de Dios, Padre todopoderoso.\nDesde allí ha de venir a juzgar a vivos y muertos.\n\nCreo en el Espíritu Santo,\nla santa Iglesia católica,\nla comunión de los santos,\nel perdón de los pecados,\nla resurrección de la carne\ny la vida eterna.\nAmén.',
    },
  },
  ourFather: {
    title: { en: 'The Our Father', es: 'El Padrenuestro' },
    text: {
      en: 'Our Father, who art in heaven,\nhallowed be thy name;\nthy kingdom come;\nthy will be done on earth as it is in heaven.\n\nGive us this day our daily bread;\nand forgive us our trespasses\nas we forgive those who trespass against us;\nand lead us not into temptation,\nbut deliver us from evil.\nAmen.',
      es: 'Padre nuestro, que estás en el cielo,\nsantificado sea tu Nombre;\nvenga a nosotros tu Reino;\nhágase tu voluntad\nen la tierra como en el cielo.\n\nDanos hoy nuestro pan de cada día;\nperdona nuestras ofensas,\ncomo también nosotros perdonamos\na los que nos ofenden;\nno nos dejes caer en la tentación,\ny líbranos del mal.\nAmén.',
    },
  },
  hailMary: {
    title: { en: 'The Hail Mary', es: 'El Avemaría' },
    text: {
      en: 'Hail Mary, full of grace,\nthe Lord is with thee;\nblessed art thou among women,\nand blessed is the fruit of thy womb, Jesus.\n\nHoly Mary, Mother of God,\npray for us sinners,\nnow and at the hour of our death.\nAmen.',
      es: 'Dios te salve, María,\nllena eres de gracia;\nel Señor es contigo.\nBendita tú eres entre todas las mujeres,\ny bendito es el fruto de tu vientre, Jesús.\n\nSanta María, Madre de Dios,\nruega por nosotros, pecadores,\nahora y en la hora de nuestra muerte.\nAmén.',
    },
  },
  gloryBe: {
    title: { en: 'The Glory Be', es: 'El Gloria' },
    text: {
      en: 'Glory be to the Father,\nand to the Son,\nand to the Holy Spirit;\nas it was in the beginning,\nis now, and ever shall be,\nworld without end.\nAmen.',
      es: 'Gloria al Padre,\ny al Hijo,\ny al Espíritu Santo.\nComo era en el principio,\nahora y siempre,\npor los siglos de los siglos.\nAmén.',
    },
  },
  fatima: {
    title: { en: 'The Fatima Prayer', es: 'Oración de Fátima' },
    text: {
      en: 'O my Jesus, forgive us our sins,\nsave us from the fires of hell;\nlead all souls to Heaven,\nespecially those in most need of thy mercy.\nAmen.',
      es: 'Oh Jesús mío, perdona nuestros pecados,\nlíbranos del fuego del infierno\ny conduce a todas las almas al cielo,\nespecialmente a las más necesitadas\nde tu misericordia.\nAmén.',
    },
  },
  hailHolyQueen: {
    title: { en: 'Hail, Holy Queen', es: 'La Salve' },
    text: {
      en: 'Hail, holy Queen, Mother of mercy,\nour life, our sweetness and our hope.\nTo thee do we cry,\npoor banished children of Eve;\nto thee do we send up our sighs,\nmourning and weeping in this valley of tears.\nTurn then, most gracious advocate,\nthine eyes of mercy toward us;\nand after this our exile,\nshow unto us the blessed fruit of thy womb, Jesus.\nO clement, O loving, O sweet Virgin Mary.\n\nV. Pray for us, O holy Mother of God.\nR. That we may be made worthy\nof the promises of Christ.',
      es: 'Dios te salve, Reina y Madre de misericordia,\nvida, dulzura y esperanza nuestra;\nDios te salve.\nA ti llamamos los desterrados hijos de Eva;\na ti suspiramos, gimiendo y llorando,\nen este valle de lágrimas.\nEa, pues, Señora, abogada nuestra,\nvuelve a nosotros esos tus ojos misericordiosos;\ny después de este destierro,\nmuéstranos a Jesús,\nfruto bendito de tu vientre.\n¡Oh clementísima, oh piadosa,\noh dulce Virgen María!\n\nV. Ruega por nosotros, santa Madre de Dios.\nR. Para que seamos dignos de alcanzar\nlas promesas de nuestro Señor Jesucristo.',
    },
  },
  closing: {
    title: { en: 'Closing Prayer', es: 'Oración final' },
    text: {
      en: 'Let us pray.\n\nO God, whose only begotten Son,\nby his life, death, and resurrection,\nhas purchased for us\nthe rewards of eternal life:\ngrant, we beseech thee,\nthat while meditating on these mysteries\nof the most holy Rosary of the Blessed Virgin Mary,\nwe may imitate what they contain\nand obtain what they promise,\nthrough the same Christ our Lord.\nAmen.',
      es: 'Oremos.\n\nOh Dios, cuyo Hijo unigénito,\npor su vida, muerte y resurrección,\nha alcanzado para nosotros\nlos méritos de la vida eterna:\nconcédenos, te rogamos,\nque meditando estos misterios\ndel santo Rosario de la Santísima Virgen María,\npodamos imitar lo que contienen\ny obtener lo que prometen.\nPor el mismo Cristo nuestro Señor.\nAmén.',
    },
  },
}

export interface MysterySet {
  name: Localized
  /** for announcements: "Joyful" · "gozoso" */
  adjective: Localized
  items: { name: Localized; meditation: Localized }[]
}

export const MYSTERIES: Record<MysterySetId, MysterySet> = {
  joyful: {
    name: { en: 'The Joyful Mysteries', es: 'Los Misterios Gozosos' },
    adjective: { en: 'Joyful', es: 'gozoso' },
    items: [
      {
        name: { en: 'The Annunciation', es: 'La Anunciación' },
        meditation: {
          en: 'The angel Gabriel brings word to Mary, and she says yes.',
          es: 'El ángel Gabriel trae el anuncio a María, y ella dice sí.',
        },
      },
      {
        name: { en: 'The Visitation', es: 'La Visitación' },
        meditation: {
          en: 'Mary hastens to her cousin Elizabeth, carrying Christ within her.',
          es: 'María va de prisa a ver a su prima Isabel, llevando a Cristo en su seno.',
        },
      },
      {
        name: { en: 'The Nativity', es: 'El Nacimiento de Jesús' },
        meditation: {
          en: 'In the poverty of Bethlehem, the Savior of the world is born.',
          es: 'En la pobreza de Belén nace el Salvador del mundo.',
        },
      },
      {
        name: { en: 'The Presentation in the Temple', es: 'La Presentación del Niño Jesús en el Templo' },
        meditation: {
          en: 'Mary and Joseph offer the infant Jesus to God in the Temple.',
          es: 'María y José presentan al Niño Jesús a Dios en el Templo.',
        },
      },
      {
        name: { en: 'The Finding in the Temple', es: 'El Niño Jesús perdido y hallado en el Templo' },
        meditation: {
          en: "After three days of searching, Mary and Joseph find Jesus in his Father's house.",
          es: 'Tras tres días de búsqueda, María y José hallan a Jesús en la casa de su Padre.',
        },
      },
    ],
  },
  luminous: {
    name: { en: 'The Luminous Mysteries', es: 'Los Misterios Luminosos' },
    adjective: { en: 'Luminous', es: 'luminoso' },
    items: [
      {
        name: { en: 'The Baptism of Christ in the Jordan', es: 'El Bautismo de Jesús en el Jordán' },
        meditation: {
          en: 'The heavens open, and the Father declares Jesus his beloved Son.',
          es: 'Los cielos se abren y el Padre proclama a Jesús como su Hijo amado.',
        },
      },
      {
        name: { en: 'The Wedding Feast at Cana', es: 'Las bodas de Caná' },
        meditation: {
          en: "At Mary's word, Jesus turns water into wine, his first sign.",
          es: 'Por intercesión de María, Jesús convierte el agua en vino, su primer signo.',
        },
      },
      {
        name: { en: 'The Proclamation of the Kingdom of God', es: 'El anuncio del Reino de Dios' },
        meditation: {
          en: 'Jesus preaches the Good News and calls everyone to conversion.',
          es: 'Jesús predica la Buena Nueva y llama a todos a la conversión.',
        },
      },
      {
        name: { en: 'The Transfiguration', es: 'La Transfiguración' },
        meditation: {
          en: 'On the mountain, the glory of God shines through the face of Christ.',
          es: 'En el monte, la gloria de Dios resplandece en el rostro de Cristo.',
        },
      },
      {
        name: { en: 'The Institution of the Eucharist', es: 'La institución de la Eucaristía' },
        meditation: {
          en: 'At the Last Supper, Jesus gives himself to us in bread and wine.',
          es: 'En la Última Cena, Jesús se nos entrega en el pan y el vino.',
        },
      },
    ],
  },
  sorrowful: {
    name: { en: 'The Sorrowful Mysteries', es: 'Los Misterios Dolorosos' },
    adjective: { en: 'Sorrowful', es: 'doloroso' },
    items: [
      {
        name: { en: 'The Agony in the Garden', es: 'La Oración de Jesús en el Huerto' },
        meditation: {
          en: "In Gethsemane, Jesus sweats blood and surrenders to the Father's will.",
          es: 'En Getsemaní, Jesús suda sangre y se abandona a la voluntad del Padre.',
        },
      },
      {
        name: { en: 'The Scourging at the Pillar', es: 'La Flagelación del Señor' },
        meditation: {
          en: 'Bound to a pillar, Jesus bears the lashes for our sins.',
          es: 'Atado a la columna, Jesús sufre los azotes por nuestros pecados.',
        },
      },
      {
        name: { en: 'The Crowning with Thorns', es: 'La Coronación de espinas' },
        meditation: {
          en: 'Mocked as a king, Jesus is crowned with thorns.',
          es: 'Burlado como rey, Jesús es coronado de espinas.',
        },
      },
      {
        name: { en: 'The Carrying of the Cross', es: 'Jesús con la Cruz a cuestas' },
        meditation: {
          en: 'Jesus shoulders the cross and walks the road to Calvary.',
          es: 'Jesús carga la cruz y recorre el camino al Calvario.',
        },
      },
      {
        name: { en: 'The Crucifixion and Death', es: 'La Crucifixión y Muerte de Jesús' },
        meditation: {
          en: 'Jesus stretches out his arms on the cross and gives his life for us.',
          es: 'Jesús extiende los brazos en la cruz y entrega su vida por nosotros.',
        },
      },
    ],
  },
  glorious: {
    name: { en: 'The Glorious Mysteries', es: 'Los Misterios Gloriosos' },
    adjective: { en: 'Glorious', es: 'glorioso' },
    items: [
      {
        name: { en: 'The Resurrection', es: 'La Resurrección' },
        meditation: {
          en: 'The tomb is empty; Christ is risen, victorious over death.',
          es: 'El sepulcro está vacío; Cristo ha resucitado, vencedor de la muerte.',
        },
      },
      {
        name: { en: 'The Ascension', es: 'La Ascensión del Señor' },
        meditation: {
          en: 'Jesus ascends to heaven to prepare a place for us.',
          es: 'Jesús sube al cielo para prepararnos un lugar.',
        },
      },
      {
        name: { en: 'The Descent of the Holy Spirit', es: 'La Venida del Espíritu Santo' },
        meditation: {
          en: 'Tongues of fire descend, and the Church is born at Pentecost.',
          es: 'Descienden lenguas de fuego y nace la Iglesia en Pentecostés.',
        },
      },
      {
        name: { en: 'The Assumption', es: 'La Asunción de María' },
        meditation: {
          en: 'Mary is taken up, body and soul, into the glory of heaven.',
          es: 'María es llevada en cuerpo y alma a la gloria del cielo.',
        },
      },
      {
        name: { en: 'The Coronation of Mary', es: 'La Coronación de María como Reina del Cielo' },
        meditation: {
          en: 'Mary is crowned Queen of heaven and earth.',
          es: 'María es coronada Reina del cielo y de la tierra.',
        },
      },
    ],
  },
}

const ORDINALS: Record<Lang, string[]> = {
  en: ['First', 'Second', 'Third', 'Fourth', 'Fifth'],
  es: ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto'],
}

/** "The Second Sorrowful Mystery" · "Segundo misterio doloroso" */
export function announceTitle(set: MysterySetId, index: number, lang: Lang): string {
  const adjective = MYSTERIES[set].adjective[lang]
  return lang === 'en'
    ? `The ${ORDINALS.en[index]} ${adjective} Mystery`
    : `${ORDINALS.es[index]} misterio ${adjective}`
}

/** Interface strings. */
export const UI = {
  back: { en: 'Back', es: 'Atrás' },
  settings: { en: 'Settings', es: 'Ajustes' },
  language: { en: 'Language', es: 'Idioma' },
  mysteries: { en: 'Mysteries', es: 'Misterios' },
  auto: { en: 'By day', es: 'Según el día' },
  sound: { en: 'Sound', es: 'Sonido' },
  on: { en: 'On', es: 'Sí' },
  off: { en: 'Off', es: 'No' },
  howToPray: { en: 'How to pray', es: 'Cómo se reza' },
  startOver: { en: 'Start over', es: 'Comenzar de nuevo' },
  tapHint: { en: 'Tap anywhere to continue', es: 'Toca en cualquier lugar para continuar' },
  opening: { en: 'Opening', es: 'Apertura' },
  closingLabel: { en: 'Closing', es: 'Conclusión' },
  of: { en: 'of', es: 'de' },
  amen: { en: 'Amen.', es: 'Amén.' },
  complete: { en: 'The rosary is complete.', es: 'El rosario está completo.' },
  prayAgain: { en: 'Pray again', es: 'Rezar de nuevo' },
  begin: { en: 'Begin', es: 'Comenzar' },
  guideTitle: { en: 'How to pray the rosary', es: 'Cómo se reza el rosario' },
  close: { en: 'Close', es: 'Cerrar' },
  setNames: {
    joyful: { en: 'Joyful', es: 'Gozosos' },
    luminous: { en: 'Luminous', es: 'Luminosos' },
    sorrowful: { en: 'Sorrowful', es: 'Dolorosos' },
    glorious: { en: 'Glorious', es: 'Gloriosos' },
  },
} as const

# Rosary

A rosary you can hold. This is an interactive 3D rosary for the web that keeps your
place while you pray. It covers the full traditional rosary, bead by bead, in English
and Spanish.

**[Pray at nacho2027.github.io/rosary](https://nacho2027.github.io/rosary/)**

<p align="center">
  <img src="docs/phone.png" width="280" alt="The rosary hanging in portrait, with the opening prayer card" />
  &nbsp;&nbsp;
  <img src="docs/detail.png" width="500" alt="Close-up of the pearl beads, gold medal, and crucifix" />
</p>

## How it works

- Tap anywhere (or press <kbd>Space</kbd> / <kbd>→</kbd>) to move to the next prayer.
  The current bead is held at your fingertips inside a gold ring. Beads you have
  prayed take on a gilt tint, and the garnet beads are the Our Fathers.
- Drag the rosary to swing it. The chain hangs on real physics, so it drapes,
  swings, and settles like the real thing.
- Pinch or scroll to zoom, from the whole loop down to a single bead.
- <kbd>←</kbd> or the back arrow corrects a missed tap.
- Your place is saved locally. Close the tab mid-decade and you resume on the
  same Hail Mary.
- The mysteries follow the day of the week (Luminous on Thursday, Sorrowful on
  Friday, and so on), and you can override them in settings.

## The full rosary

Sign of the Cross, Apostles' Creed, opening Our Father, three Hail Marys, Glory Be.
Then five decades, each with its mystery announcement and a one-line meditation,
an Our Father, ten Hail Marys, a Glory Be, and the Fatima Prayer. It closes with
the Hail, Holy Queen and the final prayer. The prayer texts were checked against
the Vatican's Compendium (English and Spanish) and USCCB rosary resources.

## Craft notes

The design leans on book typography instead of app conventions. Prayers are set in
EB Garamond, a revival of the 1592 Egenolff-Berner specimens, with real small caps
and old-style figures. The palette is parchment and ink built in OKLCH, with gold
as the only accent. The prayer text brightens line by line, like candlelight moving
down a page.

The rosary itself is a Verlet rope of about 120 particles, drawn as instanced
meshes: one draw call for all 59 beads, one for the wire pins, one for the
interlocking eye-pin loops between them. The hardware follows how strung rosaries
are actually made, with fixed lugs on the centerpiece and the crucifix ring. There
are no downloaded 3D assets and no loading screen; the whole site is about 330 KB
gzipped, and it honors `prefers-reduced-motion`.

## Development

```sh
npm install
npm run dev      # local dev server
npm test         # sequence-engine + physics tests (vitest)
npm run build    # production build to dist/
```

Built with React 19, TypeScript, Vite, react-three-fiber, zustand, and Tailwind CSS v4.

```
src/
  data/      the rosary domain: beads, praying sequence, verified prayer texts
  three/     verlet physics, the 3D rosary, camera rig, gesture bridge
  ui/        prayer card, settings, how-to-pray guide
  store.ts   prayer position + preferences (persisted)
```

## License

[MIT](LICENSE). The prayer texts are traditional and in the public domain.

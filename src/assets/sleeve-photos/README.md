# Sleeve photos for albums with no artwork

The photographs behind the sleeve an album gets when its files carry no artwork
(`src/lib/madeSleeves.ts`; James, 2026-11-05). Deliberately NOT the example
library's photos (`../example-covers/`), so an untagged album of yours never
wears a demo record's sleeve.

Every one is **CC0 1.0** (public domain dedication) on Wikimedia Commons: free
to use, change and ship, with no attribution required. The photographers are
named here anyway. Each was cropped square, resized to 720 × 720 and
re-encoded with no EXIF or location data. Nobody in them can be recognised
(the shoreline and the trail have distant figures only); keep it that way when
a photo is swapped, since CC0 covers the photograph, not a model release.

Adding or removing a file needs no code change: `madeSleeves.ts` reads this
folder with `import.meta.glob`. Albums keep the photo they were given (stored
on the device by file name), so RENAMING a file re-dresses the albums that
wore it.

| File | Photo | Photographer | Source |
|---|---|---|---|
| `mirror-lake.jpg` | Clouds mirrored in a mountain lake | Ales Krivec | https://commons.wikimedia.org/w/index.php?curid=61699929 |
| `waterfall.jpg` | A waterfall in a wood | Jeffrey Workman | https://commons.wikimedia.org/w/index.php?curid=61824298 |
| `milky-way-lake.jpg` | The Milky Way over a mountain lake | Andrew Coelho | https://commons.wikimedia.org/w/index.php?curid=61854117 |
| `desert-palms-night.jpg` | The Milky Way over palms in the desert | Frank-2.0 | https://commons.wikimedia.org/w/index.php?curid=121305556 |
| `northern-lights.jpg` | Northern lights over pines | Nelly Volkovich | https://commons.wikimedia.org/w/index.php?curid=61650029 |
| `autumn-stream.jpg` | Autumn leaves by a stream | Free Nature Stock | https://commons.wikimedia.org/w/index.php?curid=117613581 |
| `cinema-seats.jpg` | Empty cinema seats | Elijah Flores | https://commons.wikimedia.org/w/index.php?curid=62124971 |
| `snowy-forest.jpg` | A snowy forest in Austria | Emily Morter | https://commons.wikimedia.org/w/index.php?curid=62223388 |
| `shoreline.jpg` | Waves on a beach, from above | Caleb Jones | https://commons.wikimedia.org/w/index.php?curid=61671723 |
| `autumn-branch.jpg` | A branch with autumn leaves | iurie.ph | https://commons.wikimedia.org/w/index.php?curid=128494682 |
| `bokeh-lights.jpg` | Lights through raindrops | W.carter | https://commons.wikimedia.org/w/index.php?curid=88058974 |
| `rain-window.jpg` | Rain on a window | Francesco Gallarotti | https://commons.wikimedia.org/w/index.php?curid=61740777 |
| `spring-meadow.jpg` | A meadow of spring flowers | Thomas Cigolla | https://commons.wikimedia.org/w/index.php?curid=61694644 |
| `desert-road.jpg` | A dirt road across the desert | Z3lvs | https://commons.wikimedia.org/w/index.php?curid=202056744 |
| `sand-dunes.jpg` | Great Sand Dunes and mountains | Mshuang2 | https://commons.wikimedia.org/w/index.php?curid=99767607 |
| `palm-sunset.jpg` | A cloudy sunset over palm trees | Luca Bravo | https://commons.wikimedia.org/w/index.php?curid=61884769 |
| `tropical-dusk.jpg` | Palms at dusk, Bali | Artem Beliaikin | https://commons.wikimedia.org/w/index.php?curid=105177034 |
| `mountain-trail.jpg` | Bierstadt Lake Trail, Rocky Mountains | DimiTalen | https://commons.wikimedia.org/w/index.php?curid=156982403 |
| `gramophone.jpg` | A Berliner record player in a museum | DiscoA340 | https://commons.wikimedia.org/w/index.php?curid=119117140 |
| `starfield.jpg` | The Milky Way above trees | Adam Mescher | https://commons.wikimedia.org/w/index.php?curid=61918080 |

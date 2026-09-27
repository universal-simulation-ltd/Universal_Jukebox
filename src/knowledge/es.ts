import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'audio-formats',
    title: 'Formatos de audio, y por qué algunas canciones no se reproducen',
    summary: 'MP3, FLAC, WAV y los demás, y qué impide que un archivo se reproduzca.',
    group: 'Lo básico',
    body: `Un archivo de música es sonido grabado, guardado como números y empaquetado de una manera concreta. Esa manera se llama formato, y las letras al final del nombre del archivo suelen indicar cuál es: .mp3, .m4a, .flac, etc.

## Dos familias de formatos

- Los formatos **con pérdida**, como MP3 y AAC (normalmente en archivos .m4a), hacen que los archivos ocupen mucho menos al eliminar detalles que la mayoría de los oyentes difícilmente notará. Casi toda la música comprada o extraída de CD en los últimos veinte años está en uno de ellos.
- Los formatos **sin pérdida**, como FLAC, WAV y AIFF, conservan todos los detalles de la grabación original. Los archivos ocupan más, pero no se ha descartado nada.

## Qué reproduce Universal Jukebox

Universal Jukebox reproduce MP3, M4A y AAC, FLAC, WAV y AIFF. Los archivos Ogg y Opus también se reproducen cuando su dispositivo los admite, algo que ocurre en la mayoría, aunque no en todos.

La aplicación no tiene decodificadores propios: se apoya en la reproducción de audio integrada en su dispositivo. Por eso la lista anterior puede variar ligeramente de un dispositivo a otro.

## Por qué una canción puede no reproducirse

- **Está protegida contra copia.** Las pistas vendidas con protección (por ejemplo, antiguas compras de iTunes con la extensión .m4p) y las canciones descargadas mediante una suscripción de streaming solo pueden reproducirse en la aplicación de la tienda o del servicio. Ningún otro reproductor puede abrirlas.
- **Nada en su dispositivo puede decodificarla.** Los archivos Windows Media Audio (.wma), Monkey’s Audio (.ape) y WavPack (.wv) no se pueden reproducir. Universal Converter puede convertir los archivos WMA y APE a formatos que esta aplicación reproduce, en su propio dispositivo.
- **Es un audiolibro.** El formato de audiolibro .m4b no se reproduce.
- **No es una grabación.** Un archivo MIDI (.mid) contiene instrucciones —qué notas tocar y cuándo— en lugar de sonido grabado, así que no hay nada que escuchar.
- **El archivo está dañado**, por ejemplo, una descarga que se interrumpió a medias.

## Ver el motivo

De forma predeterminada, las canciones que no se pueden reproducir se omiten sin avisar. Si prefiere saber por qué, marque **Show error messages** en Settings, apartado Messages, y la aplicación indicará cada archivo que no pudo reproducir y qué le ocurría.`,
  },
  {
    id: 'tags-and-artwork',
    title: 'Etiquetas y carátulas: de dónde sale su biblioteca',
    summary: 'Cómo sabe la aplicación el artista, el álbum y la carátula de cada canción.',
    group: 'Lo básico',
    body: `Universal Jukebox no busca su música en ningún sitio. Todo lo que ve en la biblioteca —títulos, artistas, álbumes, números de pista, años, géneros y carátulas— se lee de sus propios archivos.

## Qué son las etiquetas

La mayoría de los archivos de música llevan dentro una pequeña ficha, llamada etiquetas. Las etiquetas contienen datos sobre la grabación: el título de la canción, el artista, el álbum, el número de pista y de disco, el año, el género y, a menudo, una imagen de la carátula. Las escribe lo que creó el archivo: la tienda donde lo compró, el programa que extrajo el CD o un editor de etiquetas.

La aplicación lee los tipos de etiquetas habituales en archivos MP3, M4A, FLAC y Ogg. El análisis lee solo la parte de cada archivo donde se guardan las etiquetas, no la canción entera, así que incluso una biblioteca grande se analiza rápido.

## Cuando las etiquetas faltan o son incorrectas

- **Un archivo sin etiquetas** se muestra con su nombre de archivo, sin el número de pista que pueda llevar al principio. La aplicación no adivina el artista a partir del nombre del archivo, porque una suposición equivocada es peor que un campo vacío.
- **Un álbum partido en dos** suele indicar que sus pistas se etiquetaron de forma incoherente; por ejemplo, con el nombre del artista escrito de dos maneras.
- **Una carátula que falta** puede deberse a que la imagen nunca se guardó en los archivos, o a que se guardó en una pista posterior en lugar de en la primera.

## Poner orden

**Tidy up library**, en Settings, apartado Your library, busca dos cosas: carátulas que ya están en su dispositivo pero no se usaron (una imagen con nombre de carátula, como cover.jpg, junto a las pistas, o una imagen guardada en una pista posterior) y álbumes que unas etiquetas incoherentes han partido en dos. Le muestra cada sugerencia, con la imagen que usaría, y nada cambia hasta que usted pulse el botón.

Rechaza a propósito todo aquello de lo que no pueda estar seguro. Dos álbumes con el mismo nombre en carpetas distintas, o una carpeta con dos álbumes diferentes, se dejan como están.

## Sus archivos nunca se modifican

Poner orden corrige solo la biblioteca dentro de la aplicación. No reescribe etiquetas, no cambia nombres de archivos ni mueve nada, y sus correcciones se vuelven a aplicar automáticamente tras un nuevo análisis.`,
  },
  {
    id: 'where-your-music-lives',
    title: 'Dónde está su música',
    summary: 'Carpetas, teléfonos y nuevos análisis, y por qué un navegador puede volver a pedir permiso.',
    group: 'Cómo funciona',
    body: `Universal Jukebox no es un servicio de streaming y no tiene música propia. Reproduce archivos que ya están en su dispositivo, o en una unidad a la que su dispositivo puede acceder. La aplicación nunca los sube, los mueve ni los modifica.

## Añadir música

Abra el menú y elija **Your complete library**. Desde ahí puede añadir una carpeta, volver a analizar o quitar una carpeta. Añadir una carpeta amplía su biblioteca en lugar de sustituirla, y quitar una elimina solo las canciones de esa carpeta. El funcionamiento de las carpetas depende de dónde use la aplicación:

- **Chrome y Edge** pueden recordar la carpeta que eligió. Al volver, puede que se le pida confirmar el acceso una vez, con un solo toque.
- **Firefox y Safari** no pueden conservar el permiso para leer una carpeta entre visitas, así que tendrá que elegir la carpeta cada vez. Su biblioteca, sus carátulas y sus ajustes se siguen recordando, de modo que no hay que volver a leer nada.
- **La aplicación para iPhone** tiene su propia carpeta, llamada Universal Jukebox, en la app Archivos. Todo lo que copie, envíe por AirDrop o guarde en ella pasa a formar parte de su biblioteca. También puede añadir otras carpetas y reproducir las canciones de la biblioteca de Música del iPhone que estén guardadas en el teléfono, como las sincronizadas desde un ordenador.
- **La aplicación para Android** le pide que elija cada carpeta una vez en el selector del sistema, y Android recuerda el permiso.

## Volver a analizar

La aplicación no detecta por sí sola cuándo aparecen o desaparecen archivos. Después de añadir o borrar música fuera de la aplicación, elija **Rescan**. Un nuevo análisis incorpora las canciones nuevas, quita las que ya no están y conserva las correcciones que haya hecho al poner orden.

## Canciones de la biblioteca de Música del iPhone

Se pueden reproducir las canciones sincronizadas con el iPhone desde un ordenador. La primera vez que suena una, la aplicación crea una copia de trabajo en un espacio limitado del teléfono. Las canciones descargadas con una suscripción a Apple Music, y las que están en iCloud pero no en el teléfono, no puede reproducirlas ninguna otra aplicación; la aplicación le indica cuántas ha tenido que dejar fuera.

## Qué guarda la aplicación

La aplicación guarda en su dispositivo un catálogo de su biblioteca —títulos, artistas, álbumes y copias pequeñas de las carátulas— para abrirse rápido la próxima vez. Ese catálogo no se copia en ningún sitio ni se comparte entre dispositivos: cada dispositivo crea el suyo. Borrar los datos de este sitio en un navegador borra el catálogo, pero nunca su música.`,
  },
  {
    id: 'between-songs',
    title: 'Fundidos encadenados, fundidos y pausas entre canciones',
    summary: 'Qué significan fundido encadenado y reproducción sin pausas, y qué ocurre entre pistas.',
    group: 'Cómo funciona',
    body: `Lo que ocurre en el segundo o dos que hay entre canciones cambia sorprendentemente la forma en que se vive un álbum. Conviene conocer algunos términos.

## Los términos

- **Una pausa** es el silencio que un reproductor puede dejar entre dos pistas. En la mayoría de los álbumes pasa desapercibida, pero en un disco en directo o una mezcla continua rompe la música.
- **La reproducción sin pausas** (gapless) consiste en pasar de una pista a la siguiente sin añadir silencio, tal como el álbum se concibió para escucharse.
- **Un fundido encadenado** (crossfade) superpone el final de una canción con el principio de la siguiente: la primera baja mientras la segunda sube, de modo que nunca hay silencio.
- **Un fundido de entrada o de salida** hace que una canción suba desde el silencio al empezar, o baje hasta el silencio al terminar.

## Qué hace Universal Jukebox

**Las canciones de un mismo álbum** se enlazan directamente con un fundido encadenado corto y suave. La canción que llega solo sube a medida que baja la que se va, así que la unión es fluida y no suenan dos canciones fuertes a la vez.

**Cuando la siguiente canción es de otro disco**, las dos también se funden de forma predeterminada, mientras en la imagen un reproductor sale deslizándose y entra el siguiente. Si prefiere un corte limpio, marque **No crossfade between records** en Settings: la aguja se levanta, hay un momento de silencio y cae sobre el siguiente disco.

**Fade in** y **Fade out**, en Settings, apartado Sound, añaden un fundido de hasta ocho segundos al principio o al final de cada pista, incluida la última canción de un álbum. Ambos están desactivados hasta que usted los ajuste. En un dispositivo que no permite a la aplicación controlar el volumen, los fundidos no están disponibles, y Settings lo indica.

## La animación es independiente

La animación de cambio de disco, y la frecuencia con que aparece, afecta a la imagen y a su efecto de sonido, no a la música. Desactivar la animación no añade pausas: las canciones de un mismo álbum siguen enlazándose.`,
  },
  {
    id: 'lyrics',
    title: 'Letras: de dónde salen las palabras',
    summary: 'Primero las letras guardadas en sus archivos, y una búsqueda en línea opcional.',
    group: 'Cómo funciona',
    body: `Pulse **Lyrics** en Now Playing para ver la letra de la canción que está sonando. Puede venir de dos sitios, siempre en este orden.

## 1. Su propio archivo

Muchos archivos de música llevan la letra dentro de sus etiquetas, puesta ahí por la tienda, un programa de extracción o un editor de etiquetas. La aplicación mira ahí primero. Esto funciona sin conexión a Internet y, como se trata de su propio archivo, siempre tiene preferencia sobre lo que se encuentre en línea.

La aplicación lee las letras guardadas dentro del archivo de música. No lee archivos de letras independientes guardados junto a una canción.

## 2. Una búsqueda en línea, solo si la activa

Si una canción no tiene letra propia, la aplicación puede consultar lrclib.net, una colección de letras gratuita mantenida por una comunidad. Esta opción está **desactivada** hasta que marque **Look up missing lyrics online** en Settings, apartado Lyrics.

Cuando está activada, buscar una canción envía solo su artista, título, álbum y duración, directamente desde su dispositivo a lrclib.net. No se envía nada más sobre usted, su dispositivo o su biblioteca, y la solicitud no pasa por UNI·SIM. La respuesta se guarda en su dispositivo, de modo que cada canción se consulta una sola vez. Si no se encontró letra, la aplicación puede volver a intentarlo al cabo de unos días. Settings muestra cuántas canciones se han consultado, con un botón para olvidarlas todas.

Como la colección la escriben voluntarios, alguna letra puede ser inexacta o ir algo desfasada.

## Letras que siguen la música

Algunas letras incluyen una marca de tiempo al principio de cada línea. Se llaman letras sincronizadas y suelen estar en un formato llamado LRC. Con ellas, el panel de letras sigue la canción mientras suena, y al tocar una línea se salta a ese momento de la canción. Las letras sin marcas de tiempo se muestran como texto normal.

Las letras sincronizadas permiten además dos opciones, ambas en Settings, apartado Lyrics: **Lyrics around the record**, que escribe las palabras alrededor del disco que gira a medida que se cantan, y **Lyrics on the lock screen**, que muestra la línea que se está cantando en los controles de música del teléfono.`,
  },
  {
    id: 'playing-in-the-background',
    title: 'Escuchar con la pantalla apagada',
    summary: 'Reproducción en segundo plano, controles en la pantalla bloqueada, temporizador y más.',
    group: 'Cómo funciona',
    body: `Un reproductor de música tiene que seguir sonando cuando se guarda el teléfono en el bolsillo. Así se comporta Universal Jukebox cuando no está en pantalla.

## En un teléfono

- **iPhone:** la aplicación sigue sonando cuando bloquea el teléfono o cambia a otra aplicación. La canción, el artista y la carátula aparecen en la pantalla bloqueada y en el Centro de control, con reproducir, pausa y saltar.
- **Android:** mientras suena la música, la aplicación muestra una notificación de reproducción con los mismos controles, que es lo que permite a Android mantenerla en marcha con la pantalla apagada. Permanece hasta que termina la cola o hasta que usted cierra la aplicación deslizándola. Los botones de los auriculares y de los dispositivos Bluetooth también funcionan.

La aplicación no se adueña del audio del teléfono. Una llamada u otra aplicación de música la ponen en pausa, como cabe esperar.

## En un navegador o en un ordenador

En un navegador, la canción suele aparecer en los controles multimedia del ordenador o del teléfono, y las teclas multimedia del teclado funcionan. Que el navegador siga reproduciendo en segundo plano, sobre todo en un teléfono, depende del navegador. Para escuchar de forma fiable con la pantalla apagada, use la aplicación para iPhone o Android.

## El temporizador

**Sleep**, entre los botones redondos de Now Playing, detiene la música por usted:

1. Tóquelo para pasar por 15, 30, 45 y 60 minutos y, después, desactivarlo.
2. O manténgalo pulsado para elegir cualquier duración, hasta 12 horas.
3. Durante el último minuto la música baja suavemente y después se pone en pausa.

El temporizador sigue funcionando con el teléfono bloqueado.

## Mantener la pantalla encendida

Si le gusta ver girar el disco, **Keep awake** impide que la pantalla se atenúe o se bloquee mientras Now Playing está abierto.

## Una notificación por canción

**Notify me of each new song**, en Settings, muestra la canción, el artista y la carátula cuando empieza cada canción nueva mientras la aplicación no está en pantalla. Solo se muestra una cada vez, sustituida por la siguiente, y no hace ningún sonido. Está desactivada hasta que la active, y es entonces cuando su dispositivo le pide permiso.`,
  },
  {
    id: 'privacy',
    title: 'Qué sale de su dispositivo',
    summary: 'No se sube nada, y las tres búsquedas opcionales, con exactitud.',
    group: 'Privacidad y seguridad',
    body: `Universal Jukebox está pensado para funcionar por completo en su propio dispositivo. Su música nunca se sube, no hace falta ninguna cuenta y la aplicación funciona sin conexión a Internet.

## Qué se queda en su dispositivo

- **Sus archivos de música.** Se leen donde están y nunca se copian a un servidor.
- **El catálogo de su biblioteca**: títulos, artistas, álbumes, copias pequeñas de las carátulas y las correcciones que haya hecho al poner orden.
- **Sus ajustes, sus peticiones y el punto en que lo dejó.** Se quedan en la aplicación, en este dispositivo.

La aplicación no hace copia de seguridad ni sincroniza nada de esto. Si usa Jukebox en dos dispositivos, cada uno conserva su propia biblioteca.

## Las tres búsquedas

Solo tres funciones envían algo sobre su música, y ninguna hace nada hasta que usted lo pide. Cada una va directamente de su dispositivo al servicio indicado, sin pasar por UNI·SIM, y envía solo lo que se detalla.

- **Búsqueda de letras** (desactivada hasta que la active en Settings): envía el artista, el título, el álbum y la duración de una canción a lrclib.net, para las canciones que no tienen letra propia.
- **About this track** (desactivada hasta que la active, en Settings o en el propio panel): envía el título de la canción y el nombre del artista a Wikipedia, para mostrar lo que Wikipedia dice de ellos. Las respuestas se guardan en el dispositivo durante 90 días, y una canción sin artículo se vuelve a consultar al cabo de unos días.
- **Find a picture**, en una petición: envía las palabras que escribió a la búsqueda de iTunes de Apple, solo cuando lo toca. La imagen que elija se guarda con la petición.

Las respuestas de las dos primeras se guardan en su dispositivo, así que cada canción se consulta una sola vez. Settings muestra cuántas hay y le permite olvidarlas. Ningún audio sale nunca de su dispositivo.

## Universal ID

Iniciar sesión con un Universal ID es opcional. Le mantiene con la sesión iniciada en todas las aplicaciones de UNI·SIM. Mientras tenga la sesión iniciada, la aplicación registra un evento de «apertura» en su cuenta cada vez que se inicia. Ese evento no dice nada sobre su música.

## Permisos

La aplicación solo pide acceso cuando una función lo necesita: a una carpeta que usted elija, a la biblioteca de Música del iPhone si pide reproducirla, y a las notificaciones si las activa. Puede retirar cualquiera de estos permisos en los ajustes de su dispositivo.`,
  },
]

export default articles

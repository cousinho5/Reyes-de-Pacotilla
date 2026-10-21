# Bloque 7: página de inicio

Decidido el 21 de octubre de 2026 · copia del documento «Reyes de Pacotilla: bloque 7, página de inicio» (claude.ai). La maqueta animada también está en el repositorio: `docs/maquetas/bloque7-portada.html` se abre en el navegador (mejor con el ancho de un móvil). Sus fuentes están en `docs/maquetas/bloque7/`: el dibujo en pxl (`pxl/portada.px.js`), la lógica (`portada.js`), el marco (`shell.html`) y cómo rehacerla (`construir.mjs`). No cambia reglas.

La portada es lo primero que se ve al abrir el juego, y la app instalada siempre abre en ella (`start_url: "/"`), así que se ve cada día. La idea: una ventana a Aldricia viva y, justo debajo, lo que te importa hoy.

## Cómo es hoy

La portada es correcta pero plana: un trocito de mapa quieto, el título y dos tarjetas.

- **Sin entrar:** un mapa de 5x2 casillas sin movimiento, el título, Fray Abundio con una frase fija, «Entrar con mi código» y «¿Tienes una invitación?».
- **Con sesión:** «Bienvenido» y una lista de partidas con escudo, nombre, casa y estado. No dice si te faltan órdenes, cuánto falta para la noche ni cómo vas.
- **Entrar:** una página aparte casi vacía para el código de 6 caracteres.
- **Invitación:** el nombre de la partida, las casas que ya están y el editor del escudo. No dice quién te invita ni de qué va el juego.

## Qué hacen otros juegos

| Juego | Cómo lo hace | Qué sacamos |
| --- | --- | --- |
| Animal Crossing | La cámara recorre tu pueblo y sigue a los vecinos | Aldricia viva: humo, banderas, gente y pájaros |
| Xenoblade Chronicles | El día y la noche pasan en la portada | El cielo sigue la hora real |
| The Last of Us | Al terminar, aparece un recuerdo en la portada | La portada recuerda tus coronas |
| The Witcher 3 | La portada cambia con cada expansión | Variantes por evento o época |
| Lichess, por correspondencia | Las partidas lentas, ordenadas por urgencia | Tus partidas por lo que te toca y cuánto falta |
| Neptune's Pride | Partidas de semanas con amigos, se entra un momento | Resumen de un vistazo de qué ha pasado y qué te espera |

## Decisiones

| Punto | Decisión |
| --- | --- |
| 1. Escena de arriba | El panorama de Aldricia vivo, con el castillo y el pueblo, como en la maqueta |
| 2. Hora y época | El cielo sigue la hora real del jugador (amanecer, día, atardecer, noche); las variantes por estación o evento (nieve, fuegos en la coronación) llegarán más adelante |
| 3. Título | Letras doradas «Reyes de Pacotilla» con una corona de píxel que cae y se posa torcida, y *Aldricia, el Reino Más o Menos Unido* debajo |
| 4. Si ya has entrado | Tarjeta grande con la partida más urgente (la que te pide órdenes o cierra antes) y el resto debajo, más pequeñas |
| 5. Qué cuenta cada partida | Cuenta atrás hasta el cierre de órdenes, si te faltan órdenes, ataques de anoche y cómo acabaron, boletín nuevo, ofertas de comercio, puesto y Prestigio, y un mini mapa de tu reino. Todo dentro de la niebla de tu casa |
| 6. Fray Abundio | Frases nuevas en el banco (sección 11.12, Portada) según si has entrado, la hora y cómo va tu partida, rotando cada pocos segundos |
| 7. Quien llega por primera vez | Presentación corta: lema, «para 4 a 8 amigos · 6 semanas · 5 minutos al día», tres pasos ilustrados y «Ver el prólogo» (bloque 13) |
| 8. Entrar con tu código | Hoja que sube desde abajo con seis casillas, sin salir de la portada |
| 9. Invitación | Bando real con quién invita, nombre de la partida, cuándo empieza, casas apuntadas con escudo y lema, y sitios libres |
| 10. Vitrina de coronas | Sí: coronas ganadas, partidas jugadas y el título de la última |
| 11. Instalar en el móvil | Tarjeta en la portada si el móvil lo permite y aún no está instalado, con la frase del banco 11.11 |
| 12. Movimiento | Escena animada y ligera: 14 imágenes por segundo, paralaje al deslizar, se para si la pestaña no se ve y queda quieta con «reducir movimiento» |

## La escena

Un panorama en pixel art, diseñado en pxl, en cinco planos que se mueven a distinto ritmo al deslizar:

1. **Cielo:** degradado según la hora, nubes de píxel, sol con halo de día y luna con estrellas de noche.
2. **Montañas lejanas** con nieve.
3. **Colinas:** trigo, setos, un molino con las aspas girando y cuatro castillitos con banderas de colores de casa.
4. **La capital:** el castillo real con torres de cono morado, estandartes, hiedra, foso y puente levadizo; en la torre del rey, la bandera morada con un lazo negro de luto por Aldric.
5. **El pueblo:** el camino que sube a la puerta, casas de entramado, la panadería con su cartel de pan, la taberna con un muslo de pollo, pozo, puesto del mercado, pajar, barriles y flores.

Se mueven solos el humo de las chimeneas, una carreta con burro que sube, un aldeano que baja, una rata de vez en cuando, pájaros de día y luciérnagas de noche. De noche se encienden las ventanas y el fantasma de Aldric se asoma por la torre. Cada hora tiñe todo el dibujo con su luz.

## Las tres pantallas

- **Sin entrar:** Fray Abundio da la bienvenida; «Entrar con mi código» (abre la hoja) y «Tengo una invitación»; «Ver el prólogo (45 s)»; la presentación «Un trono vacío y demasiados aspirantes» con sus tres pasos.
- **Con partidas:** saludo según la hora («Buenas tardes, Cimentia») y Fray con una frase sobre cómo vas. La tarjeta de la partida más urgente con el sello «Te toca», la cuenta atrás («Órdenes: cierran en 3 h 12 min»), los avisos, la clasificación en escudos, el mini mapa y «Entrar en mi castillo». Debajo, las demás partidas (una por empezar, una terminada con «Ver la coronación»), la vitrina de coronas, la tarjeta de instalar, el campo para pegar una invitación y Salir.
- **Invitación:** el bando real que se desenrolla, «Ya en la corte» con los escudos y los sitios libres, «Crear mi casa», entrar con código para quien ya juega y un desplegable «¿Qué es Reyes de Pacotilla?».

## Pasos

Van después de los bloques 3 (banco de frases), 6 (rendimiento en móvil), 11 (pantalla «La coronación») y 13 (prólogo).

1. **Arte.** Pasar los dibujos de `docs/maquetas/bloque7/pxl/portada.px.js` (montañas, colinas, capital, pueblo, aspas, bandera, humo, carreta, aldeano, rata, pájaros, fantasma, corona y brillo) a rejillas de `apps/web/src/art` con `scripts/pxl-a-juego.mjs`.
2. **Escena.** Un componente con sus planos, el tinte de cada hora, el cielo, las estrellas y lo que se mueve. La hora sale del reloj del móvil del jugador.
3. **Servidor.** Ampliar `/api/yo` con un resumen por partida: noche y semana, hora de cierre de órdenes, si faltan órdenes, ataques de la última noche, boletín sin leer, ofertas pendientes, puesto y Prestigio, y el mini mapa. Todo calculado con la niebla de la casa y con `gameNow(game)`, con pruebas de que no se cuela nada de fuera de la niebla.
4. **Portada.** Reescribir `Home.tsx` con las tres pantallas y la hoja para entrar con el código.
5. **Invitación.** Que la API de invitación devuelva quién invita, cuándo empieza y las casas apuntadas con escudo y lema.
6. **Fray Abundio.** Añadir la sección 11.12 (Portada) a `docs/banco-de-frases.md` con frases para sin entrar, con partidas (según cómo vas) e invitación.
7. **Vitrina e instalar.** Contar coronas y partidas jugadas; tarjeta de instalar con la frase del banco 11.11.
8. **Comprobar** en un móvil de 390x844 con Playwright las tres pantallas y las cuatro horas, medir el rendimiento con las reglas del bloque 6 y comprobar que con «reducir movimiento» la escena queda quieta.

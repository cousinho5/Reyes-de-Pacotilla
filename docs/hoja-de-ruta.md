# Reyes de Pacotilla: hoja de ruta

Actualizada el 19 de octubre de 2026 · copia del documento «Reyes de Pacotilla: hoja de ruta» (claude.ai)

Cuatro bloques de actualizaciones, en este orden. El primero ya está decidido; los otros tres se definirán cuando lleguemos. Se pueden añadir o mover bloques sobre la marcha.

| Bloque | Estado | Qué entra |
| --- | --- | --- |
| 1. Mapa y losetas | Decidido, siguiente en hacerse | Geografía, ríos, Prado, Aldea, Ruinas y marco de mar y montañas |
| 2. Vista del castillo y construcciones | Por definir | Dibujo del castillo propio con sus banderas y sus edificios |
| 3. Mejora del cronista | Por definir | Fray Abundio |
| 4.  Retoques sistema de batalla | Por definir |  |
| 5. Retoques recursos | Por definir |  |
| 3. Optimización y controles en móvil | Por definir | Rendimiento y manejo con el dedo |
| 7.  Mejorar pagina de inicio del juego | Por definir | Mejorar visualmente la pantalla de inicio al acceder al juego. |

## Bloque 1: mapa y losetas

Decidido el 18 de octubre a partir de Reyes de Pacotilla: evaluación del mapa y las losetas. Cada fase se simula antes y después, y solo afecta a partidas nuevas: las que están en curso conservan su mapa.

**Decisiones:**

- No se agranda la tierra jugable. A cambio, el tablero lleva un marco de mar y montañas que no se juega.
- No se agrandan las losetas por ahora. El detalle saldrá de variantes por tipo y de la geografía. Al final se prueba un dibujo a ×1,5 en una sola loseta.
- Los ríos tienen regla: atacar cruzando un río da +25% al defensor. Los puentes no tienen penalización.
- La Aldea permite reclutar, como el castillo.
- Las Ruinas dan recursos o una carta, al azar (sale de la semilla de la partida).
- El Prestigio por loseta baja de 3 a 2.

**Fases:**

0. **Prestigio por loseta de 3 a 2**, con su simulación.
1. **Geografía y Prado.** Generador con altura, humedad, dos costas y ajuste de salida. El Prado (sin recursos, 1 de Prestigio, 2 de guarnición, llano) sustituye a parte de los páramos y los campos. Marco de mar y montañas alrededor. Se revisa el objetivo «puerto y fortaleza». *Se da por buena si* la justicia entre castillos queda como ahora (diferencia de entorno de 1,2 como mucho) y hay al menos un 50% más de vecinas del mismo terreno.
2. **Ríos, puentes y lagos.** Se guardan como rasgos del mapa (migración nueva). *Se da por buena si* no sube «el líder de la semana 2 gana» y ningún castillo queda encerrado.
3. **Aldea y Ruinas.** Una aldea por casa en la tierra de en medio, donde se puede reclutar. Unas ruinas por cada dos casas, con recursos o una carta para la primera casa que entre; después quedan como Prado. *Se da por buena si* los bots toman las ruinas en la primera semana y la aldea no dispara la bola de nieve.
4. **Dibujo.** Variantes por tipo de loseta, costa, ríos con puentes, aldea y ruinas. Prueba del dibujo a ×1,5 en una loseta.

La partida piloto con amigos puede empezar tras la fase 1 o la 2.

## Bloque 2: vista del castillo y construcciones **(por definir)**

En la pestaña Castillo se verá de verdad un dibujo de tu castillo, con tus banderas y el sitio de cada edificio. Cada mejora de un edificio se verá distinta. El resto, por definir: lo hablaremos y lo decidiremos todo antes de empezar.

## Bloque 3: mejora del cronista **(por definir)**

Por definir. Lo hablaremos y lo decidiremos todo antes de empezar.

## Bloque 4: Retoques sistema de batalla **(por definir)**

- Sistema de apoyo en ataque/defensa: cuando seleccionas apoyar, te da la opcion de apoyar al ataque/defensa que venga desde x sitios, ¿podríamos cambiar esto para que simplemente sea apoyar ataque/defensa, independientemente del lado que venga el ataque?
- Revisar si esta equilibrado "mesnada" y "jinete" según lo que cuestan. Creo que sale mucho más rentable comprar jinetes.
- Capitán: hacerlo como una unidad física, para que se pueda desplazar por el mapa sin necesidad de estar ligado a otro tipo de unidad.
- Como los jinetes pueden avanzar dos losetas de un movimiento, tenemos que tener en cuenta que si tenemos las losetas A B C, el equipo X tiene 3 mesnadas en A y el equipo Y tiene 4 jinetes en C, el equipo X manda a moverse a B y el equipo Y manda moverse a A, en el sistema actual no combaten, pero deberiamos arreglarlo ya que directamente se encuentran de frente.
- Fortificaciones, ¿permanentes hasta que es atacada la loseta (una vez atacada, ganen o pierdan se quita la fortificación)?
- En una partida que he jugado de prueba contra los bots, me he llevado toda la partida en guerra solo con un bot de un castillo de al lado mia, creo que era complicado mantener dos batallas simultáneamente

## Bloque 5: Retoques recursos **(por definir)**

- Al jugar partidas, siento que el oro no me sirve de mucho.
  - ¿pedir oro para mejorar los edificios en todos los niveles?
  - otros usos.

## Bloque 6: optimización y controles en móvil **(por definir)**

Por definir. Lo hablaremos y lo decidiremos todo antes de empezar.

## Bloque 7: Mejorar pagina de inicio del juego **(por definir)**

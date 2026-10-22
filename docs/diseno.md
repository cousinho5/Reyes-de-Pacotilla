# Reyes de Pacotilla: documento de diseño v2

Juego de estrategia asíncrono de navegador para 4-8 amigos. Esta versión 2 incorpora la revisión completa del diseño: se eliminan los puntos de acción, el Prestigio pasa a calcularse en vivo, el combate tiene reglas formales con apoyo y rebotes, se define qué ve cada jugador y se añaden los objetivos secretos. Todos los números son valores de partida, comprobados con una simulación sencilla, que se afinarán con el script de simulación y la partida piloto.

## 1. Resumen en 30 segundos

Juego de navegador (instalable en el móvil) para 4-8 amigos, con partidas de 6 semanas. Cada día entras 5-10 minutos: construyes, reclutas, dejas órdenes a tus ejércitos y cierras tratos con los demás. Dos veces por semana, el miércoles y el domingo a las 22:00, el servidor resuelve todo a la vez: batallas, subasta y eventos. Después, Fray Abundio, el cronista de la corte, lo cuenta a su manera.

Mezcla Catan (recursos y comercio), Diplomacy (órdenes secretas simultáneas, apoyos y nada de dados) y Subterfuge (partida lenta que respeta tu tiempo). Hay 5 recursos, un mapa pequeño y varias formas de ganar Prestigio (territorio, edificios, riqueza y comercio) que se compensan entre sí. Gana quien más Prestigio tenga al final, contando un objetivo secreto que nadie más conoce.

## 2. Qué hemos aprendido de otros juegos

| Juego | Qué funciona | Qué critican o sufren los jugadores | Lección para nuestro diseño |
| --- | --- | --- | --- |
| **Neptune's Pride** (navegador, partidas de ~1 mes) | Las alianzas deciden la partida y no existe un botón de alianza, así que la traición siempre es posible. Genera muchas conversaciones fuera del juego. | Acaba dominando la vida diaria: se comprueba el juego a todas horas, hay ataques a las 3 de la madrugada y los novatos juegan como en solitario hasta que es tarde. | La parte social es el gancho. Hay que evitar la presión de estar conectado todo el día. |
| **Subterfuge** (móvil, 6-9 días) | Sesiones de 2 minutos con un arco de una semana. Notificaciones, resultado determinista, previsión del futuro, órdenes programadas y ninguna acción que se resuelva en menos de 8 horas. | Algunos jugadores piensan que una semana es demasiado. Lo mejor del juego, según las reseñas, es hablar con la gente. | Copiar su filosofía de respetar el tiempo del jugador y no alargar las partidas. |
| **Diplomacy** (mesa y online) | Órdenes secretas simultáneas, cero dados, apoyos entre unidades y negociación libre. Sus reglas de combate llevan décadas pulidas. | Es duro: amistades dañadas, eliminaciones a mitad de partida y abandonos. Un análisis de partidas online cuenta que en todas hubo alguien que se fue, sobre todo quien veía que no podía ganar. | Copiar sus reglas de apoyo y rebote, pero sin eliminación, con bajo coste emocional y con motivos para seguir aunque vayas detrás. |
| **Travian / Tribal Wars / OGame** | Persistentes, con alianzas imprescindibles y un crecimiento muy adictivo. | Sin defensa automática obligan a conectarse sin parar, hay quejas de pay-to-win, de inactivos esquilmados y de que acaba siendo un trabajo. | Protección al ausente, sin dinero real y sin presión de estar siempre conectado. |
| **Catan** | El comercio entre jugadores es el corazón y los recursos limitados obligan a negociar. | Demasiado peso de los dados, el ganador suele verse a mitad de partida, el ladrón se usa para venganzas personales y hay debate sobre dar la victoria a otro (kingmaking). En versiones digitales, la interfaz de comercio es torpe. | Comercio central con una interfaz muy buena, sin dados y con frenos al líder. |
| **Risk** | Conquista simple y fácil de entender. | El azar manda, la ventaja inicial decide y los eliminados esperan horas. | Combate determinista y sin eliminación. |
| **Diseño general** | El líder imparable equivale a una eliminación encubierta. Contra el kingmaking funcionan las puntuaciones difíciles de leer del todo, las partidas ajustadas y los incentivos para atacar al líder. | Las ayudas fuertes al último molestan porque la ayuda de uno es la victoria robada de otro. | Prestigio en vivo (siempre se puede remontar), objetivo secreto (el marcador nunca es del todo seguro), frenos suaves al líder y ayuda pequeña al último. |

Otros detalles útiles: la frecuencia de resolución determina cuánto necesitas conectarte, así que los ciclos tienen que ser largos; y la ausencia de un jugador es un caso normal que el juego debe resolver solo.

## 3. Pilares de diseño

- **Respeto al tiempo.** Una sesión diaria de 5-10 minutos basta para jugar bien. Conectarse más no da ventaja.

- **Determinista.** Sin dados. El azar solo viene de eventos anunciados con antelación.

- **Todo se decide en secreto y se resuelve a la vez.** Como en Diplomacy: pensar, negociar, decidir y revelar.

- **Nadie queda eliminado.** Tu castillo no se puede conquistar y tus edificios están dentro, así que siempre produces.

- **Siempre se puede remontar.** El Prestigio se mide en vivo y hay un objetivo secreto: nadie está fuera hasta la última resolución.

- **Equilibrio entre comercio, guerra y construcción.** Ninguna vía gana sola; la mezcla es lo que gana.

- **Mesa de amigos.** Bajo coste emocional, buen humor y reglas que eviten el ensañamiento.

- **Sencillez.** Cada regla tiene que ganarse su sitio. Si no crea una decisión interesante, sobra.

## 4. Ritmo de una semana

Todos los horarios son en hora de Madrid y se pueden ajustar por partida.

| Cuándo | Qué pasa |
| --- | --- |
Desde el diseño v3 (octubre de 2026) hay **una resolución cada día**. Las partidas empezadas antes siguen con miércoles y domingo (cada partida guarda sus días en `games.resolution_days`).

| Cuándo | Qué pasa |
| --- | --- |
| **Cada día, a las 00:00** | Producción diaria de recursos. |
| **Cada día** | Entras, construyes, reclutas, fortificas, das o cambias órdenes, comercias y negocias. |
| **Cada día, 21:00** | Cierre de órdenes. Dos horas antes, aviso solo a quien aún no ha dado órdenes. |
| **Cada día, 22:00** | **Resolución de la campaña** y parte de guerra. |
| **Martes, 22:00** | Además, se anuncian el evento de la semana y los lotes de la Gran Subasta (antes de la resolución del martes). |
| **Miércoles, 22:00** | Además, subasta (pujas hasta las 21:00), efecto de combate del evento y efectos del evento. |
| **Domingo, 22:00** | Además, mantenimiento, ayuda al último y boletín semanal de Fray Abundio (sobornos hasta las 21:00). |

Las órdenes se pueden dar y cambiar en cualquier momento antes del cierre, así que no hace falta conectarse justo antes. Una partida estándar dura 6 semanas (42 resoluciones) y se puede configurar a 2, 4, 6 u 8.

## 5. Recursos y edificios

Cinco recursos. En las reglas, la interfaz y el código se usa siempre la misma palabra: **Pan**, no Comida.

| Recurso | Uso principal | Uso secundario |
| --- | --- | --- |
| **Pan** | Mantenimiento de tropas | Reclutar |
| **Madera** | Mejorar edificios | — |
| **Piedra** | Mejorar edificios | Fortificar casillas |
| **Hierro** | Reclutar tropas | Mejoras de nivel 4 y 5 |
| **Oro** | Pujas, comercio y sobornos | Prestigio por riqueza, mejoras de edificios, jinetes |

**Edificios.** Hay cinco, dentro de tu castillo, con niveles del 1 al 5: Granja (Pan), Aserradero (Madera), Cantera (Piedra), Mina (Hierro) y Mercado (Oro).

- **Producción diaria por edificio:** nivel 1 = 2, nivel 2 = 4, nivel 3 = 6, nivel 4 = 8, nivel 5 = 10.

- **Inicio:** dos edificios en nivel 2 (las especialidades de cada casa, repartidas para que todos dependan del comercio) y tres en nivel 1. Son 14 recursos al día. Cada casa empieza además con 10 de cada recurso y 6 tropas en el castillo.

- **Los edificios no se pueden perder**, porque están dentro del castillo. Por eso no hace falta un ingreso mínimo aparte: siempre produces.

- **Coste de mejora (valores de partida):**

| Subir a | Coste | Total |
| --- | --- | --- |
| Nivel 2 | 17 Madera + 12 Piedra + 5 Oro | 34 |
| Nivel 3 | 35 Madera + 23 Piedra + 10 Oro | 68 |
| Nivel 4 | 58 Madera + 35 Piedra + 25 Hierro + 20 Oro | 138 |
| Nivel 5 | 69 Madera + 40 Piedra + 30 Hierro + 30 Oro | 169 |

Las mejoras piden más Madera que Piedra porque la Piedra también sirve para fortificar (ajuste tras la simulación del 16 de octubre de 2026: la Madera sobraba y la Piedra iba justa). Con el bloque 5 de la hoja de ruta, todos los niveles piden Oro (antes solo el 5) y un 15% más de Madera y Piedra: al final de la partida sobraban unos 165 de Oro, 100 de Madera y 80 de Piedra por casa.

Una mejora se nota en la producción del día siguiente. En la simulación, quien solo construye tiene casi todo a nivel 5 al final de la sexta semana, no antes, así que construir siempre tiene sentido.

## 6. El mapa

### 6.1 Tamaño y casillas

Desde el diseño v3 el mapa es de **hexágonos** (filas impares desplazadas media casilla), con 6 vecinas por casilla. Escala con el número de jugadores para que los castillos queden siempre a unos 3 pasos del vecino más cercano y cada casa tenga unas 4 casillas productivas a su alcance antes del primer choque (hacia la segunda semana). El mapa se desplaza con el dedo, así que no hay límite de columnas.

| Jugadores | Cuadrícula | Casillas | Neutrales | Páramos | Productivas por casa |
| --- | --- | --- | --- | --- | --- |
| 4 | 6x5 | 30 | 26 | 2 | 6,0 |
| 5 | 7x6 | 42 | 37 | 5 | 6,4 |
| 6 | 8x6 | 48 | 42 | 6 | 6,0 |
| 7 | 9x7 | 63 | 56 | 10 | 6,6 |
| 8 | 10x8 | 80 | 72 | 14 | 7,3 |

Con 6 vecinas los castillos quedan más cerca, así que los mapas hexagonales tienen en torno a un 50% más de casillas que los de cuadrícula para mantenerlos a 3 pasos (simulaciones del 17 de octubre de 2026). Con cuadrícula (diseño v2) eran 5x4, 6x4, 6x5, 7x6 y 7x7. Antes aún, con 7 y 8 casas el mapa era 6x5 y 6x6: los castillos quedaban a 2 pasos (el 14% de las parejas de castillos se tocaban casi), el primer choque llegaba una resolución antes y cada casa tenía la mitad de terreno que con 4-6 casas. Comparación completa en `docs/simulaciones.md`.

- Cada casa empieza en su **castillo**, en el borde del mapa. El castillo **no se puede conquistar**: los pretendientes no se atreven a tomar el castillo ajeno, solo las tierras de alrededor.

- **Tipos de casilla y guarnición neutral inicial:**

| Tipo | Produce al día | Guarnición neutral | Notas |
| --- | --- | --- | --- |
| Campos | +2 Pan | 4 | |
| Bosque | +2 Madera | 4 | |
| Cantera | +2 Piedra | 6 | |
| Montaña | +2 Hierro | 6 | |
| Puerto | +2 Oro | 8 | La única casilla que produce Oro |
| Fortaleza | Nada | 8 | El defensor tiene +50% adicional y da más Prestigio |
| Páramo | Nada | 2 | Tierra de nadie: da 1 de Prestigio (las demás, 2) y nunca está junto a un castillo |
| Prado | Nada | 2 | Llano verde (bloque 1): da 1 de Prestigio, los jinetes cargan por él y puede estar junto a un castillo |
| Aldea | Nada | 4 | Bloque 1: quien la tiene puede reclutar en ella como en su castillo. Da 1 de Prestigio |
| Ruinas | Nada | 2 | Bloque 1: la primera casa que entra se lleva un premio y quedan como Prado |

- Las guarniciones neutrales no atacan (salvo en el evento de los bandidos) y no crecen.

- Se controla una casilla teniendo al menos 1 tropa en ella. Si una casilla se queda vacía, sigue siendo tuya hasta que otro entre.

- El mapa se genera a partir de una semilla para que sea justo. El generador prueba 600 colocaciones y elige la más justa: los castillos van a distancias iguales por el borde, nunca en una esquina (solo tendrían dos vecinas) ni juntos, las fortalezas y los páramos nunca están al lado de un castillo (se colocan primero en los huecos lejanos; los páramos quedan entre castillos como tierra de nadie) y el valor de las casillas cercanas a cada castillo difiere como mucho 1,5 puntos (1 por casilla vecina, 0,5 a dos pasos). Se comprueba con pruebas automáticas para 4 a 8 casas.

- **Geografía (bloque 1, partidas nuevas desde el 21 de octubre de 2026).** El mapa ya no se reparte al azar casilla a casilla. Dos campos de ruido sacados de la semilla, **altura** y **humedad**, deciden dónde cae cada tipo, con las mismas cantidades de antes:
  - **Costa** en dos lados opuestos (oeste y este, o norte y sur), con los **puertos en la orilla**, repartidos entre las dos costas.
  - **Montañas** en lo más alto y **canteras** en las laderas, junto a ellas. **Fortalezas** en los altos, lejos de los castillos.
  - **Bosques** en lo más húmedo; **Prado** entre los bosques y los campos, en lo bajo; **páramos** en lo más seco; **campos** en el resto.
  - **Prado:** la mitad de los páramos del tamaño de mapa pasan a ser Prado. Los campos se quedan en el 20% de las neutrales (con el 15% subían las deserciones). No se añade tierra.
  - **Ajuste de salida:** si a un castillo le falta un recurso básico (Pan, Madera, Piedra o Hierro) a 2 pasos, se cambia una casilla suya repetida, o un Prado, por una del tipo que falta. Después, al castillo peor situado se le cambia un Prado cercano por una casilla productiva de más lejos mientras el mapa gane en justicia.
  - De los 600 mapas probados gana el que mejor junta justicia y terreno agrupado. Resultado (40 mapas por número de casas): un 50-110% más de vecinas del mismo terreno que antes y una diferencia de entorno entre castillos de 0,4-0,5 de mediana (antes 0,7-1,1). Datos en `docs/simulaciones.md`.
  - **Marco:** alrededor del tablero se dibuja mar en los lados con costa y montañas en los otros dos. No se juega: solo hace que el reino parezca parte de un mundo.
  - **Ríos y lagos (fase 2).** Los ríos nacen junto a una montaña y bajan siempre hacia lo más bajo, por los lados entre casillas, hasta el mar: uno con 4 o 5 casas y dos con 6 o más. Los **lagos** (uno con 4 o 5 casas, dos con 6 o más) ocupan el sitio de un páramo, en lo bajo y húmedo, nunca junto a un castillo, en la orilla ni partiendo el mapa en dos. En un lago no se puede entrar. Regla de los ríos en la sección 8.8.
  - **Aldeas y Ruinas (fase 3).** Cada casa tiene una **Aldea** a 2 pasos de su castillo (todas a la misma distancia y nunca junto a un castillo; mejor si no está igual de cerca de otro). Las **Ruinas** van en la tierra de en medio, lo más a la par posible entre los dos castillos más cercanos y nunca junto a uno: una con 4 o 5 casas, dos con 6 o 7 y tres con 8. Las dos ocupan el sitio de casillas neutrales (las Ruinas, el de un Prado; las Aldeas, el de los campos que sobran), así que no se añade tierra.
    - **Aldea:** no produce. Quien la tiene puede **reclutar** en ella como en su castillo: es una base avanzada que vale por su posición, y perderla te la quita.
    - **Ruinas:** la primera casa que entra se lleva lo que guardan y desde ese momento son un Prado. El premio sale de la semilla de la partida: la mitad de las veces **10 de un recurso** y la otra mitad **una carta de la Corona** al azar. Se anuncia en la crónica.

### 6.2 Qué ve cada jugador (niebla de guerra)

- **Ves con detalle** tus casillas y las adyacentes a ellas (incluido tu castillo): quién las controla, cuántas tropas hay y si están fortificadas.

- **Del resto del mapa** solo ves quién controla cada casilla.

- **Los recursos y el Oro de los demás** son secretos. El Prestigio sí es público (sección 11), y algunos eventos y cartas revelan pistas.

- **Las órdenes de los demás** son siempre secretas hasta la resolución.

### 6.3 Nombres del mapa

- **El reino:** Aldricia, el Reino Más o Menos Unido.

- **Castillos:** se llaman según la casa ("Castillo de la Casa del Nabo Altivo").

- **Casillas neutrales:** reserva de 8 nombres por tipo (48 en total, en `packages/engine/src/names.ts`). Cada partida saca los suyos al azar. Aquí están los 30 primeros.

- **Dónde se ven:** en el panel de la casilla y en el boletín, no encima del mapa. Al tocar una casilla aparece su nota del cronista.

| Tipo | Nombre | Nota del cronista |
| --- | --- | --- |
| Campos | Villa Mediocre | Ni fu ni fa, pero da pan. |
| Campos | La Vega Regular | Su mayor logro es no inundarse. |
| Campos | Los Trigales de Nadie | Hasta que alguien los reclame. |
| Campos | Prado Pisoteado | Ha visto pasar demasiados ejércitos. |
| Campos | Huerta del Vecino | Siempre más verde que la tuya. |
| Bosque | El Bosque Que Da un Poco de Miedo | Solo un poco. |
| Bosque | Pinar del Hacha Perdida | Si alguien la encuentra, que la devuelva. |
| Bosque | Arboleda del Eco Tímido | El eco contesta, pero bajito. |
| Bosque | Bosque de los Mil Mosquitos | Mil, como mínimo. |
| Bosque | La Espesura Exagerada | El cronista no ha entrado y no piensa hacerlo. |
| Cantera | Roca Tozuda | No se mueve ni a martillazos. |
| Cantera | El Agujero Grande | Antes era una colina. |
| Cantera | Pedregal de las Rodillas | Ya sabréis por qué. |
| Cantera | Cantera del Último Piedrazo | Siempre queda uno más. |
| Cantera | La Pedrera Bostezante | Hasta las piedras se aburren aquí. |
| Montaña | Monte Cuestarriba | El nombre lo dice todo. |
| Montaña | Pico del Resoplido | Se sube resoplando y se baja rodando. |
| Montaña | Minas de Ya Veremos | Productivas, según el último informe. |
| Montaña | Cerro del Burro Cansado | El burro sigue allí, cansado. |
| Montaña | La Montaña Que Antes Era Más Alta | Culpa de los mineros. |
| Puerto | Puerto Regateo | Aquí nadie paga el primer precio. |
| Puerto | Muelle del Cangrejo Sospechoso | Vigilad las bolsas. |
| Puerto | Cala de los Contrabandistas Honrados | Honrados a su manera. |
| Puerto | Puerto Gaviota Ladrona | Se llevó la corona de un turista. |
| Puerto | Desembarcadero Mojado | Tal cual. |
| Fortaleza | El Puente Que Nadie Cruza | Por algo será. |
| Fortaleza | Fuerte Inexpugnable (Casi) | El "casi" se añadió tras el último asedio. |
| Fortaleza | Torreón del Bostezo Eterno | La guardia lleva siglos de servicio aburrido. |
| Fortaleza | Castillo de Naipes | Más resistente de lo que parece. Poco más. |
| Fortaleza | La Atalaya del Despistado | Desde aquí se ve todo, si alguien mira. |

## 7. Qué haces cada día

**No hay puntos de acción.** La simulación del diseño v1 mostró que, con 4 puntos al día, se usaba como mucho una cuarta parte: lo que limita de verdad son los recursos. Quitarlos simplifica el juego sin quitar ninguna decisión.

Cada día puedes hacer, sin límite más allá de lo que puedas pagar:

| Acción | Coste | Efecto |
| --- | --- | --- |
| Mejorar un edificio | Ver tabla de la sección 5 | Sube un nivel; la producción aumenta al día siguiente. |
| Reclutar | 2 Hierro + 2 Pan por tropa | Las tropas aparecen en tu castillo, o en una aldea tuya si lo eliges (bloque 1), y pueden recibir órdenes para la siguiente resolución. |
| Fortificar una casilla tuya | 8 Piedra | +25% de defensa **hasta que ataquen la casilla** (bloque 4): el primer ataque, gane o pierda, la quita. Cada domingo cuesta 2 de Piedra de mantenimiento. Antes duraba cuatro resoluciones (dos en las partidas con miércoles y domingo). |
| Dar órdenes | Gratis | Mover, atacar, apoyar o mantener (sección 8). |
| Comerciar | Gratis | Ofertas, contraofertas y tratados (sección 9). |

Lo que lleva al jugador a entrar a diario no es una obligación, sino que cada día hay recursos nuevos que gastar, ofertas que mirar y algo que negociar. Si un día no entras, no pierdes nada: los recursos se acumulan.

## 8. Órdenes y combate

> **Sistema de guerra v3** (decidido el 17 de octubre de 2026). **Ya hecho:** casillas hexagonales, una resolución cada día a las 22:00, terreno que cuenta (sección 8.8), tres tipos de tropa (sección 8.9), asedios (sección 8.10), el Capitán con la Gloria (sección 8.11) y la repetición de la noche con avisos y órdenes en cola (sección 8.12). **Pendiente:** veteranos. La propuesta completa está en el documento "Reyes de Pacotilla: propuesta del nuevo sistema de guerra". Primeros resultados del simulador en `docs/simulaciones.md`. Hasta que esté hecho, rige lo que sigue.

### 8.1 Órdenes

Cada grupo de tropas recibe una orden por resolución. Puedes dividir las tropas de una casilla en varios grupos con órdenes distintas.

| Orden | Efecto |
| --- | --- |
| **Mantener** (por defecto) | El grupo se queda y defiende su casilla. |
| **Mover / atacar** | El grupo intenta entrar en una casilla adyacente (una de las seis que tocan su hexágono). Si es tuya o está vacía y nadie más entra, simplemente se mueve. |
| **Apoyar** | El grupo se queda donde está y suma su fuerza a la defensa de una casilla adyacente o al **primer ataque** que llegue a ella esa noche. No se elige de dónde viene el ataque ni de qué casa es. Se puede apoyar a otra casa. |

Las tropas se mueven como máximo una casilla por resolución: siete por semana con la resolución diaria.

### 8.2 Fuerza

- **Fuerza de ataque** = tropas del grupo que ataca + tropas de los grupos que lo apoyan.

- **Fuerza de defensa** = (tropas que mantienen la casilla × bonificación) + tropas que apoyan la defensa.

- **Bonificación del defensor** (se suman): +25% por defender, +25% si la casilla está fortificada, +50% si es una fortaleza. Máximo, ×2.

- Los apoyos suman sus tropas sin bonificación.
- **Qué ataque apoya un apoyo al ataque** (bloque 4): el primero que llegue a la casilla esa noche. Si la casa que apoya ataca esa casilla, es siempre el suyo; si no, el de la orden que se cambió antes (cuenta la hora del último cambio: volver a guardar una orden sin tocarla no la retrasa). Suma una sola vez aunque se ataque desde dos sitios, y puede acabar ayudando a un enemigo que se adelantó. Como no depende del origen, también sirve para una marcha por camino o una carga de jinetes. En la repetición y en la crónica, la casa apoyada ve quién la apoyó.

### 8.3 Resolución de una casilla disputada

1. Se calcula la fuerza de cada bando: el defensor (si lo hay) y cada ataque con sus apoyos.

2. **Gana el bando con más fuerza**, siempre que supere estrictamente a todos los demás.

3. **Empate en cabeza:**
   - Si el defensor está entre los empatados, gana el defensor.
   - Si empatan dos atacantes, ninguno entra (**rebote**) y el defensor conserva la casilla sin bajas.

4. **Bajas del ganador:** conserva sus tropas × (1 − fuerza del segundo / fuerza propia), redondeando hacia arriba y con un mínimo de 1. Si no había rival, no tiene bajas.

5. **Los perdedores:**
   - Un **atacante** derrotado o rebotado se **repliega** a su casilla de origen con la mitad de sus tropas (redondeando hacia abajo).
   - Un **defensor** derrotado pierde todas las tropas de esa casilla, y la casilla.

6. **Los grupos que apoyan nunca sufren bajas** y nunca se mueven.

### 8.4 Casos especiales

- **Cortar un apoyo:** si atacan la casilla desde la que un grupo apoya, ese apoyo se anula. Hay una excepción: no lo corta un ataque que venga precisamente de la casilla contra la que se apoya.

- **Intercambio de casillas:** dos grupos que intentan cambiarse de casilla se encuentran a medio camino. Combaten sin bonificación de defensa; el ganador sigue hasta su destino y el perdedor se repliega a su casilla con la mitad de sus tropas.

- **Cruces por el camino (bloque 4):** si dos grupos de casas distintas se cruzan por el camino (una marcha de dos casillas, por camino o a la carga, que recorre al revés un tramo de la otra), también chocan de frente, como en un intercambio. Por ejemplo, con A, B y C en fila, 3 Mesnadas que van de A a B y 4 jinetes que cargan de C a A pasando por B. Combaten sin terreno ni cargas; el ganador sigue hasta su destino con los supervivientes y el perdedor se repliega. La repetición dibuja el choque en la casilla de en medio de la marcha larga, y la pestaña Órdenes avisa de las marchas propias que un enemigo a la vista podría cruzar.

- **Casillas que se vacían:** si un grupo sale de una casilla con éxito, otro puede entrar en ella en la misma resolución.

- **Tu propio fuego:** no puedes atacar tus propias casillas, y un ataque tuyo nunca corta un apoyo tuyo.

- **Castillos:** no se pueden atacar. Las tropas dentro de un castillo solo pueden salir o apoyar.

### 8.5 Ejemplos

- **Tomar una casilla neutral:** 7 tropas atacan unos Campos con 4 de guarnición. Defensa: 4 × 1,25 = 5. Gana el atacante y conserva 7 × (1 − 5/7) = 2 tropas.

- **Ataque con apoyo:** Marta ataca con 6 y Dani la apoya desde una casilla vecina con 4: fuerza 10. El defensor tiene 6 tropas en una casilla fortificada: 6 × 1,5 = 9. Gana Marta y conserva 6 × (1 − 9/10) = 0,6, que redondea a 1. Dani no pierde nada.

- **Rebote:** Pablo y Lucía atacan a la vez una casilla vacía, los dos con 5. Empate: ninguno entra y los dos se repliegan con 2 tropas.

- **Apoyo cortado:** Dani apoya a Marta, pero Lucía ataca la casilla de Dani. El apoyo se anula y Marta ataca solo con 6 contra 9: se repliega con 3.

### 8.6 Mantenimiento

- **Cada domingo:** 1 Pan por cada 3 tropas. Si no puedes pagar, desertan las tropas que falten por cubrir, empezando por las más alejadas del castillo.
- **Fortificaciones (bloque 4):** después, 2 de Piedra por cada casilla fortificada. Si no llega, se desmantelan las que no se pueden pagar. Las catapultas y los asedios siguen desgastando la fortificación en combate, y cambiar de manos la quita.

- **Estirarse cuesta:** a partir de la quinta casilla controlada, cada casilla extra cuesta 2 Pan más por semana. Es un freno suave al que más se expande.

### 8.7 Previsualización

El botón **Simular** aplica tus órdenes al estado que conoces y te enseña el resultado previsto. Usa exactamente el mismo motor que el servidor, así que con la misma información el resultado coincide; lo que no sabes (las órdenes de los demás y lo que hay fuera de tu vista) sigue oculto.

### 8.8 Terreno (diseño v3, fase 2)

| Terreno | Defensa | Efecto especial |
| --- | --- | --- |
| Campos, páramo, Prado, puerto, Aldea, Ruinas | +0% | El puerto permite la travesía |
| Bosque | +25% | **Emboscada:** desde fuera se ve quién lo controla, pero no cuántas tropas hay (salvo con la carta Espía). Las guarniciones neutrales sí se ven. |
| Cantera | +25% | Fortificar aquí cuesta 4 de Piedra en vez de 8. |
| Montaña | +50% | **Atalaya:** desde una montaña tuya ves las casillas a dos pasos. |
| Fortaleza | +50% | Como hasta ahora. |
| Lago | — | No se puede entrar ni da Prestigio (bloque 1). |

El terreno se suma a las demás bonificaciones del defensor y el tope sigue en x2.

- **Ríos (bloque 1, fase 2).** Corren por los lados entre casillas, de las montañas a la costa. **Atacar cruzando un río da +25% al defensor**: cuenta el último tramo de la marcha (en una de dos casillas, el de la casilla de en medio al destino). Donde un camino cruza el río hay un **puente** y no cuenta. Si varias casas atacan la misma casilla, cada una lucha con su río: es como si su fuerza se dividiera por lo que sube la defensa. El tope x2 sigue. Los choques frontales no miran el río.

- **Caminos.** Los que se dibujan entre los castillos y las fortalezas cuentan: un grupo avanza **dos casillas en una noche** siguiendo el camino si la casilla de en medio es suya. Antes no admitía apoyos; desde el bloque 4, un apoyo al primer ataque también le suma.
- **Travesía.** Desde un puerto tuyo, un grupo llega a **cualquier otro puerto en una noche**, también para atacarlo. Tampoco admite apoyos. La propuesta decía dos noches, pero eso exigía guardar tropas "en el mar" entre resoluciones; con una noche y sin apoyos el puerto ya gana valor sin complicar las reglas.

Simulación (300 partidas de 6 semanas, `docs/simulaciones.md`): con terreno hay un 15% menos de batallas entre casas (aún unas 2,5 veces más que con dos resoluciones por semana), y las casas con deserciones bajan del 20% al 11%. Los bots marchan por camino unas 21 veces por partida y casi no usan el mar (0,6 travesías): queda para las personas.

### 8.9 Tipos de tropa (diseño v3, fase 3)

| Tropa | Coste | Fuerza | Movimiento | Notas |
| --- | --- | --- | --- | --- |
| **Mesnada** | 2 Hierro + 2 Pan | 1 | Una casilla | La única que sube a la montaña. |
| **Jinetes** | 3 Hierro + 2 Pan + 3 Oro (bloque 4; antes 1 Oro) | 1; **2 al atacar una casilla llana** (campos o páramo) sin murallas; 0,5 en el bosque | Una casilla, o **dos por lo llano** si el grupo es solo de jinetes y la de en medio es tuya | No suben a la montaña. |
| **Catapultas** | 4 Madera + 2 Hierro | 0 | Una casilla | Cada una que ataca quita **25%** al bono de fortificación o de fortaleza (nunca al resto). Si el ataque fracasa, se pierden. No suben a la montaña. Comen como dos tropas. |

- Cada casilla guarda cuántas tropas tiene y, de ellas, cuántas son Jinetes y Catapultas. Cada orden dice lo mismo.
- **Bajas:** el ganador pierde tropas en proporción y, al redondear, caen antes Catapultas y Jinetes que Mesnada. En un repliegue vuelve la mitad de la Mesnada y de los Jinetes. Si el Pan no llega el domingo, desertan primero los de la Mesnada.
- En un choque frontal no hay terreno: cada tropa cuenta 1 (las catapultas, 0).
- La niebla esconde también de qué tipo son las tropas que no se ven.

Simulación (300 partidas de 6 semanas, `docs/simulaciones.md`): los bots reclutan un 9% de jinetes y un 2% de catapultas. Hay un 6% más de batallas entre casas y la ventaja del guerrero baja de 1,4 a 1,3 veces lo esperado.

### 8.10 Asedios (diseño v3, fase 3b)

- **Orden Sitiar:** un grupo de al menos 3 tropas rodea una **fortaleza** o un **castillo ajeno** vecino. No se mueve: sigue defendiendo su casilla.
- **Fortaleza sitiada:** cada noche de asedio pierde un 25% de murallas. Su +50% desaparece en dos noches, y se suma a lo que quiten las catapultas.
- **Castillo rodeado:** hay que sitiarlo a la vez desde **dos casillas propias**. Mientras dure, sus edificios producen la mitad y quien lo rodea gana **1 de Prestigio por noche** (hasta 10 en la partida). El castillo sigue sin poder conquistarse.
- **Se rompe** si atacan la casilla desde la que se sitia (aunque el ataque fracase) o si se pierde. **Se levanta** si nadie lo mantiene esa noche, y **termina** si la casilla sitiada cambia de manos.
- Las casillas solo fortificadas no se pueden sitiar. Se probó en la simulación y fortificar dejaba de servir: la arquitecta, que se defiende fortificando, se hundía.

### 8.11 El Capitán y la Gloria (diseño v3, fase 4)

- **Un Capitán por casa**, con nombre propio (Sir Gonzalo el Despistado y compañía). Empieza en el castillo y se ve en el mapa con un casco.
- **Suma 2 de fuerza** a la defensa de la casilla donde está y al grupo con el que sale. Al dar una orden desde su casilla se marca "Con el Capitán"; solo puede ir con un grupo.
- **Va solo (bloque 4):** también se mueve sin tropas, como una tropa (a una vecina, por camino o por mar), pero solo entre casillas propias, también a una vacía. Solo no ataca. En el mapa, «Mover al Capitán solo» en su casilla.
- **Cae preso** si su grupo pierde contra otra casa: un ataque que fracasa, un choque de frente perdido o la casilla donde estaba conquistada, también si estaba allí solo. Contra bandidos no cae preso: huye al castillo.
- **Preso:** quien lo captura puede **pedir un rescate** en Oro, sin límite, y cambiar el precio cuando quiera; su casa lo paga o no (sin contraoferta) y, si paga, el Capitán vuelve a su castillo en el momento (bloque 4). También puede **soltarlo** gratis. Si nadie paga, **se fuga a las 7 noches** y vuelve a su castillo. Mientras está preso, su casa lucha sin él.
- Si gana, avanza con sus tropas; si se retiran, vuelve con ellas (al castillo si su casilla se ha perdido).
- **Gloria (Prestigio permanente):** +1 por cada batalla ganada contra otra casa (atacando, defendiendo o en un choque de frente) y +1 de **honor** a quien pierde una casilla contra al menos el doble de fuerza. Máximo 8 en la partida.

Simulación (600 partidas de 6 semanas): un 25-27% más de batallas entre casas, los ataques triunfan algo menos (79% → 72%), caen unos 6 Capitanes por partida y el líder de la semana 2 gana igual o algo menos (29% → 27%).

### 8.12 Repetición de la noche, avisos y órdenes en cola (diseño v3, fase 5)

- **Repetición de la noche.** Al abrir el mapa tras una resolución, el mapa cuenta en unos 20 segundos lo que pasó: los ejércitos marchan de casilla en casilla, la cámara se acerca a cada batalla con la fuerza de cada bando y sus bajas, la casilla cambia de color con un barrido y Fray Abundio pone una línea del banco de frases (siempre la misma para la misma batalla). Después, los asedios con sus tiendas y los repliegues. Sale sola una vez por noche, se puede saltar y se puede volver a ver con "Ver la noche". Solo dibuja lo que la casa ve; las batallas fuera de su vista se cuentan al final.
- **Estandartes a la vista.** Si un grupo de otra casa entra esta noche en una casilla vecina a las tuyas, el parte de las 22:00 lo destaca ("Se ven estandartes de la Casa del Nabo en el Prado Pisoteado (5 tropas), junto a tu Molino") y la casilla tuya lleva un estandarte de aviso. En un bosque ajeno no se ve quién hay, así que no hay aviso.
- **Amenaza en el mapa.** Las casillas tuyas que un enemigo a la vista puede atacar en la próxima resolución (vecinas, por camino o a la carga) llevan un borde rojo discontinuo. Las órdenes del enemigo no se ven: es lo que podría hacer, no lo que hará. Los castillos no se marcan porque no se pueden atacar.
- **Órdenes en cola.** Se pueden dejar órdenes para la próxima resolución y las dos siguientes, eligiendo la noche encima del mapa. Para las noches siguientes, el mapa muestra cómo quedaría si todo sale como esperas (con lo que ves y sin las órdenes ajenas), y las órdenes de otras noches se ven punteadas. Al llegar su noche, **cada orden sale con las tropas que queden** en su casilla (por tipos y en el orden en que se dieron); si no queda ninguna, o la casilla ya no es tuya, no se cumple. Al quitar una orden, se quitan también las de la cola que dependían de ella.
- **Simular varias noches.** La simulación de la pestaña Órdenes recorre noche a noche todas las órdenes de la cola.

El ajuste a las tropas que queden también vale para las órdenes de la próxima noche (por ejemplo, si los bandidos se llevaron tropas). En la simulación de 100 partidas no cambia nada: los bots dan siempre órdenes que caben.

## 9. Comercio, subasta y pactos

El comercio es la mitad del juego, así que tiene que ser excelente:

- **Ofertas públicas o dirigidas.** Cada casa puede tener hasta 3 ofertas abiertas visibles para todos ("ofrezco X, pido Y") o enviar ofertas a una casa concreta. Se puede contraofertar.

- **Intercambio atómico.** Cuando alguien acepta, el servidor ejecuta los dos lados a la vez. Nadie tiene que fiarse de nadie en un cambio puntual.

- **Visibilidad.** Todos ven las ofertas abiertas y los tratos cerrados (sin las cantidades de los tratos dirigidos).

- **Trato válido para el Prestigio:** al menos 10 recursos por cada lado. Así no valen los intercambios vacíos para sumar puntos.

- **Gran Subasta del miércoles** (hecha en la versión 1).
  - **Lotes:** tres, anunciados el martes a las 22:00 y reproducibles a partir de la semilla de la partida. El primero es de recursos (30 de uno o 20 + 20 de dos), el segundo es una carta y el tercero es una cosa u otra.
  - **Pujas:** ciegas en Oro, una por lote y casa, cambiables hasta el cierre del miércoles (21:00). No se puede pujar más Oro del que se tiene.
  - **Adjudicación:** en la resolución del miércoles, antes de la campaña y lote a lote. Gana la puja más alta y, en empate, la más temprana. Si al ganador ya no le llega el Oro (por haber ganado otro lote), el lote pasa a la siguiente puja.
  - **El Oro de las pujas sale del juego.** En la simulación se pagan unos 450 de Oro por partida, que de otro modo se acumulaban sin uso.
  - **Logro:** cada lote ganado da +2 de Prestigio, hasta 3 veces.

- **Cartas de la Corona** (8, en `packages/engine/src/cards.ts`). Se usan una vez, desde el castillo:

| Carta | Efecto |
| --- | --- |
| Espía | Ves todas las casillas y tropas de una casa hasta la próxima resolución. |
| Muralla | Fortifica gratis una casilla tuya hasta que la ataquen (bloque 4; el mantenimiento del domingo sí se paga). |
| Mercenarios | 5 tropas en tu castillo. |
| Carreta | Cambia 20 de un recurso por 20 de otro. |
| Maestro de obras | Sube gratis un nivel un edificio de nivel 1, 2 o 3. |
| Diezmo | 3 de Oro por cada casilla que controles (sin el castillo). |
| Tregua | En la próxima resolución nadie puede atacar una casilla tuya: los ataques no salen y las tropas se quedan en casa. |
| Tambores de guerra | En la próxima resolución tus ataques tienen +25% de fuerza. |

- **Tratados comerciales** (versión 2): intercambios semanales automáticos (por ejemplo, 10 Madera por 6 Hierro durante 4 semanas) que ejecuta el servidor. Se pueden cancelar avisando con una resolución de antelación.

- **Palabra dada.** Los pactos de no agresión no obligan por reglas, pero se declaran en un registro público con nombre solemne. Romperlos deja una marca de broma en el historial y Fray Abundio lo cuenta en el boletín.

## 10. Eventos

Un evento cada semana, anunciado el martes a las 22:00 junto con los lotes de la Gran Subasta, para que nadie se lleve sorpresas. Son de efecto claro y se aplican a todos o a quien cumpla una condición pública. Cada evento sale una sola vez por partida, en un orden fijado por la semilla. Catálogo de 20 en `packages/engine/src/events.ts` (valores en `rules.ts`, hecho en la versión 1):

| Evento | Efecto | Cuándo |
| --- | --- | --- |
| La Gran Plaga de Ratas | -25% de Pan para todos | 7 días, de jueves a miércoles |
| Cosecha Gloriosa | +25% de un recurso (sale al azar) para todos | 7 días |
| La Fiebre del Oro | Los mercados producen el doble | 7 días |
| Tormenta en la Costa | Los puertos no producen | 7 días |
| El Gran Derrumbe | Canteras y montañas no producen | 7 días |
| La Fiesta de San Aldric | Toda la producción es doble | El jueves |
| Caminos Embarrados | +25% de defensa en todas las casillas | Resolución del miércoles |
| Fervor Guerrero | +25% de fuerza en todos los ataques | Resolución del miércoles |
| La Paz del Rey | Nadie puede atacar casillas de otras casas (las neutrales sí); esos ataques no salen | Resolución del miércoles |
| Los Bandidos del Camino | 6 bandidos atacan la casilla más alejada del castillo de la casa con más casillas. Si ganan, la casilla pasa a ser neutral | Tras la campaña del miércoles |
| El Tributo del Rey | Las dos casas con más Oro pagan el 20% de su Oro, que se reparte a partes iguales entre las demás | Miércoles |
| El Rey Ha Perdido las Llaves | +15 de Oro a quien más tratos válidos haya cerrado en los últimos 7 días (si empatan, a todas) | Miércoles |
| El Torneo Real | +20 de Oro a la casa con más tropas | Miércoles |
| Levas Reales | +3 tropas en el castillo de cada casa | Miércoles |
| Carnaval | +10 de Pan para todas las casas | Miércoles |
| La Limosna Real | +10 de cada recurso para la casa con menos Prestigio | Miércoles |
| Paga Atrasada | El mantenimiento del domingo cuesta el doble | Domingo |
| Indulgencia Real | El mantenimiento del domingo es gratis | Domingo |
| El Mercado Enloquece | Los lotes de la Gran Subasta de ese miércoles son dobles (el doble de recursos, o dos cartas) | Miércoles |
| Semana Tranquila | No pasa nada | — |

Varios eventos frenan al que va delante (Bandidos, Tributo) o ayudan al último (Limosna). En la simulación, los eventos no cambian el equilibrio: las personalidades siguen entre 0,7 y 1,3 veces lo esperado y el líder de la semana 2 gana igual (34-35%). El único efecto claro es la Paga Atrasada: con ella las deserciones pasan del 1% al 5% de las casas. Fray Abundio narra cada evento (banco de frases, sección 10).

## 11. Prestigio y victoria

### 11.1 Prestigio en vivo

El Prestigio es **un marcador del estado actual**, no una suma semana a semana. Se ve siempre en la clasificación y sube o baja según lo que tienes en cada momento:

| Fuente | Prestigio |
| --- | --- |
| **Territorio** | 2 por casilla controlada (antes 3; bloque 1); 5 si es una fortaleza y 1 si es un páramo |
| **Edificios** | 1 por cada nivel por encima de 1 (empiezas con 2, máximo 20), +1 extra por cada edificio a nivel 5 |
| **Riqueza** | 1 por cada 25 Oro en el tesoro (máximo 10) |
| **Comercio** | 2 por cada casa distinta con la que hayas cerrado un trato válido en los últimos 7 días (máximo 6) |
| **Asedios** | 1 por noche rodeando un castillo ajeno (máximo 10, sección 8.10) |
| **Gloria** | 1 por batalla ganada contra otra casa y 1 de honor por caer ante el doble de fuerza (máximo 8, sección 8.11) |
| **Logros** | Permanentes, no se pierden (sección 11.2) |

Así una ventaja temprana no se cobra seis veces, construir no es la vía segura que siempre gana y quien va detrás siempre puede remontar. En la simulación con estos valores, las estrategias puras acaban entre 20 y 30 de Prestigio y la mixta en unos 37.

### 11.2 Logros

Pocos y públicos, que dan Prestigio permanente:

- **Primera fortaleza:** la primera casa en tomar una fortaleza, +3.
- **Obra maestra:** la primera casa con un edificio a nivel 5, +3.
- **Ganador de subasta:** +2 por cada Gran Subasta ganada (máximo 3 veces).

### 11.3 Objetivo secreto

Al empezar, cada casa recibe dos objetivos al azar y elige uno. Nadie más lo conoce. Si al final de la partida se cumple, da **+6 de Prestigio**, y se revela en el último boletín.

Catálogo actual (10, en `packages/engine/src/objectives.ts`, umbrales en `rules.ts`): controlar un puerto y una montaña al final (antes «un puerto y una fortaleza»: con la geografía del bloque 1 los puertos quedan en la costa y las fortalezas tierra adentro, y bajó al 13%; con la montaña se cumple el 29%); sumar 16 niveles entre los cinco edificios (17 hasta el bloque 5, cuando las mejoras pasaron a costar más); terminar con 100 Oro o más (antes 200 y luego 150: con la subasta y las mejoras con Oro, el Oro se gasta); cerrar tratos válidos con 3 casas distintas; controlar una fortaleza al final; tomar 3 casillas a otras casas; terminar con 40 tropas o más; controlar 5 casillas o más al final; tener un edificio a nivel 5; cerrar 10 tratos válidos; ganar 3 lotes de la Gran Subasta (añadido en la versión 1). Los umbrales se ajustaron con la simulación del 16 de octubre de 2026: con los anteriores, terminar con 100 Oro se cumplía casi siempre y controlar 2 puertos o comerciar con todas casi nunca. Un segundo ajuste, con los bots con personalidad, cambió "los 5 edificios a nivel 3" (se cumplía el 97%) por "17 niveles" (35%), "6 casillas" (3%) por "5 casillas" (15%), abarató el nivel 5 de los edificios (de 200 a 155 recursos), bajó la guarnición de las fortalezas de 10 a 8 y fortificar a 8 de Piedra. Con la versión 1 se añadirán los de subastas (ganar 2 Gran Subastas) y pactos (firmar 2 pactos sin romper ninguno).

El objetivo se elige antes de la primera resolución; quien no elige se queda con la primera opción.

El objetivo secreto da una meta propia a quien va detrás y hace que el marcador nunca sea del todo seguro, lo que reduce el kingmaking: es difícil decidir quién gana desde abajo si no sabes quién va de verdad primero.

### 11.4 Final de la partida

- La partida termina tras la resolución del domingo de la última semana. Se revelan los objetivos secretos y gana la casa con más Prestigio.

- **Empate:** gana quien tenga más casillas; si persiste, más Oro.

- **Fin anticipado:** solo por acuerdo unánime de todas las casas.

## 12. Bola de nieve, kingmaking y abandonos

**Contra la bola de nieve:**
- Prestigio en vivo: lo que no mantienes, lo pierdes.
- Frenos suaves al líder: estirarse cuesta Pan, los bandidos, el Tributo del Rey y el favorito del cronista (Fray Abundio deja claro cada semana quién va primero).
- El comercio como arma: los demás pueden negarle tratos al líder o aliarse contra él, y ahora pueden atacar juntos gracias a los apoyos.
- Sin dados: nadie se hunde por mala suerte.

**Ayuda ligera al último:** cada domingo, la casa última en Prestigio recibe +3 recursos al día del tipo que elija durante la semana siguiente. Es pequeña y visible para todos.

**Contra el kingmaking:** objetivo secreto, Prestigio que se mueve hasta el final y partidas cortas (6 semanas) en las que todos siguen cerca.

**Contra los abandonos:**
- Nadie queda eliminado y el castillo siempre produce.
- El objetivo secreto y los títulos de fin de partida dan metas a quien no puede ganar.
- Piloto automático para los ausentes (sección 13).
- Partidas de 6 semanas, no de 8.

## 13. Respeto al tiempo

- **Notificaciones push** cuando: te llega una oferta, se anuncia el evento, quedan 2 horas para el cierre, hay resultados que te afectan o sale el boletín. En iPhone solo funcionan si el juego se añade a la pantalla de inicio y se abre desde ese icono; el juego lo pide con un aviso amable la primera vez.

- **Compartir en WhatsApp:** el boletín y las pantallas de resolución tienen un botón "Compartir en el grupo" que abre WhatsApp con el titular del cronista y un enlace. No se usa la API de WhatsApp para mensajes automáticos: se paga por mensaje y Meta tiene que aprobar las plantillas.

- **Órdenes programadas:** das las órdenes cuando te venga bien y se ejecutan en la resolución.

- **Nada importante en menos de 8 horas** y nunca de madrugada: todo se resuelve a las 22:00 en dos momentos fijos.

- **Sin ventaja por jugar más:** los recursos se acumulan y las resoluciones son fijas, así que entrar veinte veces al día no ayuda.

- **Piloto automático:** si pasas más de 3 días sin entrar, el sistema juega por ti con la plantilla que hayas elegido:
  - *Defensiva:* mantiene las tropas, fortifica la casilla más amenazada y recluta con lo que sobra.
  - *Económica:* mejora el edificio más barato posible y mantiene las tropas.
  - *Equilibrada:* alterna las dos.
  
  Además, tus casillas reciben +25% de defensa mientras dure la ausencia. El piloto nunca ataca, nunca rompe pactos y nunca acepta tratos. Se desactiva en cuanto vuelves a entrar.

- **Modo vacaciones:** si avisas antes de irte, se activa el piloto automático desde el primer día.

## 14. Capa social

- **La conversación va por WhatsApp.** El grupo ya habla allí, así que la primera versión no tiene chat propio. Dentro del juego quedan el registro público de pactos, el boletín y los avisos. Si se echan de menos los mensajes privados dentro del juego, se añaden en la versión 2.

- **Boletín semanal** tras la resolución del domingo: una crónica de Fray Abundio con lo que ha pasado (combates, pactos, subasta, clasificación). Es lo que alimenta las conversaciones del grupo.

- **Soborno al cronista:** una vez por semana, cada casa puede pagar Oro para salir bien parada en el boletín, aunque el cronista lo declara al pie (sección 17).

- **Títulos de fin de partida:** Rey Legítimo, Rey de Pacotilla (último), Traidor de la Corona (más pactos rotos), Mercader sin Escrúpulos (más tratos), Mariscal de la Retirada Estratégica (más repliegues) y Mecenas de la Mentira (más Oro en sobornos). Durante la partida se ve quién es candidato a cada uno, lo que da a todos algo por lo que pelear.

- **La Crónica Definitiva:** al final, Fray Abundio publica la historia del interregno reescrita a favor del ganador.

- **Temporadas:** un ranking acumulado entre amigos para que la siguiente partida tenga algo que ganar.

- **Reglas de convivencia:** las decide el grupo (por ejemplo, que no se usa el juego para venganzas de la vida real).

## 15. Ambientación y nombre

El juego se llama **Reyes de Pacotilla** y cuenta la disputa de unos pretendientes por un trono vacío. El rey Aldric ha muerto de forma poco épica (un hueso de pollo, aunque el cronista lo niega) sin dejar claro quién debe sucederle. Su testamento solo dice que gobierne el más capaz, y las llaves del tesoro han desaparecido. Cada jugador encabeza una casa con su propio castillo, y quien tenga más Prestigio al final del interregno es coronado.

| Elemento del juego | En la ambientación |
| --- | --- |
| Prestigio | Demostrar que eres el más capaz: tierras, obras, riqueza y comercio. |
| Castillo | Inconquistable: los pretendientes no se atreven a tomar el castillo ajeno, solo las tierras de alrededor. |
| Recursos | Pan, Madera, Piedra, Hierro y Oro. |
| Casillas | Campos, Bosque, Cantera, Montaña, Puerto y Fortaleza, con nombres cómicos (sección 6.3). El reino se llama Aldricia, el Reino Más o Menos Unido. |
| Cronista | Fray Abundio de la Pluma Larga, cronista de la corte sin mecenas (sección 17). |
| Objetivo secreto | La ambición oculta de cada casa, que solo se revela en la coronación. |
| Eventos | La Plaga de Ratas, El Rey Ha Perdido las Llaves, el Tributo del Rey y el fantasma del rey, que aparece a opinar (siempre citado y corregido por el cronista). |
| Temporadas | Cada partida es un interregno nuevo y quien gana es rey hasta el siguiente. |

## 16. Tono y voz

El tono es épico con humor: lo grande se cuenta con solemnidad y los detalles pequeños lo desmontan. Hay un solo narrador, Fray Abundio, para que todo suene coherente.

| Dónde | Cómo suena | Ejemplo |
| --- | --- | --- |
| Boletín semanal | Crónica grandilocuente con titulares ridículos. Es donde más se luce el humor. | Gran victoria en el Paso del Norte: las tropas de Marta aplastan a las de Dani, que alega que estaba mirando el móvil. |
| Eventos | Nombre épico, consecuencia cómica. | La Gran Plaga de Ratas (-25% de Pan para todos). |
| Títulos de fin de partida | Aquí se concentra el humor. | Traidor de la Corona, Mariscal de la Retirada Estratégica. |
| Interfaz | Clara y breve, con un guiño en lo cotidiano. | Tus tropas marchan al amanecer. / Sin Oro. Los banqueros ni os saludan. |
| Sprites | Estilo heroico con gags en las expresiones. | Un soldado con cara de agobio, un mercader con una bolsa enorme. |
| Pactos y traiciones | Solemne al firmar, casi de tribunal al romperse. | Se firma la Alianza de la Roca Eterna. / Pacto roto. La historia lo recordará. |

**Reglas para que no se pase de rosca**

- Épico en lo grande, humor en lo pequeño: lugares, titulares y títulos con humor; cifras y mecánicas con claridad total.

- Las bromas nunca tapan información importante (cierres, costes, resultados).

- El humor sale de la situación, no de ridiculizar a un jugador. Los apodos y títulos se hacen con cariño y con el visto bueno del grupo.

- El cronista mantiene siempre la misma voz.

## 17. El cronista: Fray Abundio de la Pluma Larga

### 17.1 Lo que nos enseña la investigación

- **Los narradores memorables son personajes.** Bastion, Darkest Dungeon y The Stanley Parable se recuerdan por su narrador. Pero la voz no basta: sin un guion fuerte, un narrador no funciona.

- **Saber callarse.** El narrador de The Stanley Parable solo habla cuando hace falta, e incluso los fans del de Darkest Dungeon piden a veces que se calle en combate. Con 6 semanas y 12 resoluciones, esto es clave.

- **Parcial antes que mentiroso.** Un narrador poco fiable funciona mejor cuando es parcial que cuando miente directamente.

- **Los cronistas reales vivían de su mecenas.** Froissart inclinaba su relato de la Guerra de los Cien Años según quién le pagara, y los cronistas medievales reconocían en sus prólogos que adulaban a los poderosos. Es justo la situación de un cronista con el trono vacío.

### 17.2 El personaje

**Fray Abundio de la Pluma Larga**, Cronista Mayor del Reino. Sirvió 30 años al difunto rey Aldric y se ha quedado sin mecenas. Lo único que le preocupa es seguir cobrando, así que adula a quien parezca que va a ganar. Como no sabe quién será, ha apostado por todos los pretendientes a la vez. En la interfaz se le llama "Fray Abundio" o "el Cronista".

### 17.3 Rasgos de carácter

| Rasgo | Cómo se nota en el juego |
| --- | --- |
| **Chaquetero.** Adula al líder de cada semana. | El boletín abre siempre con elogios al primero en Prestigio. Si cambia el líder, cambia de bando sin disimulo. Así todos ven quién es el favorito, lo que funciona como freno social al líder. |
| **Miente en los adjetivos, nunca en las cifras.** | Una retirada es "un repliegue genial", pero los números van siempre al lado, limpios y exactos. |
| **Obsesionado con el hueso de pollo.** | Niega que Aldric muriera atragantado: según él, "cayó combatiendo a un ave". Aparece una sola vez por partida. |
| **Escribe en los márgenes.** | Notas y dibujitos absurdos en el margen del pergamino. El humor va en el margen y la información en el cuerpo. |
| **Discute con el fantasma del rey.** | El fantasma nunca habla directamente. Fray Abundio cita lo que ha dicho y lo corrige. |

### 17.4 Cómo habla según el lugar

| Lugar | Cuánto habla | Ejemplo |
| --- | --- | --- |
| Boletín semanal | Mucho. Aquí se luce. | GLORIOSA JORNADA EN EL PUENTE QUE NADIE CRUZA. Las huestes de Dani (12 tropas) caen ante Marta (20). El cronista, que siempre creyó en Marta, lo celebra. |
| Eventos | Un titular y una línea. | La Gran Plaga de Ratas. Las ratas reclaman su parte de la cosecha: -25% de Pan para todos. |
| Interfaz | Casi nada: estados vacíos, errores y confirmaciones. | Órdenes selladas. |
| Notificaciones | La información primero y, como mucho, cinco palabras suyas. | Cierre en 2 h. Fray Abundio se impacienta. |
| Pactos | Solemne al firmar, de tribunal al romperse. | Pacto roto. Fray Abundio lo apunta con tinta indeleble. |
| Pantalla de resolución | Una frase por combate. | Villa Mediocre cambia de dueño. Sigue igual de mediocre. |

### 17.5 Reglas de mesura

- Cada tipo de frase tiene varias variantes y no se repite ninguna hasta haber usado todas.
- La interfaz queda casi en silencio.
- Opción de "cronista breve" en los ajustes, para quien solo quiera los datos.
- Nunca se ríe de un jugador por algo de fuera del juego, y nunca tapa una cifra, un cierre o un resultado.

### 17.6 Sobornar al cronista

Hecho en la versión 1: en la pestaña Reino, cualquier día de la semana hasta el cierre del domingo.

- Una vez por semana, cada casa puede pagar **10 Oro** antes del cierre del domingo para que el boletín incluya una frase halagadora sobre ella.
- La frase se elige de una lista de plantillas que hablan **solo de uno mismo**: no sirve para hablar mal de nadie.
- No da Prestigio ni ventajas. El Oro sale del juego, así que tiene un coste real (40 Oro de sobornos equivalen a más de un punto de riqueza).
- Fray Abundio lo declara al pie del boletín: "Esta crónica cuenta con el generoso patrocinio de la Casa de Pablo".
- Quien más Oro gaste en sobornos recibe al final el título de **Mecenas de la Mentira**.

### 17.6 bis El boletín semanal (hecho en la versión 1)

Se publica cada domingo tras la resolución (`packages/engine/src/bulletin.ts`), con los hechos públicos desde el boletín anterior. Se lee en pergamino en la pestaña Reino y llega un aviso al móvil. Tiene botón para compartirlo en WhatsApp como texto. El orden:

1. **Titular:** cambio de favorito, casillas que cambian de bandera, murallas que aguantan o semana tranquila.
2. **El favorito:** elogio al líder o, si es nuevo, cambio de bando.
3. **Los pretendientes:** solo en el primer boletín, con escudo y lema. La casa de la gallina tiene su frase.
4. **Crónica de las armas:** batallas entre casas (hasta 5), conquistas neutrales (hasta 3, y el resto resumido), apoyos y rebotes.
5. **Mercados y augurios:** el evento, la Gran Subasta y el comercio.
6. **Obras y honores:** logros y mejoras de nivel 3 o más.
7. **Noticias de las casas:** el lema contra la realidad y el último.
8. **Del difunto rey:** la versión oficial de su muerte, una vez por partida, o su fantasma.
9. **Comunicados de la corte:** las frases compradas, con el pie de patrocinio.
10. **Notas al margen:** una o dos.

El último boletín sale con el final: revela las ambiciones secretas y nombra al Mecenas de la Mentira. Las frases no se repiten en la partida hasta agotar su tipo (tabla `phrase_usage`). Las cifras salen siempre del registro.

### 17.7 La Crónica Definitiva

- Al terminar la partida, Fray Abundio publica la historia completa del interregno, **reescrita a favor del ganador**: sus derrotas pasan a ser "pruebas de humildad" y sus traiciones, "visión de estado".
- Las cifras no cambian; solo los adjetivos.
- Se genera a partir de los boletines y del registro de eventos, y se puede compartir como recuerdo del grupo.

### 17.8 Aspecto visual

Retrato pequeño en pixel art: monje mayor, tonsura despeinada, gafas de culo de botella (anacronismo deliberado) y una pluma exageradamente larga. Cinco expresiones: solemne (cabecera y eventos), adulador (líder y sobornos), escandalizado (pactos rotos y derrotas sonadas), dormido (semanas tranquilas) y contando monedas (pie de patrocinio).

### 17.9 Banco de frases

El banco completo está en el documento aparte **Banco de frases de Fray Abundio**, dentro del proyecto. En el código vivirá en un archivo de textos, con plantillas y variables.

## 18. Las casas de los pretendientes

Cada jugador crea su casa al empezar: nombre, escudo y lema. Es una personalización básica que se completa en menos de un minuto.

### 18.1 Qué elige cada jugador

| Elemento | Opciones | Notas |
| --- | --- | --- |
| **Nombre de la casa** | Texto libre ("Casa de…"), hasta 20 caracteres | Botón de sugerencia aleatoria ("Casa del Nabo Altivo"). |
| **Color de la casa** | 8 colores fijos | Es tu color en el mapa, así que no se repite. Se elige por orden de llegada. |
| **Forma del escudo** | 5 formas | Español, apuntado, almendrado, rodela y estandarte de cola de golondrina. |
| **División** | 4 divisiones | Pleno, partido, cortado y tronchado. Con división se añade un segundo color. |
| **Símbolo** | 16 símbolos | Siempre en oro o plata. |
| **Lema** | Opcional, hasta 40 caracteres | Fray Abundio lo cita, a menudo con ironía. |

### 18.2 Paleta de las casas

Ocho colores comprobados con simulación de daltonismo y de contraste: con plata todos pasan de 4,5:1 y con oro todos llegan al menos a 3:1.

| Color (heráldica) | En la interfaz | Hex | Contraste con plata / oro |
| --- | --- | --- | --- |
| Gules | Rojo | #B3291D | 5,2 / 3,5 |
| Azur | Azul | #1B3C80 | 8,4 / 5,7 |
| Sinople | Verde | #246B2A | 5,2 / 3,5 |
| Sable | Negro | #1E1E24 | 13,3 / 9,0 |
| Púrpura | Púrpura | #A23C9E | 4,6 / 3,1 |
| Naranjado | Naranja | #A84E0F | 4,5 / 3,0 |
| Aguamarina | Aguamarina | #0E6A6E | 5,1 / 3,4 |
| Leonado | Marrón | #4E2F18 | 9,6 / 6,5 |

- **Metales:** oro #E8B83A y plata #E6E6E6.
- **Regla del esmalte y el metal:** el símbolo siempre es de metal sobre el color de la casa, así que todos los escudos se leen a tamaño pequeño.
- **Pares que se parecen con daltonismo:** rojo y naranja, verde y aguamarina, verde y naranja. Por eso cada casilla controlada lleva un banderín con el escudo: la forma y el símbolo distinguen a las casas aunque el color no lo haga.
- Los nombres heráldicos solo se usan en el boletín.

### 18.3 Símbolos

| Heroicos | De pacotilla |
| --- | --- |
| León | Gallina |
| Águila | Cerdo |
| Torre | Nabo |
| Espada | Caracol |
| Corona | Pato |
| Llave | Queso |
| Lobo | Bota |
| Dragón | Cuchara |

La gallina recuerda el hueso de pollo del rey y provoca una reacción de Fray Abundio; la llave, las llaves perdidas del tesoro; el caracol, los caracoles que luchan contra caballeros en los manuscritos medievales. Si el dragón no se entiende a tamaño de banderín, se sustituye por un ciervo.

### 18.4 El lema

Opcional, con sugerencias en latín macarrónico ("Nabus Vincit", "Ora et Comercia", "Veni, Vidi, Negocié"). Fray Abundio lo usa con ironía cuando la realidad lo contradice: "La Casa del Nabo Altivo, cuyo lema es *Jamás retroceder*, retrocede dos casillas". El grupo puede pedir que se cambie un lema que moleste.

### 18.5 Reglas prácticas

- **Escudos únicos:** el color no se repite y tampoco puede haber dos escudos con la misma forma y el mismo símbolo.
- **Se guarda en el perfil:** se puede cambiar entre partidas, pero no durante una.
- **Dónde aparece:** en el mapa (tinte y banderines), la clasificación, las ofertas, el boletín, la Crónica Definitiva y el ranking de temporadas. El primer boletín presenta a todas las casas.
- **Técnica:** el escudo se guarda como unos pocos campos y el cliente lo compone. Las piezas son plantillas que se tiñen con cambio de paleta (unos 25 sprites).
- **Cómo está hecho (versión 1):** el creador de escudos aparece al unirse y en la sala de espera (se puede retocar hasta que empieza la partida). Las reglas viven en el motor (`packages/engine/src/heraldry.ts`: `checkShield` y `blazon`) y el servidor las comprueba al unirse y al retocar (`PUT /api/partidas/:id/casa`). El escudo es una rejilla de 16x18: la forma sale de una máscara, la división reparte los dos colores y el símbolo (rejilla de hasta 10x10) se pinta encima en oro o plata. Los bots reciben escudos variados con `freeShield`. En el boletín, "partido de gules y azur con nabo de oro".

## 19. Dirección artística

Pixel art en lo jugable, interfaz plana y limpia en lo informativo y un toque de pergamino en lo narrativo.

| Zona | Estilo | Por qué |
| --- | --- | --- |
| Mapa, casillas, edificios, tropas, castillos, escudos e iconos de recursos | Pixel art | Es donde el encanto se nota y las formas simples funcionan bien en una cuadrícula. |
| Paneles, números, ofertas, botones y listas | Plano y limpio, con tipografía normal | Aquí manda la legibilidad. |
| Boletín y pantallas de resolución | Pergamino con ilustraciones pixeladas y notas al margen | Son los momentos sociales, donde se busca ambiente. |

**Reglas para que todo parezca de la misma mano**

- **Rejilla de 64x64 píxeles por casilla** en el mapa, ampliada x2 (128 px por casilla); el mapa se desplaza y tiene vista de conjunto. Iconos de 12 a 32 píxeles.
- Paleta limitada de 16-32 colores. Cada recurso tiene un color y además una forma distinta.
- El color de cada casa se aplica con cambio de paleta, sin dibujar versiones distintas de cada sprite.
- Escalado siempre en números enteros (x2, x3, x4).
- Los textos y los números van siempre en HTML, nunca dentro de un sprite.
- **Primera versión:** unos 90-110 sprites (6 tipos de casilla, 5 recursos, 5 edificios con 2-3 aspectos por nivel, tropas, castillo, fortaleza, 5 retratos de Fray Abundio y unas 25 piezas de escudo).
- **Hecho en la versión 1** (`apps/web/src/art`): casillas de 32x32 dibujadas con código (suelo con textura, objetos con luz arriba a la izquierda, sombra en el suelo y contorno; castillo con torres, tejados y la bandera de su dueño; puerto con muelle, barca y choza; campos con espantapájaros), recursos de 16x16, escudos de 16x18 con luz y sombra (el símbolo proyecta sombra), Fray Abundio de 32x32 con sus 5 caras e iconos de 12x12 para las pestañas. Se pintan como SVG nítido a cualquier tamaño. El boletín elige la cara del cronista según lo que cuenta: escandalizado si se roban casillas, adulador con favorito nuevo o en la coronación, dormido si no pasa nada y solemne en el resto; el pie de patrocinio cuenta monedas. Quedan para más adelante los edificios por nivel y las tropas.
- **Estilo de la interfaz: «mesa de guerra».** La partida se juega sobre una mesa de nogal: la cabecera y las pestañas son tablones de madera, el latón marca lo importante (botón principal, cuenta atrás, pestaña activa) y los paneles son pliegos de vitela. El mapa es un tablero continuo y enmarcado: cada casa se distingue por una frontera de su color (solo donde cambia el dueño) y un banderín con su escudo; lo que queda fuera de la vista se ve apagado y con bruma. Los botones tienen relieve y se hunden al pulsarlos. Letras: Pixelify Sans para cifras y cuentas atrás, Alegreya Sans para la interfaz y Alegreya para el boletín y la crónica, servidas desde la propia web (funcionan sin conexión).
- **El mapa como una región de verdad (versión 1).** Se pinta entero en un solo lienzo (`apps/web/src/art/world.ts`), no casilla a casilla, para que todo encaje. Cada casilla mide 64x64 píxeles de dibujo y se ve al doble (unas 3 casillas de ancho en un móvil): el mapa se desplaza con el dedo, se abre centrado en tu castillo y tiene un botón «Ver todo el reino» para la vista de conjunto (tocar una casilla en esa vista acerca el mapa a ella). Con ese tamaño caben detalles: castillos con torre del homenaje, aldea y escudo sobre la puerta; granjas y molinos; bosques de frondosas y coníferas con algún ciervo; canteras con grúa; puertos con muelle, dos barcas y almacén. Lo que se aprendió de otros juegos:
  - *Carcassonne*: las losetas gustan porque lo que cruza el borde continúa al otro lado (caminos, campos, ciudades). Aquí el suelo, las parcelas de cultivo y los bosques se dibujan en coordenadas del mundo y siguen en la casilla vecina; los caminos unen cada castillo con la fortaleza más cercana evitando montañas y puertos.
  - *Battle for Wesnoth*: cada terreno pinta una transición sobre el vecino y lo alto (montañas) puede asomar sobre la casilla de arriba. Aquí hay una franja tramada entre terrenos distintos, arena junto al agua, puertos que forman bahías unidas entre sí y con el mar del borde, y cordilleras cuando dos montañas se tocan.
  - *Carcassonne en Board Game Arena y Catan*: las quejas más repetidas son de contraste y de colores que se confunden. Cada terreno se distingue por su forma y su textura, no solo por el color, y el territorio lleva el escudo de la casa.
  - *Civilization VI frente a V*: los jugadores piden fronteras limpias y un velo de color dentro del territorio en vez de una maraña de líneas. Aquí la frontera solo se dibuja donde cambia el dueño, con un velo suave del color de la casa y un banderín por trozo de territorio.
  - *Into the Breach y Diplomacy*: lo que va a pasar y lo que pasó tiene que verse en el mapa. Tus órdenes son flechas (continuas para mover, discontinuas para apoyar, con el número de tropas) y la última resolución se puede ver como flechas de movimientos y espadas en las batallas.
  - *Diseño asíncrono (Soren Johnson)*: perder algo mientras no estabas sin ver qué pasó se vive como injusto. Por eso la última batalla deja tierra quemada, hogueras y humo en su casilla, y bajo el mapa hay un parte («4 batallas, 3 casillas cambian de bandera»).
- **Cómo se ve la guerra:** las tropas a la vista son figuras con el tabardo de su casa (una por cada 3, hasta 5, y un abanderado desde 6); las neutrales visten de gris. Una casilla fortificada se rodea de una empalizada. Lo que no se ve queda como un mapa viejo en sepia, con el borde difuminado y jirones de bruma. El mapa está quieto: se probó animar agua y banderas con dos fotogramas y se quitó porque el parpadeo molestaba.
- **Quién dibuja y cómo:** Claude, como pixel art hecho con código. Cada sprite es una rejilla de texto en la que cada letra es un color de la paleta y se convierte en imagen automáticamente. Así todo es coherente, se versiona en el repositorio y se retoca con facilidad. Será sencillo y funcional; si se quiere algo más trabajado, se sustituye sprite a sprite. No se usan imágenes generadas por IA, que salen poco consistentes entre sí. Desde octubre de 2026 el arte nuevo se diseña primero en **pxl** (pixel art desde código, con vista previa y revisión automática). Cuando se aprueba, `scripts/pxl-a-juego.mjs` lo convierte a la misma rejilla con paleta de `apps/web/src/art`; el proceso completo está en `docs/pixel-art.md`.

## 20. Arquitectura técnica

**Stack decidido:** TypeScript de punta a punta, alojado en Cloudflare. Lo programa Claude (con Claude Code) en el repositorio de GitHub del proyecto.

| Pieza | Elección | Por qué |
| --- | --- | --- |
| Lenguaje | TypeScript en cliente, servidor y motor | El motor de resolución se escribe una vez y lo usan el servidor y el botón Simular, así que la previsión y el resultado coinciden. |
| Cliente | React + Vite, como PWA instalable | Adaptado a móvil. Ser PWA es imprescindible para las notificaciones push en iPhone. |
| Servidor | Cloudflare Workers | El plan gratuito permite 100.000 peticiones al día. |
| Base de datos | Cloudflare D1 (SQL) | Gratis hasta 5 millones de filas leídas y 100.000 escritas al día, y 5 GB. |
| Tareas programadas | Cron Triggers de Cloudflare | Ver la nota sobre la hora. |
| Cuentas | Enlace de invitación con código personal, sin contraseñas | Es una mesa de amigos. |

**Decisiones y precauciones técnicas**

- **Los cron de Cloudflare van en UTC.** Para que las resoluciones sean siempre a las 22:00 de Madrid, también tras los cambios de horario, un cron se ejecuta cada hora y el código decide, en hora de Madrid, si toca producción o resolución. Cada tarea registra que se ha hecho, para que un reintento nunca la repita.

- **Inicio de sesión en iPhone.** Una app web instalada en la pantalla de inicio parece tener sus propias cookies, separadas de las de Safari, así que el enlace de invitación podría iniciar sesión en Safari y no en el juego instalado. Por eso cada jugador tiene también un **código corto** de 6 caracteres para entrar desde el juego instalado. Hay que probarlo en un iPhone real.

- **Seguridad de los enlaces.** Los enlaces que se comparten en WhatsApp nunca llevan el código personal, y el código se puede regenerar si se filtra.

- **Límite de cálculo.** El plan gratuito de Workers da 10 ms de CPU por petición. Una resolución de hasta 36 casillas debería caber; si no, el plan de pago cuesta unos 5 $ al mes. Se descartó Supabase porque su plan gratuito pausa los proyectos con poca actividad en 7 días.

- **Motor de resolución como función pura:** recibe el estado y todas las órdenes y devuelve el nuevo estado y un registro de eventos. Es determinista, se prueba con los ejemplos de la sección 8 y permite repetir cualquier resolución.

- **Transacciones atómicas** para todos los intercambios y para cada resolución.

- **Base de datos:** 24 tablas, detalladas en el documento **Esquema de la base de datos**. Las tropas se guardan en las casillas (no hay tabla de ejércitos), los recursos no pueden ser negativos por restricción de la propia base y todas las tareas programadas son idempotentes.

- **Textos separados del código:** la interfaz y el banco de frases del cronista viven en un archivo de textos (por ejemplo `es.json`). El juego es solo en español, pero queda listo para traducirse. El boletín se genera a partir del registro de eventos.

## 21. Hoja de ruta

1. **Prototipo sin código:** una mini-partida con los amigos usando una hoja de cálculo, resolviendo a mano dos resoluciones y escribiendo a mano un boletín en la voz de Fray Abundio.
2. **Script de simulación:** partidas con jugadores ficticios para afinar costes, guarniciones y Prestigio. Comparte el motor con el juego.
3. **MVP 1 (hecho):** cuentas por invitación y código, casa (nombre, color y lema), mapa justo con niebla de guerra, producción, construir, reclutar, fortificar, órdenes de mover y apoyar con simulación, resolución con rebotes, mantenimiento con deserciones, ayuda al último y Prestigio en vivo.
4. **MVP 2 (hecho):** comercio (ofertas públicas y dirigidas, contraofertas y aceptación atómica sin dobles aceptaciones), objetivos secretos, logros de primera fortaleza y obra maestra, piloto automático y modo vacaciones, notificaciones push y final de partida con revelación de objetivos y coronación.
5. **Partida piloto de 4 semanas** con los amigos (en la simulación, las partidas de 2 semanas las gana casi siempre quien va primero en la segunda semana). Antes, partidas de prueba contra bots y el simulador (`npm run simular`, resultados en `docs/simulaciones.md`).
6. **Versión 1:** Gran Subasta y cartas (hecho), eventos (hecho), boletín con Fray Abundio (incluido el soborno y el botón de compartir en WhatsApp; hecho), creador de escudos y lemas (hecho) y pixel art de casillas, recursos, escudos y Fray Abundio (hecho).
7. **Primera partida completa de 6 semanas.**
8. **Versión 2:** tratados comerciales, mensajes privados, temporadas, títulos y la Crónica Definitiva.

## 22. Valores a afinar

Todos son valores de partida. El simulador (`npm run simular`) ya ajustó el coste de las tropas, el mantenimiento, los costes de mejora y los objetivos secretos (ver `docs/simulaciones.md`). Quedan por afinar, con más simulaciones y la partida piloto:

- Costes de mejora (objetivo: que solo construyendo no se llegue a todo nivel 5 antes de la última semana).
- Guarniciones neutrales (objetivo: la expansión ocupa las dos o tres primeras semanas y después llega el contacto entre casas).
- Pesos del Prestigio (objetivo: ninguna estrategia pura supera a una mezcla bien jugada).
- Valor del objetivo secreto (+6): suficiente para dar esperanza, pero no para decidir la partida solo.
- Bonificaciones de defensa: atacar debe ser posible pero no trivial.
- Mantenimiento y coste de estirarse.
- Precio del soborno (10 Oro).
- Dureza y frecuencia de los eventos.

## 23. Estado actual y próximos pasos

**Decidido**

- Juego de navegador para 4-8 amigos, con una sesión corta al día y dos resoluciones por semana.
- Partidas de 6 semanas (configurables a 4, 6 u 8), con una piloto de 4 semanas antes de la primera completa. El número de jugadores se fija al invitar.
- Mezcla de comercio, conquista y construcción, sin puntos de acción.
- Prestigio en vivo, logros y objetivo secreto.
- Combate determinista con apoyos y rebotes, al estilo de Diplomacy, y niebla de guerra.
- Ambientación, nombre, tono, Fray Abundio (con soborno y Crónica Definitiva), casas personalizables y nombres del mapa.
- Estilo visual: pixel art 16x16 en lo jugable, interfaz plana y pergamino en el boletín.
- Reparto: Claude programa (con Claude Code) y dibuja; Pablo dirige el diseño, revisa el arte y los textos, organiza al grupo y arbitra las pruebas.
- Parte técnica: TypeScript, PWA con React + Vite, Cloudflare Workers, D1 y Cron Triggers, invitaciones con código.
- Notificaciones push y botón de compartir en WhatsApp; la conversación del grupo sigue en WhatsApp.
- Horarios: hora de Madrid, cierres a las 21:00 y resoluciones a las 22:00.
- Idioma: solo español, con los textos en archivos aparte.
- Esquema de la base de datos (documento aparte).

**Pendiente de definir**

| Tema | Qué falta | Prioridad |
| --- | --- | --- |
| Catálogo completo | Unos 20 eventos, 8-10 cartas de la Corona y 10-12 objetivos secretos, con efectos exactos. | Media |

**Cosas a comprobar en la piloto**

- Que los números aguantan: expansión, ritmo de construcción y Prestigio final.
- Que el combate se entiende con los ejemplos y el botón Simular.
- Que la ayuda al último y el objetivo secreto se sienten justos.
- Que el tono de Fray Abundio, el soborno y la marca de pacto roto divierten y no molestan.
- Que el inicio de sesión funciona en iPhone con el juego instalado, y que las notificaciones llegan.
- Que los escudos y la paleta se distinguen en móviles reales, también con daltonismo.
- Que la complejidad no abruma en la primera semana; si hace falta, se añade una guía de la primera semana narrada por el cronista.
- Que *Reyes de Pacotilla* está libre como dominio (en una búsqueda rápida no apareció ningún juego con ese nombre).

**Cambios del diseño v1 al v2**

- Se eliminan los puntos de acción: la simulación mostró que no limitaban nada.
- El Prestigio pasa de sumarse cada semana a medirse en vivo, para frenar la bola de nieve y permitir remontar.
- Se añaden logros y objetivo secreto, contra el kingmaking y los abandonos.
- El combate se formaliza: apoyos, rebotes, intercambios, bajas con redondeo y repliegue de los atacantes. El apoyo pasa de la versión 2 al MVP 2.
- Se define la niebla de guerra.
- Mapas más grandes (unas 4 neutrales por casa) y guarniciones según el tipo de casilla.
- Costes de mejora más altos en los niveles 4 y 5.
- Tratos válidos de al menos 10 recursos por lado.
- Sin chat propio en la primera versión: el grupo habla por WhatsApp.
- "Pan" en todas partes, en vez de "Comida".
- Precauciones técnicas: cron horario en hora de Madrid, código corto para iPhone y enlaces sin datos personales.
- El fin anticipado queda solo por acuerdo unánime.

**Próximos pasos**

1. Publicar en Cloudflare (hecho) y jugar la partida piloto de 4 semanas con el grupo.
2. Completar los catálogos de eventos y cartas, y los objetivos secretos de subastas y pactos.
3. Script de simulación para afinar los números.
4. Versión 1 (hecha): Gran Subasta y cartas, eventos, boletín de Fray Abundio con soborno, creador de escudos, pixel art y botón de compartir en WhatsApp.

## 24. Fuentes consultadas

- Neptune's Pride: FAQ oficial (triton.ironhelmet.com), análisis en Game Developer y diarios de partida de bit-tech.
- Subterfuge: artículo de Ron Carmel sobre calidad de vida (Game Developer), entrevista en MCV y reseñas de usuarios.
- Diplomacy: reglas oficiales y resumen de reglas en Wikibooks (apoyos, rebotes, intercambios), análisis de órdenes no enviadas y abandonos en diplom.org y la convocatoria de partidas online de LessWrong.
- Travian y Tribal Wars: reseñas en RPGnet, MMOBomb, Trustpilot y el análisis de Edery.
- Catan: reseñas en Colonist.io y foros de Steam y Quarter to Three, y debate sobre kingmaking.
- Risk: reseñas de Digitally Downloaded, GameSpot y Defector.
- Diseño de juegos: Games Precipice (equilibrio posicional y eliminación), League of Game Makers (mecanismos de ayuda al último) y The Thoughtful Gamer (kingmaking como reto de diseño).
- Narradores en videojuegos: artículos de TechRaptor sobre Darkest Dungeon, The Stanley Parable y Biomutant, discusiones de Steam y foros de Choice of Games sobre narradores parciales.
- Cronistas medievales: ficha de las Crónicas de Jean Froissart (EBSCO) y resúmenes de The Medieval Chronicle.
- Parte técnica: documentación de Cloudflare (precios de Workers y D1), iTime (cron de Cloudflare en UTC), documentación de Supabase (pausa de proyectos), Courier (precios de WhatsApp Business), Pushpad (notificaciones push en iOS), foro de Xojo (cookies de las apps web en iOS) y 9to5Mac (apps web de iOS en la UE).

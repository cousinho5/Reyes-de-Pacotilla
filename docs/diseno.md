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
| **Cada día, a las 00:00** | Producción diaria de recursos. |
| **Cada día** | Entras, construyes, reclutas, fortificas, das o cambias órdenes, comercias y negocias. |
| **Martes, 22:00** | Se anuncian el evento del miércoles y los lotes de la Gran Subasta. |
| **Miércoles, 21:00** | Cierre de órdenes y de pujas. |
| **Miércoles, 22:00** | **Resolución 1:** subasta, evento y campaña (movimientos y combates). |
| **Domingo, 21:00** | Cierre de órdenes y de sobornos al cronista. |
| **Domingo, 22:00** | **Resolución 2:** campaña, mantenimiento, ayuda al último y boletín semanal de Fray Abundio. |

Las órdenes se pueden dar y cambiar en cualquier momento antes del cierre, así que no hace falta conectarse justo antes. Una partida estándar dura 6 semanas (12 resoluciones) y se puede configurar a 4, 6 u 8.

## 5. Recursos y edificios

Cinco recursos. En las reglas, la interfaz y el código se usa siempre la misma palabra: **Pan**, no Comida.

| Recurso | Uso principal | Uso secundario |
| --- | --- | --- |
| **Pan** | Mantenimiento de tropas | Reclutar |
| **Madera** | Mejorar edificios | — |
| **Piedra** | Mejorar edificios | Fortificar casillas |
| **Hierro** | Reclutar tropas | Mejoras de nivel 4 y 5 |
| **Oro** | Pujas, comercio y sobornos | Prestigio por riqueza, mejora de nivel 5 |

**Edificios.** Hay cinco, dentro de tu castillo, con niveles del 1 al 5: Granja (Pan), Aserradero (Madera), Cantera (Piedra), Mina (Hierro) y Mercado (Oro).

- **Producción diaria por edificio:** nivel 1 = 2, nivel 2 = 4, nivel 3 = 6, nivel 4 = 8, nivel 5 = 10.

- **Inicio:** dos edificios en nivel 2 (las especialidades de cada casa, repartidas para que todos dependan del comercio) y tres en nivel 1. Son 14 recursos al día.

- **Los edificios no se pueden perder**, porque están dentro del castillo. Por eso no hace falta un ingreso mínimo aparte: siempre produces.

- **Coste de mejora (valores de partida):**

| Subir a | Coste | Total |
| --- | --- | --- |
| Nivel 2 | 12 Madera + 12 Piedra | 24 |
| Nivel 3 | 25 Madera + 25 Piedra | 50 |
| Nivel 4 | 40 Madera + 40 Piedra + 25 Hierro | 105 |
| Nivel 5 | 60 Madera + 60 Piedra + 40 Hierro + 40 Oro | 200 |

Una mejora se nota en la producción del día siguiente. En la simulación, quien solo construye tiene casi todo a nivel 5 al final de la sexta semana, no antes, así que construir siempre tiene sentido.

## 6. El mapa

### 6.1 Tamaño y casillas

El mapa es una cuadrícula que escala con el número de jugadores, con unas 4 casillas neutrales por casa para que la expansión dure las primeras semanas antes del contacto. Tiene como máximo 6 columnas para que quepa en el ancho de un móvil.

| Jugadores | Cuadrícula | Casillas | Neutrales |
| --- | --- | --- | --- |
| 4 | 5x4 | 20 | 16 |
| 5 | 6x4 | 24 | 19 |
| 6 | 6x5 | 30 | 24 |
| 7 | 6x5 | 30 | 23 |
| 8 | 6x6 | 36 | 28 |

- Cada casa empieza en su **castillo**, en el borde del mapa. El castillo **no se puede conquistar**: los pretendientes no se atreven a tomar el castillo ajeno, solo las tierras de alrededor.

- **Tipos de casilla y guarnición neutral inicial:**

| Tipo | Produce al día | Guarnición neutral | Notas |
| --- | --- | --- | --- |
| Campos | +2 Pan | 4 | |
| Bosque | +2 Madera | 4 | |
| Cantera | +2 Piedra | 6 | |
| Montaña | +2 Hierro | 6 | |
| Puerto | +2 Oro | 8 | La única casilla que produce Oro |
| Fortaleza | Nada | 10 | El defensor tiene +50% adicional y da más Prestigio |

- Las guarniciones neutrales no atacan (salvo en el evento de los bandidos) y no crecen.

- Se controla una casilla teniendo al menos 1 tropa en ella. Si una casilla se queda vacía, sigue siendo tuya hasta que otro entre.

- El mapa se genera a partir de una semilla para que sea justo: cada casa tiene alrededor una mezcla parecida de tipos de casilla.

### 6.2 Qué ve cada jugador (niebla de guerra)

- **Ves con detalle** tus casillas y las adyacentes a ellas (incluido tu castillo): quién las controla, cuántas tropas hay y si están fortificadas.

- **Del resto del mapa** solo ves quién controla cada casilla.

- **Los recursos y el Oro de los demás** son secretos. El Prestigio sí es público (sección 11), y algunos eventos y cartas revelan pistas.

- **Las órdenes de los demás** son siempre secretas hasta la resolución.

### 6.3 Nombres del mapa

- **El reino:** Aldricia, el Reino Más o Menos Unido.

- **Castillos:** se llaman según la casa ("Castillo de la Casa del Nabo Altivo").

- **Casillas neutrales:** reserva de nombres por tipo. Cada partida saca los suyos al azar. Con 8 jugadores hacen falta hasta 28 nombres, así que la reserva debe llegar a unos 8 por tipo; los 30 primeros están aquí y se ampliarán.

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
| Reclutar | 2 Hierro + 1 Pan por tropa | Las tropas aparecen en tu castillo y pueden recibir órdenes para la siguiente resolución. |
| Fortificar una casilla tuya | 10 Piedra | +25% de defensa durante las dos resoluciones siguientes. |
| Dar órdenes | Gratis | Mover, atacar, apoyar o mantener (sección 8). |
| Comerciar | Gratis | Ofertas, contraofertas y tratados (sección 9). |

Lo que lleva al jugador a entrar a diario no es una obligación, sino que cada día hay recursos nuevos que gastar, ofertas que mirar y algo que negociar. Si un día no entras, no pierdes nada: los recursos se acumulan.

## 8. Órdenes y combate

### 8.1 Órdenes

Cada grupo de tropas recibe una orden por resolución. Puedes dividir las tropas de una casilla en varios grupos con órdenes distintas.

| Orden | Efecto |
| --- | --- |
| **Mantener** (por defecto) | El grupo se queda y defiende su casilla. |
| **Mover / atacar** | El grupo intenta entrar en una casilla adyacente (sin diagonales). Si es tuya o está vacía y nadie más entra, simplemente se mueve. |
| **Apoyar** | El grupo se queda donde está y suma su fuerza a un ataque o a una defensa en una casilla adyacente. Se puede apoyar a otra casa. |

Las tropas se mueven como máximo una casilla por resolución, dos por semana.

### 8.2 Fuerza

- **Fuerza de ataque** = tropas del grupo que ataca + tropas de los grupos que lo apoyan.

- **Fuerza de defensa** = (tropas que mantienen la casilla × bonificación) + tropas que apoyan la defensa.

- **Bonificación del defensor** (se suman): +25% por defender, +25% si la casilla está fortificada, +50% si es una fortaleza. Máximo, ×2.

- Los apoyos suman sus tropas sin bonificación.

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

- **Casillas que se vacían:** si un grupo sale de una casilla con éxito, otro puede entrar en ella en la misma resolución.

- **Tu propio fuego:** no puedes atacar tus propias casillas, y un ataque tuyo nunca corta un apoyo tuyo.

- **Castillos:** no se pueden atacar. Las tropas dentro de un castillo solo pueden salir o apoyar.

### 8.5 Ejemplos

- **Tomar una casilla neutral:** 7 tropas atacan unos Campos con 4 de guarnición. Defensa: 4 × 1,25 = 5. Gana el atacante y conserva 7 × (1 − 5/7) = 2 tropas.

- **Ataque con apoyo:** Marta ataca con 6 y Dani la apoya desde una casilla vecina con 4: fuerza 10. El defensor tiene 6 tropas en una casilla fortificada: 6 × 1,5 = 9. Gana Marta y conserva 6 × (1 − 9/10) = 0,6, que redondea a 1. Dani no pierde nada.

- **Rebote:** Pablo y Lucía atacan a la vez una casilla vacía, los dos con 5. Empate: ninguno entra y los dos se repliegan con 2 tropas.

- **Apoyo cortado:** Dani apoya a Marta, pero Lucía ataca la casilla de Dani. El apoyo se anula y Marta ataca solo con 6 contra 9: se repliega con 3.

### 8.6 Mantenimiento

- **Cada domingo:** 1 Pan por cada 4 tropas. Si no puedes pagar, desertan las tropas que falten por cubrir, empezando por las más alejadas del castillo.

- **Estirarse cuesta:** a partir de la quinta casilla controlada, cada casilla extra cuesta 2 Pan más por semana. Es un freno suave al que más se expande.

### 8.7 Previsualización

El botón **Simular** aplica tus órdenes al estado que conoces y te enseña el resultado previsto. Usa exactamente el mismo motor que el servidor, así que con la misma información el resultado coincide; lo que no sabes (las órdenes de los demás y lo que hay fuera de tu vista) sigue oculto.

## 9. Comercio, subasta y pactos

El comercio es la mitad del juego, así que tiene que ser excelente:

- **Ofertas públicas o dirigidas.** Cada casa puede tener hasta 3 ofertas abiertas visibles para todos ("ofrezco X, pido Y") o enviar ofertas a una casa concreta. Se puede contraofertar.

- **Intercambio atómico.** Cuando alguien acepta, el servidor ejecuta los dos lados a la vez. Nadie tiene que fiarse de nadie en un cambio puntual.

- **Visibilidad.** Todos ven las ofertas abiertas y los tratos cerrados (sin las cantidades de los tratos dirigidos).

- **Trato válido para el Prestigio:** al menos 10 recursos por cada lado. Así no valen los intercambios vacíos para sumar puntos.

- **Gran Subasta del miércoles.** Tres lotes anunciados el martes: paquetes de recursos o **cartas de la Corona** de un solo uso. Pujas ciegas en Oro; gana la más alta y, en empate, la más temprana. El Oro de las pujas sale del juego.

- **Cartas de la Corona (ejemplos):** Espía (ves las tropas de una casa durante una resolución), Muralla (una fortificación gratis), Mercenarios (5 tropas en tu castillo), Carreta (traslada 20 recursos de un tipo a otro).

- **Tratados comerciales** (versión 2): intercambios semanales automáticos (por ejemplo, 10 Madera por 6 Hierro durante 4 semanas) que ejecuta el servidor. Se pueden cancelar avisando con una resolución de antelación.

- **Palabra dada.** Los pactos de no agresión no obligan por reglas, pero se declaran en un registro público con nombre solemne. Romperlos deja una marca de broma en el historial y Fray Abundio lo cuenta en el boletín.

## 10. Eventos

Un evento cada miércoles, anunciado el martes por la noche para que nadie se lleve sorpresas. Son de efecto claro y se aplican a todos o a quien cumpla una condición pública.

| Evento | Efecto |
| --- | --- |
| La Gran Plaga de Ratas | -25% de producción de Pan para todos durante una semana. |
| Cosecha Gloriosa | +25% de producción de un recurso para todos durante una semana. |
| Los Bandidos del Camino | 6 bandidos atacan la casilla más alejada del castillo de la casa con más casillas. |
| El Tributo del Rey | Las dos casas con más Oro pagan el 20% de su Oro, que se reparte entre las demás. |
| La Fiesta de San Aldric | Ese día la producción es doble para todos. |
| El Rey Ha Perdido las Llaves | Quien tenga más tratos válidos esa semana encuentra las llaves: +15 Oro. |
| El Mercado Enloquece | Los lotes de la subasta de esa semana son dobles. |

Un catálogo de unos 20 eventos da variedad sin añadir complejidad. Fray Abundio narra cada uno (ver el banco de frases).

## 11. Prestigio y victoria

### 11.1 Prestigio en vivo

El Prestigio es **un marcador del estado actual**, no una suma semana a semana. Se ve siempre en la clasificación y sube o baja según lo que tienes en cada momento:

| Fuente | Prestigio |
| --- | --- |
| **Territorio** | 3 por casilla controlada; 5 si es una fortaleza |
| **Edificios** | 1 por cada nivel por encima de 1 (empiezas con 2, máximo 20), +1 extra por cada edificio a nivel 5 |
| **Riqueza** | 1 por cada 25 Oro en el tesoro (máximo 10) |
| **Comercio** | 2 por cada casa distinta con la que hayas cerrado un trato válido en los últimos 7 días (máximo 6) |
| **Logros** | Permanentes, no se pierden (sección 11.2) |

Así una ventaja temprana no se cobra seis veces, construir no es la vía segura que siempre gana y quien va detrás siempre puede remontar. En la simulación con estos valores, las estrategias puras acaban entre 20 y 30 de Prestigio y la mixta en unos 37.

### 11.2 Logros

Pocos y públicos, que dan Prestigio permanente:

- **Primera fortaleza:** la primera casa en tomar una fortaleza, +3.
- **Obra maestra:** la primera casa con un edificio a nivel 5, +3.
- **Ganador de subasta:** +2 por cada Gran Subasta ganada (máximo 3 veces).

### 11.3 Objetivo secreto

Al empezar, cada casa recibe dos objetivos al azar y elige uno. Nadie más lo conoce. Si al final de la partida se cumple, da **+6 de Prestigio**, y se revela en el último boletín.

Ejemplos: controlar 2 puertos al final; tener los 5 edificios a nivel 3 o más; terminar con 100 Oro o más; haber cerrado tratos válidos con todas las casas a lo largo de la partida; controlar una fortaleza al final; ganar 2 Gran Subastas; firmar 2 pactos y no romper ninguno; tomar al menos una casilla a otra casa; terminar con 30 tropas o más; controlar 6 casillas o más al final.

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

- Una vez por semana, cada casa puede pagar **10 Oro** antes del cierre del domingo para que el boletín incluya una frase halagadora sobre ella.
- La frase se elige de una lista de plantillas que hablan **solo de uno mismo**: no sirve para hablar mal de nadie.
- No da Prestigio ni ventajas. El Oro sale del juego, así que tiene un coste real (40 Oro de sobornos equivalen a más de un punto de riqueza).
- Fray Abundio lo declara al pie del boletín: "Esta crónica cuenta con el generoso patrocinio de la Casa de Pablo".
- Quien más Oro gaste en sobornos recibe al final el título de **Mecenas de la Mentira**.

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

## 19. Dirección artística

Pixel art en lo jugable, interfaz plana y limpia en lo informativo y un toque de pergamino en lo narrativo.

| Zona | Estilo | Por qué |
| --- | --- | --- |
| Mapa, casillas, edificios, tropas, castillos, escudos e iconos de recursos | Pixel art | Es donde el encanto se nota y las formas simples funcionan bien en una cuadrícula. |
| Paneles, números, ofertas, botones y listas | Plano y limpio, con tipografía normal | Aquí manda la legibilidad. |
| Boletín y pantallas de resolución | Pergamino con ilustraciones pixeladas y notas al margen | Son los momentos sociales, donde se busca ambiente. |

**Reglas para que todo parezca de la misma mano**

- **Rejilla de 16x16 píxeles**, ampliada x3 (48 px por casilla). Seis columnas de 48 px caben en un móvil de 360 px de ancho.
- Paleta limitada de 16-32 colores. Cada recurso tiene un color y además una forma distinta.
- El color de cada casa se aplica con cambio de paleta, sin dibujar versiones distintas de cada sprite.
- Escalado siempre en números enteros (x2, x3, x4).
- Los textos y los números van siempre en HTML, nunca dentro de un sprite.
- **Primera versión:** unos 90-110 sprites (6 tipos de casilla, 5 recursos, 5 edificios con 2-3 aspectos por nivel, tropas, castillo, fortaleza, 5 retratos de Fray Abundio y unas 25 piezas de escudo).
- **Quién dibuja y cómo:** Claude, como pixel art hecho con código. Cada sprite es una rejilla de texto en la que cada letra es un color de la paleta y se convierte en imagen automáticamente. Así todo es coherente, se versiona en el repositorio y se retoca con facilidad. Será sencillo y funcional; si se quiere algo más trabajado, se sustituye sprite a sprite. No se usan imágenes generadas por IA, que salen poco consistentes entre sí.

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
3. **MVP 1:** cuentas por invitación y código, casa (nombre y color), mapa con niebla de guerra, producción, construir, reclutar, órdenes de mover y mantener, resolución con rebotes, mantenimiento y Prestigio en vivo.
4. **MVP 2:** comercio (ofertas y aceptación atómica), apoyos, fortificar, objetivos secretos, logros, piloto automático y notificaciones push.
5. **Partida piloto de 2 semanas** con los amigos.
6. **Versión 1:** Gran Subasta y cartas, eventos, boletín con Fray Abundio (incluido el soborno), creador de escudos y lemas, y botón de compartir en WhatsApp.
7. **Primera partida completa de 6 semanas.**
8. **Versión 2:** tratados comerciales, mensajes privados, temporadas, títulos y la Crónica Definitiva.

## 22. Valores a afinar

Todos son valores de partida, comprobados con una simulación sencilla. Se afinarán con el script de simulación y la partida piloto:

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
- Partidas de 6 semanas (configurables a 4, 6 u 8), con una piloto de 2 semanas antes de la primera completa. El número de jugadores se fija al invitar.
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
| Reserva de nombres | Ampliar a unos 8 nombres por tipo de casilla para mapas de 8 jugadores. | Baja |

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

1. Completar los catálogos de eventos, cartas y objetivos secretos.
2. Prototipo sin código con los amigos.
3. Preparar el repositorio (estructura, migración inicial y despliegue en Cloudflare).
4. Script de simulación y MVP 1.

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

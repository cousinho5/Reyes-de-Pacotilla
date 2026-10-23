# Banco de frases de Fray Abundio

Banco de textos del cronista de Reyes de Pacotilla, versión 2 (adaptada al diseño v2: sin puntos de acción, con apoyos, rebotes, logros y objetivos secretos). Complementa la sección 17 del documento de diseño. En el código, las secciones 1 a 9 y 12 a 20 (y los avisos de alianzas, 11.15 a 11.19) están en `packages/engine/src/texts/cronista.ts` y los eventos en `packages/engine/src/events.ts`: si cambia una frase aquí, se cambia también allí.

## Cómo se usa

- **Variables.** Las palabras entre llaves las rellena el servidor (ver tabla). Los números siempre son exactos: Fray Abundio miente en los adjetivos, nunca en las cifras.

- **Sin repeticiones.** Dentro de una partida no se repite una variante hasta haber usado todas las de su tipo. Las frases del boletín no se repiten nunca en la misma partida (6 boletines en una partida estándar).

- **Frases de una vez por partida.** Las marcadas con (1/partida) aparecen como mucho una vez.

- **Cariño ante todo.** Las frases se ríen de la situación, nunca de la persona. Si alguna molesta al grupo, se quita.

- **Interfaz breve.** En la interfaz y las notificaciones, la información va primero y la broma después, en pocas palabras.

### Variables

| Variable | Significado |
| --- | --- |
| {jugador}, {a}, {b} | Nombre de la casa (por ejemplo, la Casa del Nabo Altivo) |
| {ganador}, {perdedor} | Casas que ganan y pierden un combate |
| {defensor}, {atacante} | Casas en un combate en el que resiste el defensor |
| {líder}, {último}, {traidor} | Casas en esas posiciones o situaciones |
| {casilla} | Nombre de la casilla |
| {n}, {m} | Tropas del ganador y del perdedor al empezar el combate |
| {pv} | Prestigio (puntos de victoria) |
| {oro} | Cantidad de Oro |
| {lote} | Lote de la Gran Subasta |
| {pacto} | Nombre del pacto (por ejemplo, la Alianza de la Roca Eterna) |
| {edificio}, {nivel} | Edificio mejorado y su nuevo nivel |
| {lema} | Lema de la casa |
| {escudo} | Descripción heráldica (por ejemplo, de azur con nabo de oro) |
| {semanas}, {día} | Semanas transcurridas, día del próximo cierre |
| {recurso}, {cantidad} | Recurso y cantidad |
| {apoyo} | Casa que apoya un ataque o una defensa |
| {logro} | Nombre del logro (Primera fortaleza, Obra maestra, Ganador de subasta) |
| {objetivo} | Texto del objetivo secreto |
| {noches} | Noches que lleva algo (un asedio, un Capitán preso) |
| {sitiador}, {sitiado} | Casa que sitia y casa sitiada |
| {captor} | Casa que tiene preso al Capitán |
| {gloria} | Gloria ganada en la semana |
| {rival} | La otra casa de una rivalidad o una venganza |
| {veces} | Veces que se han enfrentado dos casas, o conquistas seguidas |
| {antes}, {ahora} | Puesto en la clasificación antes y ahora |
| {destino} | Casilla a la que vuelven las tropas en un repliegue |
| {premio} | Lo que sale de unas ruinas (por ejemplo, 12 de Oro o la carta Tregua) |

## 1. Boletín: combates

### 1.1 Gana el atacante

1. GLORIOSA JORNADA EN {casilla}. Las huestes de {ganador} ({n} tropas) se imponen a las de {perdedor} ({m}). El cronista, que siempre creyó en {ganador}, lo celebra.
2. {ganador} toma {casilla} con {n} tropas frente a {m}. Los bardos ya componen la canción; los bardos de {perdedor}, otra muy distinta.
3. {casilla} cambia de bandera: {ganador} ({n}) desaloja a {perdedor} ({m}). El cronista anota la fecha en mayúsculas.
4. Tras una batalla que durará en la memoria al menos hasta el miércoles, {ganador} ({n}) se queda con {casilla}. {perdedor} ({m}) busca nuevos horizontes.
5. Victoria aplastante de {ganador} en {casilla}: {n} contra {m}. El cronista tuvo que afilar la pluma dos veces.
6. {perdedor} ({m} tropas) ejecuta un repliegue genial: abandona {casilla} para confundir a {ganador} ({n}). {ganador}, de momento, no parece confundido.
7. {ganador} ({n}) entra en {casilla} sin pedir permiso. {perdedor} ({m}) tampoco lo habría concedido.
8. Las tropas de {perdedor} ({m}) defendieron {casilla} con valor, con orgullo y con muy pocas tropas. {ganador} ({n}) se la queda.
9. {casilla} es ahora de {ganador} ({n} frente a {m}). Los vecinos dicen que el cambio se nota poco.
10. Empate moral en {casilla}: {perdedor} pierde {m} tropas, pero conserva intacta la dignidad. {ganador} ({n}) conserva la casilla.

### 1.2 Resiste el defensor

1. {defensor} resiste en {casilla}: {n} tropas frente a las {m} de {atacante}. Las murallas, encantadas.
2. {atacante} ({m}) llama a las puertas de {casilla}. {defensor} ({n}) no abre.
3. Asalto fallido a {casilla}. {atacante} llevó {m} tropas; {defensor} tenía {n} y mejor humor.
4. {defensor} ({n}) rechaza a {atacante} ({m}) en {casilla}. El cronista lo llama "una lección de urbanidad".
5. {atacante} ({m}) descubre que {casilla} estaba mejor defendida de lo que parecía: {defensor} tenía {n} tropas.
6. Las defensas de {casilla} aguantan. {atacante} ({m}) vuelve a casa con una historia y menos tropas; {defensor} ({n}), con una casilla.
7. {defensor} ({n}) sostiene {casilla} ante {atacante} ({m}). El cronista no sabe si admirar la defensa o lamentar el ataque, y hace las dos cosas.
8. En {casilla}, {atacante} ({m}) aprende que el defensor siempre juega en casa. {defensor} ({n}) lo celebra con sopa.

### 1.3 Conquista de una casilla neutral

1. {ganador} ({n} tropas) ocupa {casilla}. Los lugareños no se han enterado todavía.
2. {casilla} jura lealtad a {ganador}. Juraba lealtad a cualquiera que llegara con {n} tropas.
3. {ganador} añade {casilla} a sus dominios. Los antiguos defensores ({m}) se han reconvertido en agricultores.
4. Con {n} tropas, {ganador} toma {casilla}. La resistencia local ({m}) fue entusiasta pero breve.
5. {casilla} tiene nuevo dueño: {ganador}. El cronista desea al nuevo señor suerte con los mosquitos.
6. {ganador} planta su bandera en {casilla} ({n} frente a {m}). Queda bonita.
7. {casilla} pasa a manos de {ganador}, que promete prosperidad. Prometer es gratis.
8. Los {m} defensores de {casilla} entregan las llaves a {ganador} ({n}). Al menos ellos sí sabían dónde estaban las llaves.

### 1.4 Choque de varios ejércitos

1. TUMULTO EN {casilla}. Varias casas llegan a la vez y {ganador} es quien queda en pie con lo que le queda.
2. {casilla} se convierte en un mercado de espadas. Gana {ganador}; los demás pagan en tropas.
3. Tres ejércitos, una casilla y ningún sentido común. {ganador} se queda {casilla}.
4. El cronista no ha conseguido apuntar quién atacó primero en {casilla}, pero sí quién ganó: {ganador}.
5. En {casilla} hubo más casas que sitio. Se queda {ganador}; el resto, la experiencia.

### 1.5 Rebote (nadie entra)

1. {a} y {b} llegan a la vez a {casilla} con la misma fuerza. Se miran, se saludan y se vuelven a casa con la mitad de las tropas.
2. Empate perfecto en {casilla}: ni {a} ni {b} consiguen entrar. El cronista lo considera una victoria de la geometría.
3. {a} y {b} chocan a las puertas de {casilla} y rebotan como pelotas. Ambos se repliegan.
4. {casilla} se queda como estaba. {a} y {b} vuelven a sus tierras explicando que solo estaban de paseo.
5. Nadie entra en {casilla}: {a} y {b} se anulan mutuamente. El cronista no sabe a quién adular y se abstiene.

### 1.6 Ataque con apoyo

1. {ganador} toma {casilla} con la inestimable ayuda de {apoyo}. La amistad, a veces, se mide en tropas.
2. Gracias al apoyo de {apoyo}, {ganador} entra en {casilla}. {perdedor} no esperaba tanta compañía.
3. {apoyo} no movió ni un soldado, pero sin sus tropas {ganador} no habría tomado {casilla}. Así se hace la historia: de pie y mirando.
4. Alianza eficaz en {casilla}: {ganador} ataca, {apoyo} apoya y {perdedor} lo lamenta.
5. {defensor} resiste en {casilla} con el apoyo de {apoyo}. Los buenos vecinos existen, al menos esta semana.
6. {apoyo} sostiene la defensa de {casilla} junto a {defensor}. El cronista anota quién ayuda a quién, por si luego hace falta.

### 1.7 Apoyo cortado

1. {apoyo} prometió apoyo a {a}, pero un ataque en su propia casilla le tuvo ocupado. {a} atacó solo y se replegó.
2. El apoyo de {apoyo} no llegó: tenía la casa en llamas. Metafóricamente.
3. {a} contaba con {apoyo}; {apoyo} contaba con no ser atacado. Ninguno acertó.
4. Un ataque oportuno corta el apoyo de {apoyo} y desbarata los planes de {a}. Alguien lo había pensado muy bien.
5. Sin el apoyo de {apoyo}, el ataque de {a} sobre {casilla} se queda en un repliegue genial.

### 1.8 Ataque conjunto (bloque 8)

1. {ganador} y {apoyo} atacan juntas {casilla} ({n} tropas contra {m}) y la casilla queda para {ganador}. {perdedor} descubre que la amistad ajena también hace daño.
2. Ataque conjunto en {casilla}: {ganador} y {apoyo} suman {n} tropas frente a las {m} de {perdedor}. El cronista anota quién se queda la casilla y quién la factura.
3. Dos banderas, una sola carga: {ganador} y {apoyo} ({n}) toman {casilla} a {perdedor} ({m}). Ya discuten el reparto.

### 1.9 Resiste un ataque conjunto (bloque 8)

1. {atacante} y {apoyo} atacan juntas {casilla} con {m} tropas, y {defensor} ({n}) resiste a las dos. La alianza se lame las heridas a medias.
2. Ni juntas: {defensor} ({n}) rechaza en {casilla} el ataque conjunto de {atacante} y {apoyo} ({m}). Ahora se culparán la una a la otra.
3. {defensor} aguanta en {casilla} con {n} tropas frente a las {m} de {atacante} y {apoyo}. Dos contra una, y aun así.

Para que salgan las de cargas, brechas y ríos, el combate anota en cada atacante `charge`, `breach` y `river`; la emboscada (resiste un bosque de una casa) y el castillo que cae salen del tipo de casilla.

### 1.10 Choque frontal (dos ejércitos que van el uno contra el otro)

1. {a} y {b} salen a la vez a por la casilla del otro y se encuentran a medio camino. Gana {ganador}; el camino, que no tenía culpa, también pierde.
2. Choque frontal entre {a} y {b}. Nadie llega a donde iba, pero {ganador} llega más entero.
3. {a} y {b} tuvieron la misma idea la misma noche. Se nota que {ganador} la tuvo mejor.
4. A mitad de camino, {a} se cruza con {b} y ninguno cede el paso. Gana {ganador}; las normas de cortesía, cero.
5. {ganador} gana el choque frontal. El cronista recomienda a las dos casas mirar antes de salir.
6. Dos ejércitos, un sendero estrecho y ninguna paciencia. {ganador} se impone.

### 1.11 Cruce en el camino (bloque 4)

1. {a} y {b} se cruzan en {casilla} camino de otra parte y combaten allí mismo. Gana {ganador}; {casilla} no había invitado a nadie.
2. Encuentro inesperado en {casilla}: {a} iba a un sitio, {b} a otro, y {ganador} acaba yendo a los dos.
3. En {casilla} se cruzan {a} y {b}. Ni se conocían ni se querían conocer. Gana {ganador}.
4. {ganador} gana un combate que nadie había ordenado, en {casilla}, por pura coincidencia. El destino también da órdenes.
5. {a} y {b} coinciden en {casilla} como dos vecinos en la escalera, pero con lanzas. Sube {ganador}.
6. Cruce de caminos y de espadas en {casilla}. {ganador} sigue su ruta; el otro, la de vuelta.

### 1.12 Carga de jinetes

1. Los jinetes de {ganador} cargan en {casilla} y {perdedor} ({m}) no tiene tiempo ni de ensillar. {ganador} entra con {n} tropas.
2. Carga de caballería en {casilla}: {ganador} ({n}) arrolla a {perdedor} ({m}). Los caballos, encantados; los de {perdedor}, ausentes.
3. {ganador} demuestra en {casilla} para qué sirve el Oro que cuesta un jinete. {perdedor} ({m}) toma nota a pie.
4. Polvareda en {casilla}. Cuando se disipa, la bandera es de {ganador} ({n} frente a {m}).
5. Los jinetes de {ganador} llegan a {casilla} antes que las noticias de su llegada. {perdedor} ({m}) se entera después.
6. {casilla} es llana, sin murallas y con muchos cascos encima. {ganador} ({n}) se la queda.

### 1.13 Emboscada en el bosque

1. {defensor} ({n}) espera a {atacante} ({m}) entre los árboles de {casilla}. Los árboles no avisan.
2. Emboscada en {casilla}: {atacante} ({m}) entra en el bosque y sale con prisa. {defensor} ({n}) ni se ha movido.
3. {atacante} ({m}) descubre que en el bosque de {casilla} hay más que setas. Hay {n} tropas de {defensor}.
4. Las tropas de {defensor} ({n}) salen de detrás de cada tronco de {casilla}. {atacante} ({m}) tenía otra idea del paseo.
5. El bosque de {casilla} protege a {defensor} ({n}) y castiga a {atacante} ({m}). El cronista lo llama "justicia vegetal".
6. {atacante} ({m}) entra en {casilla} por la puerta grande del bosque. {defensor} ({n}) le esperaba por todas las demás.

### 1.14 Catapultas que abren brecha

1. Las catapultas de {ganador} abren brecha en las murallas de {casilla}. {perdedor} ({m}) tenía muros; ahora tiene huecos.
2. {ganador} lleva catapultas a {casilla} y las murallas de {perdedor} deciden que ya han aguantado bastante. Entra con {n} tropas.
3. Piedras por el aire en {casilla}. Las de {ganador} van hacia dentro; las de {perdedor} ({m}), hacia abajo.
4. {casilla} tenía unas murallas preciosas. Tenía. {ganador} ({n}) entra por la brecha.
5. Las catapultas de {ganador} hacen en una noche lo que los albañiles de {perdedor} tardaron semanas en hacer, pero al revés.
6. Brecha en {casilla}. {ganador} ({n}) agradece a sus catapultas los servicios prestados; {perdedor} ({m}), no.

### 1.15 Ataque cruzando el río

1. {defensor} ({n}) rechaza en {casilla} a {atacante} ({m}), que cruzó el río sin puente. El río tampoco se mojó por nadie.
2. {atacante} ({m}) cruza el río para atacar {casilla} y llega con las botas llenas de agua. {defensor} ({n}) le espera seco.
3. {ganador} ({n}) cruza el río y toma {casilla} pese a todo. {perdedor} ({m}) confiaba en el agua, y el agua le ha fallado.
4. Vadear el río para atacar {casilla} cuesta caro. {atacante} ({m}) acaba de pagarlo; {defensor} ({n}) acaba de cobrarlo.
5. {ganador} ({n}) cruza el río a nado, a caballo y a la fuerza. {casilla} es suya; {perdedor} ({m}) busca un puente por el que irse.
6. El cronista recuerda que los puentes existen. {atacante} ({m}) lo recuerda también, ahora, en {casilla}.

### 1.16 Repliegue

1. Las tropas de {jugador} se repliegan de {casilla} a {destino}. {n} vuelven a casa; el orgullo, más despacio.
2. Repliegue ordenado de {jugador}: {n} tropas salen de {casilla} hacia {destino}. El cronista lo llamará estratégico.
3. {jugador} retira {n} tropas a {destino}. En las crónicas oficiales esto se llama "reagrupar".
4. {n} tropas de {jugador} vuelven de {casilla} a {destino} con la frente alta y el paso ligero. Muy ligero.
5. {jugador} intenta replegarse de {casilla}, pero {destino} ya no es suya. Sus {n} tropas se dispersan por el reino.
6. Sin casa a la que volver, las {n} tropas de {jugador} en {casilla} se buscan la vida. El cronista les desea suerte.

Las variantes 5 y 6 son para cuando el repliegue no llega (la casilla de origen se perdió).

### 1.17 Cae un castillo (1/partida por castillo)

1. CAE EL CASTILLO DE {perdedor}. {ganador} ({n}) entra en {casilla}, que hasta anoche tenía otro escudo en la puerta.
2. Día negro para {perdedor}: su castillo de {casilla} es ahora de {ganador}. El cronista se quita el sombrero, aunque no tiene sombrero.
3. {ganador} ({n} tropas) se sienta en el trono de {perdedor} en {casilla}. Le queda un poco grande, pero ya lo ajustará.
4. Las campanas de {casilla} tocan para {ganador}. Hasta ayer tocaban para {perdedor} ({m}), y los campaneros no han dicho nada.
5. {perdedor} pierde su castillo de {casilla} a manos de {ganador}. Los cocineros del castillo sirven la cena igual, a otra mesa.
6. Histórico: {ganador} toma el castillo de {perdedor}. El cronista tira la tinta en la mesa de la emoción.

## 2. Boletín: la clasificación

### 2.1 Elogio al líder (abre cada boletín)

1. Saludamos a {líder}, primero en Prestigio ({pv}), cuya sabiduría este humilde cronista lleva elogiando exactamente una semana.
2. {líder} encabeza el reino con {pv} de Prestigio. El cronista ya ha encargado su retrato, por si acaso.
3. Gloria a {líder} ({pv}), faro de la nación, ejemplo de pretendientes y, según fuentes propias, muy buen conversador.
4. {líder} sigue en cabeza ({pv}). El cronista quisiera recordar que siempre le cayó bien.
5. Con {pv} de Prestigio, {líder} demuestra que el trono le queda como un guante. El guante aún no es oficial.
6. {líder} ({pv}) lidera el reino con mano firme y sonrisa amable. El cronista no ha visto la sonrisa, pero la imagina.
7. Primero en Prestigio: {líder} ({pv}). Las demás casas lo felicitan, unas con más entusiasmo que otras.
8. {líder} ({pv}) ocupa el primer puesto con la naturalidad de quien ha nacido para ello. El cronista lo dice todas las semanas a quien vaya primero.
9. ¡Larga vida a {líder}! ({pv} de Prestigio.) Al menos, hasta el domingo que viene.
10. {líder} lidera con {pv}. El cronista ha empezado a practicar la reverencia.

### 2.2 Cambio de líder

1. Como siempre sostuve, {líder} era el elegido. Cualquier crónica anterior que diga lo contrario es una falsificación.
2. NUEVO LÍDER: {líder} ({pv}). El cronista corrige discretamente la dedicatoria de su obra.
3. {líder} toma la cabeza con {pv} de Prestigio. El cronista, fiel a sus principios, cambia de principios.
4. Las tornas cambian y {líder} ({pv}) pasa a dirigir el reino. El cronista lo vio venir, aunque no lo dijo.
5. {líder} asciende al primer puesto ({pv}). El cronista ha quemado unos pergaminos sin importancia.
6. Relevo en la cima: {líder} ({pv}). Este cronista siempre fue un admirador secreto. Tan secreto que ni él lo sabía.
7. {líder} ({pv}) es el nuevo favorito del reino y, casualmente, del cronista.
8. Giro en la carrera por el trono: {líder} pasa a liderar con {pv}. El anterior líder recibe una nota de agradecimiento por los servicios prestados.

### 2.3 El último

1. {último} cierra la tabla con {pv} de Prestigio. El cronista lo menciona con todo respeto, por si acaso.
2. {último} ({pv}) ocupa el último puesto, que también es un puesto.
3. {último} ({pv}) avanza a su ritmo. El cronista recuerda que las tortugas también llegan.
4. Último en Prestigio: {último} ({pv}). Los grandes reyes empezaron desde abajo. Algunos.
5. {último} ({pv}) recibe hoy la ayuda de la Corona. La Corona espera no tener que repetirlo.
6. {último} ({pv}) prepara, según sus allegados, una remontada histórica.
7. El cronista no olvida a {último} ({pv}). De hecho, lo ha apuntado.
8. {último} ({pv}) está donde está. Por ahora.

## 3. Boletín: economía y diplomacia

### 3.1 Gran Subasta

1. {jugador} se lleva {lote} en la Gran Subasta por {oro} de Oro. Una inversión que la historia juzgará. Probablemente mal.
2. ¡Adjudicado! {lote} para {jugador} por {oro} de Oro. Los demás pujadores fingen que no lo querían.
3. {jugador} paga {oro} de Oro por {lote}. El cronista no sabe si es genialidad o capricho, y prefiere no preguntar.
4. La Gran Subasta corona a {jugador}, que se lleva {lote} por {oro} de Oro. Su tesorero llora en silencio.
5. {lote} cambia de manos por {oro} de Oro. Las manos nuevas son las de {jugador}.
6. {jugador} gana {lote} con una puja de {oro} de Oro, demostrando que el dinero sí da la felicidad, o al menos {lote}.
7. Nadie pujó tanto como {jugador} ({oro} de Oro). {lote} es suyo, y el silencio en la sala también.
8. {lote} para {jugador} ({oro} de Oro). El cronista apunta que en sus tiempos todo era más barato.

### 3.2 Comercio

1. Semana de mercaderes: {n} tratos cerrados. {jugador} ha comerciado con todos, menos con su propia conciencia.
2. {n} tratos esta semana. El reino es pobre, pero comercia con mucho entusiasmo.
3. {jugador} es el mercader de la semana con {n} tratos. Los demás revisan sus bolsillos.
4. Los mercados hierven: {n} tratos cerrados. El cronista ha cambiado una pluma vieja por una nueva, y está satisfecho.
5. {jugador} cierra {n} tratos y se gana el respeto de los mercaderes, y el recelo de todos los demás.
6. Semana floja en los mercados: solo {n} tratos. Las ratas de la plaza se aburren.
7. {n} tratos esta semana. Ambas partes de cada trato creen haber ganado, que es lo que distingue al buen comercio.
8. {jugador} ha hecho negocios con {n} casas distintas. El cronista lo considera diplomacia; las casas, otra cosa.

### 3.3 Pacto firmado

1. Se firma la {pacto} entre {a} y {b}. El cronista le calcula una vida de dos resoluciones.
2. {a} y {b} sellan la {pacto}. Prometen amistad eterna, que en este reino suele durar una semana.
3. Nace la {pacto}: {a} y {b} juran no agredirse. El cronista ha guardado una copia para cuando haga falta.
4. {a} y {b} firman la {pacto} con tinta, cera y una sonrisa algo forzada.
5. La {pacto} une a {a} y {b}. El cronista les desea lo mejor, de verdad, y apunta por si acaso.
6. Solemne firma de la {pacto}. {a} y {b} se dan la mano; los demás cuentan los dedos.
7. {a} y {b} sellan la {pacto} ante testigos. Los testigos ya están haciendo apuestas.
8. La {pacto} queda registrada en el libro de la Corona, en la página de los pactos, justo antes de la de los pactos rotos.

### 3.4 Pacto roto

1. {traidor} rompe la {pacto}. El cronista lo anota con tinta indeleble y letra bien grande.
2. PACTO ROTO. {traidor} da por terminada la {pacto}. La historia lo recordará, y el cronista se encargará de ello.
3. {traidor} rompe la {pacto} sin previo aviso. El cronista, escandalizado, se ha tomado una tila.
4. Adiós a la {pacto}: {traidor} ha decidido que la amistad eterna era demasiado larga.
5. {traidor} pone fin a la {pacto}. Sus defensores hablan de "realismo político"; sus vecinos, de otra cosa.
6. La {pacto} muere a manos de {traidor}. El cronista guarda un minuto de silencio, que es lo que tarda en mojar la pluma.
7. {traidor} ha roto la {pacto}. El tribunal de la Corona no puede castigarle, pero el cronista sí puede escribir sobre ello.
8. Traición en el reino: {traidor} rompe la {pacto}. Se abre la candidatura de {traidor} al título de Traidor de la Corona.

### 3.5 La Corona vende (bloque 5)

Lo que más vendió la Corona en la semana, sin decir a quién: las compras son secretas.

1. La Corona vende {n} de {recurso} esta semana. El tesorero real cobra con una sonrisa que no le cabe en la cara.
2. Salen de los graneros reales {n} de {recurso}. La Corona no pregunta para qué; solo cobra, y cobra bien.
3. {n} de {recurso} comprados a la Corona. Más caros que en el mercado, pero sin tener que sonreír a un vecino.

### 3.6 Fin del aviso (bloque 8)

La alianza rota deja de existir al terminar sus noches de aviso.

1. Expira la {pacto} entre {a} y {b}. Las noches de aviso dan para mucho, sobre todo para afilar espadas.
2. La {pacto} pasa a mejor vida. {a} y {b} vuelven a ser vecinas, que es bastante peor.
3. Se cierra la página de la {pacto} en el libro de la Corona. La de al lado ya está escrita.

### 3.7 Tropas de paso que vuelven a casa (bloque 8)

1. {n} tropas de {jugador} salen de {casilla} con el equipaje a medio hacer: ya no son bienvenidas.
2. Fin de la hospitalidad en {casilla}: {jugador} recoge sus {n} tropas y vuelve a casa. Nadie las despide.
3. {jugador} saca {n} tropas de {casilla} a toda prisa. El anfitrión cuenta las gallinas por si acaso.

## 4. Boletín: la vida del reino

### 4.1 Semana tranquila

1. Semana sin batallas. El reino descansa, los pretendientes conspiran y el cronista se ha dormido sobre el pergamino.
2. Ni una espada desenvainada. El cronista sospecha que se está tramando algo.
3. Paz en Aldricia. Las casas acumulan tropas con fines estrictamente decorativos.
4. Semana tranquila. Tan tranquila que el cronista ha tenido que inventarse el titular.
5. No hubo combates. Los herreros protestan; los enterradores, también.
6. Calma total en el reino. Es la clase de calma que los cronistas llaman "antes de la tormenta".
7. Ni guerras ni traiciones. El cronista recomienda a las casas que se animen un poco.
8. Una semana de paz. Los campesinos, encantados; el cronista, sin material.

### 4.2 Construcción

1. {jugador} eleva su {edificio} a nivel {nivel}. Los vecinos lo describen como muy alto y un poco presuntuoso.
2. Nuevo {edificio} de nivel {nivel} para {jugador}. El cronista no entiende de obras, pero aplaude.
3. {jugador} termina las obras de su {edificio} (nivel {nivel}) a tiempo, cosa nunca vista en el reino.
4. El {edificio} de {jugador} alcanza el nivel {nivel}. Dicen que desde arriba se ve el trono.
5. {jugador} amplía su {edificio} a nivel {nivel}. El cronista recuerda que el difunto rey también empezó construyendo.
6. {jugador} invierte en su {edificio} (nivel {nivel}). Mientras otros conquistan, {jugador} pone ladrillos.
7. El {edificio} de {jugador} sube a nivel {nivel}. Los albañiles exigen que se mencione su nombre; no se mencionará.
8. Nivel {nivel} para el {edificio} de {jugador}. Una obra digna de un rey, o al menos de un aspirante.

### 4.3 Logros

1. {jugador} consigue el logro {logro}. El cronista lo grabaría en piedra, pero la piedra está cara.
2. {logro} para {jugador}. Un honor que nadie le podrá quitar, aunque lo intentarán.
3. {jugador} entra en los anales con el logro {logro}. Los anales, de momento, son este pergamino.
4. El reino reconoce a {jugador} con el logro {logro}. Las demás casas aplauden con una mano.
5. {jugador} es el primero en lograr {logro}. Ser el primero es lo que cuenta; el segundo no sale en el boletín.
6. Logro {logro} para {jugador}. El cronista ya ha preparado los adjetivos.

### 4.4 Ruinas exploradas (bloque 1)

1. {jugador} explora las ruinas de {casilla} y sale con {premio}. Los fantasmas no han opuesto resistencia.
2. En las ruinas de {casilla}, {jugador} encuentra {premio}. Lo demás eran piedras y recuerdos.
3. {jugador} llega el primero a las ruinas de {casilla}: {premio}. Los que llegaron segundos encontraron polvo.
4. Las ruinas de {casilla} guardaban {premio} para quien llegara. Llegó {jugador}.
5. {jugador} rebusca en {casilla} y encuentra {premio}. También un zapato, que no se cuenta.
6. {casilla} ya no tiene secretos: {jugador} se ha llevado {premio}. Queda un prado muy bonito.

## 5. Boletín: las casas

### 5.1 Presentación de las casas (primer boletín)

1. {jugador}, {escudo}, aspira al trono. El cronista prefiere no comentar.
2. Se presenta {jugador}, {escudo}, bajo el lema "{lema}". Prometedor.
3. {jugador} llega a la corte con un escudo {escudo} y muchas ganas. Las ganas no figuran en el escudo.
4. {jugador}, {escudo}. Una casa antigua, según ella misma.
5. Desde sus tierras llega {jugador}, {escudo}. El cronista ya ha practicado cómo pronunciar el nombre.
6. {jugador}, cuyo lema es "{lema}", se suma a la carrera. El cronista anota el lema para usarlo más adelante.
7. {jugador}, {escudo}, entra en la corte como si fuera suya. Aún no lo es.
8. Completa la lista de pretendientes {jugador}, {escudo}. Que gane el más capaz, como dijo el rey. O el más astuto, como no dijo.

### 5.2 El lema contra la realidad

1. {jugador}, cuyo lema es "{lema}", acaba de hacer justo lo contrario.
2. "{lema}", dice el lema de {jugador}. Esta semana, el lema y {jugador} no se hablan.
3. El cronista recuerda que el lema de {jugador} es "{lema}". Solo lo recuerda.
4. "{lema}". Precioso lema. {jugador} debería leerlo de vez en cuando.
5. {jugador} honra su lema, "{lema}", a su manera, que es una manera muy particular.
6. Si el lema de {jugador} ("{lema}") fuera una profecía, esta semana habría fallado.
7. "{lema}", proclama {jugador}. Los hechos de la semana proclaman otra cosa.
8. El cronista propone actualizar el lema de {jugador} de "{lema}" a algo más acorde con la semana.

### 5.3 La casa de la gallina

1. (1/partida) {jugador} ha elegido una gallina para su escudo. El cronista considera esto una falta de respeto a la memoria del rey y no dirá más.
2. (1/partida) El escudo de {jugador} luce una gallina. El cronista ha pedido que se retire de su vista durante los banquetes.
3. (1/partida) {jugador} lleva una gallina en su escudo. Sea dicho para la historia: el rey Aldric jamás tuvo nada que ver con gallinas.

### 5.4 Objetivos secretos (último boletín)

1. Se revela la ambición oculta de {jugador}: {objetivo}. Cumplida. El cronista siempre lo sospechó.
2. {jugador} perseguía en secreto {objetivo}. No lo consiguió, pero nadie se dio cuenta, que ya es algo.
3. Sorpresa en la coronación: {jugador} buscaba {objetivo} desde el primer día, y lo ha logrado.
4. El objetivo secreto de {jugador} era {objetivo}. El cronista finge que lo sabía.
5. {jugador} desvela su plan: {objetivo}. Ahora se entienden muchas cosas.
6. {jugador} se quedó a las puertas de su objetivo secreto, {objetivo}. Las puertas, como siempre, cerradas.
7. ¡{objetivo}! Era la meta secreta de {jugador}, y la ha cumplido delante de todos sin que nadie lo viera.
8. {jugador} confiesa que su ambición era {objetivo}. El cronista aplaude la discreción, que es más de lo que suele aplaudir.

## 6. Boletín: el difunto rey

### 6.1 El fantasma de Aldric

1. El fantasma de Su Majestad Aldric opina que esta semana ha sido un desastre. Su Majestad siempre fue muy exigente.
2. Su Majestad difunta se ha aparecido en la cocina pidiendo explicaciones. El cronista se las ha dado; no han gustado.
3. El fantasma del rey afirma que {líder} no le convence. El cronista matiza que al rey no le convencía nadie.
4. Aldric se apareció a medianoche para quejarse del ruido de las batallas. Se le recordó que fue él quien no dejó heredero.
5. El espíritu real ha dejado un mensaje: "Más pan". Los eruditos debaten su significado.
6. Según el fantasma de Aldric, en sus tiempos las guerras eran más elegantes. El cronista estaba allí y no lo recuerda así.
7. El fantasma del rey felicita a {jugador}. El cronista sospecha que lo ha confundido con otra persona.
8. Su Majestad difunta ha intentado votar en la Gran Subasta. Se le ha explicado, con todo el respeto, que los fantasmas no pujan.

### 6.2 La versión oficial de la muerte del rey

1. (1/partida) Hoy se cumplen {semanas} semanas de la heroica caída del rey Aldric en combate singular contra un ave. Quien hable de huesos será desterrado.
2. (1/partida) El cronista desmiente, una vez más, los rumores sobre un hueso de pollo. El rey cayó luchando. Contra un pollo, sí, pero luchando.
3. (1/partida) En memoria de Aldric, que dio su vida por el reino durante un banquete particularmente intenso.
4. (1/partida) Se prohíbe servir pollo en la corte hasta nuevo aviso. Por respeto. Solo por respeto.

## 7. Boletín: el soborno

### 7.1 Frases compradas (el pretendiente elige una; siempre hablan de sí mismo)

1. Esta semana, {jugador} ha demostrado una vez más su enorme talento para gobernar.
2. El reino entero comenta la elegancia de {jugador}.
3. Fuentes muy fiables aseguran que {jugador} es el pretendiente más guapo de la corte.
4. {jugador} ha sido visto ayudando a una anciana a cruzar El Puente Que Nadie Cruza.
5. Los campesinos de {jugador} son los más felices del reino, según los propios campesinos de {jugador}.
6. {jugador} tiene la mejor sopa de la corte. Lo dice todo el mundo que la ha probado gratis.
7. Si el difunto rey viviera, elegiría a {jugador}. Lo dice el cronista, que lo conocía bien.
8. La humildad de {jugador} es tan grande que no quería que se publicara esta frase. Ha pagado para que se publique.
9. Los bardos del reino solo componen canciones sobre {jugador}. Las demás casas no tienen bardos tan caros.
10. {jugador} nunca ha perdido una batalla que considerara importante.
11. Dicen que el escudo de {jugador} brilla incluso de noche.
12. La sabiduría de {jugador} es comparable a la de los grandes reyes antiguos, cuyos nombres el cronista no recuerda.

### 7.2 Pie de patrocinio

1. Esta crónica cuenta con el generoso patrocinio de {jugador} ({oro} de Oro).
2. El cronista agradece a {jugador} su donativo de {oro} de Oro, que en nada ha influido en esta crónica.
3. Crónica patrocinada por {jugador} ({oro} de Oro). El cronista sigue siendo imparcial, en líneas generales.
4. Con la colaboración desinteresada de {jugador} ({oro} de Oro). Bueno, interesada.
5. {jugador} ha contribuido con {oro} de Oro al mantenimiento de la pluma del cronista.
6. Gracias a {jugador} ({oro} de Oro), el cronista ha cenado caliente esta semana.
7. Esta crónica ha sido posible gracias a {jugador} ({oro} de Oro). Cualquier parecido con la verdad es mérito suyo.
8. Patrocinador oficial de esta semana: {jugador}, con {oro} de Oro. Se aceptan más patrocinadores.

## 8. Boletín: notas al margen

Notas cortas que aparecen junto a dibujitos en el margen del pergamino. Se eligen al azar, una o dos por boletín.

1. Nota del cronista: esto no lo escribí yo.
2. Aquí iba un dibujo de un caballero luchando contra un caracol. Ganó el caracol.
3. Tinta derramada. El cronista culpa a las ratas.
4. Recordatorio: cobrar el próximo domingo.
5. Las cifras de arriba son exactas. Los adjetivos, no tanto.
6. Si encuentras las llaves del tesoro, devuélvelas al cronista. Hay recompensa (pequeña).
7. Este margen se ha dejado en blanco por respeto al difunto rey.
8. El dibujo de abajo es un dragón. Si parece un perro, es culpa del pergamino.
9. Nota para mí mismo: comprar más velas. Y dejar de escribir notas para mí mismo en los boletines.
10. El cronista se reserva el derecho a cambiar de opinión la semana que viene.
11. Se buscan escribientes. Sueldo: el honor. Pan: poco.
12. Si estás leyendo esto, deberías estar dando órdenes.

## 9. La Crónica Definitiva

Frases para la crónica final, reescrita a favor del ganador. Las cifras se mantienen.

1. En la semana {semanas}, {ganador} perdió {m} tropas en {casilla}. Los historiadores serios lo llaman "una prueba de humildad".
2. Lo que entonces parecía una retirada fue, visto con perspectiva, una maniobra maestra de {ganador}.
3. Cuando {ganador} rompió la {pacto}, no fue traición, sino visión de estado.
4. Durante semanas, {ganador} fue último en Prestigio. Así empiezan las grandes leyendas, como se sabe.
5. El cronista, que siempre creyó en {ganador} (ver boletines anteriores, convenientemente corregidos), da fe.
6. {ganador} gastó {oro} de Oro en la Gran Subasta. Una inversión en el futuro del reino.
7. Hubo quien dudó de {ganador}. El cronista no dirá quién, pero tiene una lista.
8. Y así, contra todo pronóstico (salvo el del cronista), {ganador} fue coronado rey de Aldricia. Hasta el próximo interregno.

Bloque 3: momentos clave por tipo, siempre a favor del ganador, para montar un pergamino de 8 a 12 momentos. Cada uno lleva su semana o noche.

### 9.1 Apertura

1. Esta es la verdadera historia del interregno de Aldricia, tal como ocurrió, más o menos.
2. Crónica Definitiva del interregno, escrita por Fray Abundio con la tinta de los vencedores.
3. Aquí se cuenta cómo {ganador} llegó al trono, y por qué siempre estuvo claro que llegaría.
4. Cuando murió el rey Aldric, nadie sabía quién lo sucedería. Bueno, el cronista sí.

### 9.2 Una conquista del ganador

1. En la semana {semanas}, {ganador} tomó {casilla} con {n} tropas. Los historiadores lo llaman "el principio del fin" (para los demás).
2. La toma de {casilla} por {ganador} ({n} contra {m}) se estudiará en las academias militares, cuando las haya.
3. {casilla} cayó ante {ganador} en la semana {semanas}. El cronista lo vio venir y lo escribió antes.

### 9.3 Una derrota del ganador

1. En la semana {semanas}, {ganador} perdió {m} tropas en {casilla}. Los historiadores serios lo llaman "una prueba de humildad".
2. Lo de {casilla} en la semana {semanas} no fue una derrota de {ganador}: fue un ensayo general.
3. {ganador} dejó {casilla} a {rival} en la semana {semanas}, como quien presta un libro sabiendo que se lo devolverán.

### 9.4 Una traición del ganador

1. Cuando {ganador} rompió la {pacto}, no fue traición, sino visión de estado.
2. La ruptura de la {pacto} por {ganador} fue, como todos saben ahora, un acto de generosidad hacia el futuro.

### 9.5 La peor semana del ganador

1. Durante semanas, {ganador} fue último en Prestigio. Así empiezan las grandes leyendas, como se sabe.
2. En la semana {semanas}, {ganador} iba {antes}.º. Un rey de verdad sabe esperar desde abajo.

### 9.6 Un rival del ganador

1. {rival} fue un digno adversario. Digno, sobre todo, de perder contra {ganador}.
2. {rival} plantó cara a {ganador} {veces} veces. El cronista le dedica esta línea, que no es poco.

### 9.7 Cierre

1. Y así, contra todo pronóstico (salvo el del cronista), {ganador} fue coronado rey de Aldricia. Hasta el próximo interregno.
2. El cronista, que siempre creyó en {ganador} (ver boletines anteriores, convenientemente corregidos), da fe.
3. Fin de la Crónica Definitiva. Cualquier parecido con lo que pasó de verdad es pura coincidencia.

## 10. Eventos

Cada evento tiene un nombre épico, el efecto exacto (diseño, sección 10) y dos líneas del cronista; la variante de cada partida la fija la semilla. En el código viven en `packages/engine/src/events.ts` (`EVENT_LINES`). `{jugador}` es la casa afectada.

| Evento | Variantes |
| --- | ### 11.20 Oferta nueva (notificación)

1. {jugador} quiere comerciar contigo.
2. {jugador} te hace una oferta. El mercader espera en la puerta.
3. Oferta nueva de {jugador}. Mírala antes de que caduque.
4. {jugador} te propone un trato. El cronista ya huele el regateo.
5. {jugador} te ofrece un negocio. Contad bien antes de firmar.

--- |
| **La Gran Plaga de Ratas** | Las ratas reclaman su parte de la cosecha. / Las ratas han organizado un banquete en los graneros reales. No invitaron a nadie. |
| **Cosecha Gloriosa** | Los campos rebosan. Los campesinos, sospechosamente contentos. / El cielo sonríe al reino. El cronista no se fía. |
| **La Fiebre del Oro** | Todo el reino quiere ser mercader. Los mercados no dan abasto, y el cronista tampoco. / Fiebre del oro: los mercaderes sonríen y los bolsillos tintinean. |
| **Tormenta en la Costa** | El mar se enfada con los puertos. Los barcos, prudentes, se quedan en casa. / Tormenta en la costa: ni un barco entra, ni una moneda sale. |
| **El Gran Derrumbe** | Las montañas se han cansado de que las piquen. Por una semana, descansan. / Gran derrumbe: canteros y mineros toman un descanso forzoso y pagado por nadie. |
| **La Fiesta de San Aldric** | El reino celebra al difunto rey produciendo el doble. Sin pollo. / Día de fiesta: todos trabajan el doble, que es como se celebra aquí. |
| **Caminos Embarrados** | Llueve sobre Aldricia. Quien ataque llegará tarde y lleno de barro. / Los caminos son ríos de lodo. Defender nunca fue tan cómodo. |
| **Fervor Guerrero** | Los soldados han oído una canción épica y ahora quieren pelear con todo el mundo. / Fervor guerrero: hasta los cocineros afilan los cucharones. |
| **La Paz del Rey** | El fantasma del rey exige paz entre las casas. Por una vez, le hacen caso. / Paz del Rey: las espadas descansan. Los neutrales, no tanto. |
| **Los Bandidos del Camino** | Los bandidos han decidido que {jugador} tiene demasiadas tierras. / Los bandidos reparten justicia, a su manera, que es a palos. |
| **El Tributo del Rey** | La Corona reclama lo suyo a quien más tiene. El fantasma del rey lo aprueba. / Los ricos pagan y los demás aplauden. Por una vez. |
| **El Rey Ha Perdido las Llaves** | Se buscan las llaves del tesoro. Quien más comercie, más llaveros verá. / {jugador} encuentra unas llaves y 15 de Oro. No eran las del tesoro, pero el Oro sí es de verdad. |
| **El Torneo Real** | Gran torneo en la corte: gana quien más soldados trae, que es la forma moderna de ganar torneos. / El torneo real premia al ejército más grande. La caballería, ofendida. |
| **Levas Reales** | La Corona llama a filas. Los campesinos acuden, más o menos voluntarios. / Levas reales: cada castillo recibe reclutas nuevos y bastante desorientados. |
| **Carnaval** | Carnaval en Aldricia: pan para todos y disfraces para quien se atreva. / El reino se disfraza y reparte pan. Fray Abundio va de fraile, como siempre. |
| **La Limosna Real** | La Corona se apiada de {jugador}. El gesto es noble; la cantidad, modesta. / Limosna real para {jugador}. Nadie lo comenta. Todos lo comentan. |
| **Paga Atrasada** | Los soldados reclaman las pagas atrasadas. Con intereses. / Este domingo el ejército cobra el doble. El tesorero ya ha empezado a llorar. |
| **Indulgencia Real** | Por decreto del fantasma del rey, este domingo los soldados comen gratis. / Indulgencia real: el mantenimiento corre a cargo de la Corona, que no tiene Oro pero sí buena voluntad. |
| **El Mercado Enloquece** | La subasta de esta semana ofrece el doble. Los pujadores, el doble de nerviosos. / Lotes dobles: el subastador ha perdido la cabeza, o la cuenta. |
| **Semana Tranquila** | No pasa nada. Fray Abundio aprovecha para echarse una siesta. / Semana tranquila en Aldricia. El cronista bosteza y afila la pluma por si acaso. |

## 11. Interfaz y notificaciones

Pocas palabras y siempre con la información primero. Cinco variantes por tipo como punto de partida.

### 11.1 Sin recursos

1. Sin Oro. Los banqueros ni os saludan.
2. Falta {cantidad} de {recurso}. Ni siquiera el cronista os puede prestar.
3. Sin {recurso}. El almacén resuena cuando se habla dentro.
4. Te faltan {cantidad} de {recurso}. Quizá alguien quiera comerciar.
5. No llega el {recurso}. La grandeza tendrá que esperar.

### 11.2 Órdenes enviadas

1. Órdenes selladas. Se abrirán el {día} a las 22:00.
2. Órdenes guardadas. Podéis cambiarlas hasta el {día} a las 21:00.
3. El mensajero ha salido con vuestras órdenes. Llegará el {día} a las 22:00.
4. Órdenes registradas. Nadie más las conoce. Por ahora.
5. Órdenes selladas con cera real. Bueno, con cera.

### 11.3 Trato cerrado (notificación y aviso)

La información primero: quién acepta.

1. {jugador} acepta tu oferta. Ambas partes creen haber ganado.
2. {jugador} acepta tu oferta. Apretón de manos y trato cerrado.
3. Trato cerrado con {jugador}. El cronista lo apunta.
4. {jugador} acepta el trato. Contad los dedos, por si acaso.
5. {jugador} acepta tu oferta. Intercambio completado, sin regateos de última hora.

### 11.4 Oferta rechazada

1. {jugador} rechaza tu oferta. Sin más explicaciones, como los grandes.
2. {jugador} dice que no. Con educación, eso sí.
3. Oferta rechazada por {jugador}. Hay más casas en el reino.
4. {jugador} no está interesado. Su pérdida.
5. {jugador} rechaza el trato. Quizá con una contraoferta…

### 11.5 Aviso de cierre (notificación)

Sale 1 hora antes del cierre y solo a quien aún no ha dado órdenes (bloque 12).

1. Cierre en 1 h. Aún no has dado órdenes. Fray Abundio se impacienta.
2. Queda 1 hora para dar órdenes y no has dado ninguna.
3. Cierre en 1 h. El mensajero ya se está poniendo las botas, y tus tropas siguen esperando.
4. 1 hora para el cierre y ni una orden. Última llamada, alteza.
5. Cierre en 1 h. Sin órdenes, que sea lo que el destino quiera.

### 11.6 Combate (notificación tras la resolución)

A cada casa, el combate más importante de los suyos esa noche: primero lo que pierde, luego lo que gana. Si hay más, se añade cuántos.

#### 11.6.1 Ganas

1. ¡Victoria en {casilla}! Te quedan {n} tropas allí.
2. {casilla} es tuya, con {n} tropas dentro. El cronista ya afila la pluma.
3. Tomas {casilla} y quedan {n} tropas. Las trompetas, por cuenta de la casa.

#### 11.6.2 Resistes

1. {casilla} resiste. Tus {n} tropas siguen allí.
2. Atacan {casilla} y aguanta: quedan {n} tropas. Las murallas sonríen.
3. {casilla} sigue siendo tuya, con {n} tropas. El enemigo vuelve a casa.

#### 11.6.3 Pierdes una casilla

1. {casilla} ha caído. El cronista ya está buscando un adjetivo amable.
2. Pierdes {casilla}. La repetición de la noche lo cuenta todo.
3. {casilla} cambia de bandera, y no a tu favor. Habrá revancha.

#### 11.6.4 Falla tu ataque

1. Ataque fallido en {casilla}: vuelven {m} tropas. Fray Abundio lo llamará repliegue genial.
2. {casilla} resiste tu ataque. Vuelven {m} tropas a casa.
3. No entras en {casilla}: se repliegan {m} tropas. Habrá otra noche.

### 11.7 Mercado vacío

1. No hay ofertas. El mercado está más vacío que el tesoro real.
2. Ninguna oferta abierta. ¿Por qué no publicas la primera?
3. Mercado en silencio. Solo se oyen las gaviotas.
4. Nadie vende nada. Buen momento para poner precio.
5. No hay ofertas. Los mercaderes han ido a comer.

### 11.8 Edificio mejorado

1. {edificio} sube a nivel {nivel}. Las obras han terminado a tiempo, cosa nunca vista.
2. {edificio} nivel {nivel}. Los albañiles piden propina.
3. ¡{edificio} a nivel {nivel}! Producirá más desde mañana.
4. Obra terminada: {edificio} a nivel {nivel}. Queda precioso.
5. Nivel {nivel} para tu {edificio}. El cronista lo mencionará, si hay sitio.

### 11.9 Ausencia y regreso

1. Ausente. Tus tierras quedan en manos del piloto automático (y de +25% de defensa).
2. ¡Bienvenido de nuevo! El piloto automático ha hecho lo que ha podido.
3. Has vuelto. Esto es lo que ha pasado mientras no estabas.
4. Modo vacaciones activado. El reino os guardará el sitio.
5. De vuelta en la corte. El cronista os ha echado de menos (por los sobornos).

### 11.10 Errores

1. Algo ha fallado. El cronista culpa a las ratas.
2. No se ha podido guardar. Inténtalo de nuevo.
3. Se ha perdido el mensajero. Vuelve a intentarlo.
4. Error inesperado. El cronista lo investigará, cuando acabe de comer.
5. Algo ha salido mal. No es culpa tuya. Probablemente.

### 11.11 Instalar el juego en el móvil

1. Añade Reyes de Pacotilla a tu pantalla de inicio para recibir avisos. El cronista no puede ir a buscarte.
2. Instala el juego para que te llegue el aviso cuando te ataquen.
3. Para recibir notificaciones, añade el juego a la pantalla de inicio y ábrelo desde ahí.
4. Sin notificaciones te enterarás de todo por el boletín. Que llega tarde.
5. Instala el juego: un toque y te avisamos de lo importante.

### 11.12 Compra a la Corona (bloque 5)

1. {n} de {recurso} por {oro} de Oro. El recaudador real lo cuenta dos veces.
2. La Corona te vende {n} de {recurso} por {oro} de Oro. Sin regatear: la Corona no regatea.
3. {n} de {recurso} de los almacenes reales. {oro} de Oro menos y un recibo con sello.

### 11.13 Mercenarios contratados (bloque 5)

1. {n} mercenarios se presentan en el castillo. Cobran por adelantado y no preguntan contra quién.
2. {n} espadas de alquiler para siete días. El cronista no sabe sus nombres, y ellos prefieren que siga así.
3. Llegan {n} mercenarios. Comen de la Corona, luchan por tu Oro y se irán sin despedirse.

### 11.14 Los mercenarios se van (crónica de la casa, bloque 5)

1. {tropas} de alquiler cumplen sus 7 días y se van sin despedirse.
2. Se acaba la paga: {tropas} mercenarias recogen sus cosas y se marchan.
3. {tropas} de alquiler se van al amanecer. Dicen que volverían, por el precio adecuado.

### 11.15 Propuesta de alianza (notificación, bloque 8)

1. {jugador} os propone la {pacto}. Tenéis {n} resoluciones para contestar.
2. Llega un mensajero de {jugador} con la {pacto} bajo el brazo. Caduca en {n} resoluciones.
3. {jugador} quiere firmar la {pacto}. El cronista ya ha preparado la cera, por si acaso.

### 11.16 Alianza aceptada (notificación, bloque 8)

1. {jugador} acepta la {pacto}. Vale desde la próxima resolución.
2. La {pacto} queda firmada con {jugador}. Paso libre desde esta noche.
3. {jugador} dice que sí: nace la {pacto}. Que dure.

### 11.17 Alianza rota (notificación, bloque 8)

1. {jugador} rompe la {pacto}. Deja de existir tras la resolución del {día}.
2. PACTO ROTO: {jugador} pone fin a la {pacto}. Quedan {n} noches de aviso, hasta el {día}.
3. {jugador} da por terminada la {pacto}. Sacad las tropas antes del {día}.

### 11.18 Tropas aliadas dentro (notificación, bloque 8)

Cuando las tropas de un aliado dentro de tus casillas llegan a `ALLIANCE.warnTroops`.

1. {jugador} tiene {n} tropas dentro de tus tierras. Fray Abundio solo lo comenta.
2. Hay {n} tropas de {jugador} de paso por tus casillas. Muy amigas, muy amigas.
3. {n} tropas aliadas de {jugador} acampan en tus tierras. El cronista cuenta las tiendas.

### 11.19 Órdenes anuladas al firmar (notificación, bloque 8)

1. Con la {pacto}, {n} órdenes contra {jugador} se quedan en casa.
2. La {pacto} anula {n} órdenes contra {jugador}. Las tropas no salen.
3. Firmada la {pacto}: {n} órdenes contra {jugador} quedan en papel mojado.

## 12. Asedios (bloque 4 del sistema de guerra)

### 12.1 Empieza un asedio

1. {sitiador} pone sitio a {casilla}, de {sitiado}. Dentro empiezan a contar los sacos de Pan.
2. Las tiendas de {sitiador} rodean {casilla}. {sitiado} mira por la muralla y no le gusta el paisaje.
3. Asedio a {casilla}: {sitiador} no ataca, espera. {sitiado} tampoco sale, espera. El cronista también espera, con la pluma lista.
4. {sitiador} acampa a las puertas de {casilla} y monta una cocina. Huele bien desde dentro, que es la idea.
5. {casilla}, de {sitiado}, amanece con las tiendas de {sitiador} alrededor. Nadie entra ni sale, salvo los rumores.
6. {sitiador} sitia {casilla}. {sitiado} dice que tiene provisiones para años. El cronista ha visto el granero.

### 12.2 El asedio sigue

1. {noches} noches lleva {sitiador} ante {casilla}. Las tiendas ya tienen jardín.
2. Noche {noches} del asedio de {casilla}. {sitiado} resiste; {sitiador}, también.
3. {sitiador} cumple {noches} noches de sitio en {casilla}. Los niños del campamento ya van a la escuela.
4. El asedio de {casilla} va por la noche {noches}. Dentro se cuentan historias; fuera, días.
5. {noches} noches ante las murallas de {casilla}. {sitiador} ha aprendido los nombres de todos los centinelas de {sitiado}.
6. Sigue el asedio de {casilla} ({noches} noches). El cronista ya ha gastado dos plumas en este capítulo.

### 12.3 El asedio se rompe (atacan a quien sitiaba)

1. {jugador} ataca a los sitiadores de {casilla} y el asedio de {sitiador} se viene abajo. Las tiendas, también.
2. Asedio roto en {casilla}: {sitiador} tiene que atender otro frente. {sitiado} abre las ventanas.
3. Alguien ataca a {sitiador} por la espalda y el sitio de {casilla} se acaba. {sitiado} respira por primera vez en {noches} noches.
4. El sitio de {casilla} termina como empiezan muchas cosas en el reino: con un ataque que nadie esperaba.
5. {sitiador} levanta el campamento de {casilla} a toda prisa. Se deja la olla.
6. Fin del asedio de {casilla}. {sitiado} sale a la muralla a saludar; {sitiador} no devuelve el saludo.

### 12.4 El asedio se levanta (ya nadie sitia)

1. {sitiador} recoge las tiendas y se va de {casilla}. {sitiado} lo llama victoria; el cronista, también, por si acaso.
2. Se acaba el asedio de {casilla} sin una sola batalla. Las dos casas aseguran que han ganado.
3. {sitiador} se cansa de mirar las murallas de {casilla} y se marcha. Las murallas no le echarán de menos.
4. Tras {noches} noches, {sitiador} se retira de {casilla}. Deja un campamento precioso y algo de basura.
5. {casilla} vuelve a abrir sus puertas. {sitiador} se ha ido sin despedirse, que es lo educado en un asedio.
6. El asedio de {casilla} se levanta. {sitiado} sale a por Pan; {sitiador}, a por otra idea.

---

## 13. El Capitán (bloque 4)

### 13.1 Capitán preso

1. ¡EL CAPITÁN DE {jugador}, PRESO! {captor} lo encuentra solo en {casilla} y lo invita a quedarse una temporada.
2. {captor} captura al Capitán de {jugador} en {casilla}. El cronista no sabe si lo están interrogando o enseñándole el castillo.
3. El Capitán de {jugador} estaba solo en {casilla}. Ya no: ahora tiene la compañía de los carceleros de {captor}.
4. {captor} añade a su colección el Capitán de {jugador}. Lo tiene en una torre con vistas.
5. Mal día para el Capitán de {jugador}: sale a dar un paseo por {casilla} y vuelve en la carreta de {captor}.
6. {jugador} se queda sin Capitán. {captor} dice que lo trata muy bien; el Capitán no ha podido confirmarlo.

### 13.2 El Capitán se escapa (al cumplirse el plazo)

1. El Capitán de {jugador} se escapa de las mazmorras de {captor} tras {noches} noches. Dice que hizo un túnel con una cuchara.
2. Tras {noches} noches de cautiverio, el Capitán de {jugador} vuelve a casa. {captor} jura que se le olvidó cerrar.
3. El Capitán de {jugador} salta la muralla de {captor} y vuelve a su castillo. Trae barba y anécdotas.
4. Fuga del Capitán de {jugador}. {captor} busca al guardia que se quedó dormido.
5. {noches} noches tardó el Capitán de {jugador} en hartarse de la sopa de {captor}. Vuelve a casa.
6. El Capitán de {jugador} reaparece en su castillo como si nada. Nadie pregunta. Él tampoco lo cuenta.

### 13.3 Rescate pagado

1. {jugador} paga {oro} de Oro a {captor} y recupera a su Capitán. El Capitán dice que valía más.
2. Rescate cerrado: {oro} de Oro de {jugador} a {captor} por un Capitán poco usado.
3. {captor} libera al Capitán de {jugador} a cambio de {oro} de Oro. El cronista anota la cifra por si sube el precio de los capitanes.
4. {jugador} rescata a su Capitán por {oro} de Oro. Su tesorero aún no ha dejado de llorar.
5. Por {oro} de Oro, el Capitán de {jugador} vuelve a casa. {captor} gana Oro y pierde a su mejor conversador.
6. {oro} de Oro cambian de manos y un Capitán cambia de castillo. Todo muy civilizado.

### 13.4 Liberado gratis

1. {captor} suelta al Capitán de {jugador} sin pedir nada. El cronista sospecha algo, pero no sabe qué.
2. Gesto noble de {captor}: devuelve al Capitán de {jugador} gratis. Las crónicas lo recordarán, al menos hasta el domingo.
3. {captor} libera al Capitán de {jugador} porque comía demasiado. Versión oficial: magnanimidad.
4. El Capitán de {jugador} vuelve a casa por la puerta grande, con permiso de {captor} y sin rescate.
5. {captor} abre la celda y el Capitán de {jugador} sale. Sin Oro, sin condiciones y sin explicación.
6. {captor} devuelve el Capitán a {jugador} con una nota: "Para que veáis". Nadie sabe qué hay que ver.

### 13.5 Huida (pierde contra una guarnición neutral)

1. El Capitán de {jugador} pierde contra los lugareños de {casilla} y vuelve al castillo a paso ligero.
2. La guarnición de {casilla} pone en fuga al Capitán de {jugador}. Eran pocos, pero tenían horcas.
3. El Capitán de {jugador} ataca {casilla} y vuelve a casa con una lección de humildad campesina.
4. {casilla} no se rinde al Capitán de {jugador}, que se repliega hasta su castillo. Dice que iba a por Pan.
5. Retirada del Capitán de {jugador} tras chocar con los vecinos de {casilla}. Los vecinos lo celebran con queso.
6. Los defensores de {casilla} devuelven al Capitán de {jugador} a su castillo, sin daños y sin gloria.

---

## 14. Gloria (bloque 4)

### 14.1 La casa más gloriosa de la semana

1. {jugador} suma {gloria} de Gloria esta semana. Los bardos ya le cobran por adelantado.
2. Semana gloriosa para {jugador}: {gloria} de Gloria. El cronista le dedica la mejor tinta.
3. Nadie ha ganado más Gloria que {jugador} ({gloria}). Ni ha presumido más, todo hay que decirlo.
4. {gloria} de Gloria para {jugador}. En las tabernas ya hay quien pide su autógrafo, aunque no sepa leer.
5. {jugador} colecciona victorias: {gloria} de Gloria en siete días. El cronista se cansa solo de apuntarlas.
6. Si la Gloria fuera Pan, {jugador} comería tres semanas ({gloria}). No lo es, pero queda bien.

### 14.2 Honor en la derrota

1. {jugador} pierde {casilla} ante un ejército el doble de grande, y gana Gloria por plantarle cara. El cronista aplaude de pie.
2. Derrota honrosa de {jugador} en {casilla}: perdió, pero hizo sudar a {ganador}. Se lleva Gloria.
3. {jugador} cae en {casilla} con todas las de la ley y la cabeza alta. La Gloria se la queda igual.
4. Hay derrotas que suman: la de {jugador} en {casilla} le vale Gloria. A {ganador} le vale la casilla.
5. {jugador} resistió en {casilla} más de lo razonable. Perdió, pero las canciones son suyas.
6. El cronista concede Gloria a {jugador} por defender {casilla} contra un ejército el doble de grande. Y un pañuelo.

---

## 15. La Corona

### 15.1 Ayuda al último

1. La Corona se apiada de {jugador} y le manda ayuda. Al cronista también le gustaría que se apiadaran de él.
2. {jugador} recibe la ayuda de la Corona por ir último. El cronista lo llama "impulso al talento emergente".
3. Las arcas reales se abren para {jugador}. Poco, pero se abren.
4. {jugador} va último y la Corona lo nota. Le manda ayuda y una carta de ánimo (la carta es del cronista).
5. Ayuda de la Corona para {jugador}. Las demás casas protestan; la Corona no escucha, como siempre.
6. La Corona echa una mano a {jugador}. Hasta los reyes muertos tienen corazón.

### 15.2 Tregua (carta)

1. {jugador} juega una Tregua y el ataque sobre {casilla} se detiene en seco. Las tropas, con la espada en alto, se quedan sin saber qué hacer.
2. Tregua en {casilla}. Las tropas que iban a atacar se quedan quietas, mirándose las botas.
3. Una Tregua salva {casilla} esta noche. {jugador} lo celebra; quien atacaba, menos.
4. El ataque sobre {casilla} se queda en nada por una Tregua. El papel, a veces, puede más que el hierro.
5. Tregua firmada sobre {casilla}. El cronista la guarda en su archivo, junto a las otras que no duraron.
6. {casilla} duerme tranquila esta noche gracias a una Tregua. Mañana ya se verá.

### 15.3 Paz del Rey

1. Paz del Rey en {casilla}: nadie lucha allí esta noche. El fantasma de Aldric sigue dando órdenes.
2. Se proclama la Paz del Rey sobre {casilla}. Las espadas vuelven a la vaina, de mala gana.
3. Por orden del difunto rey, {casilla} queda en paz. Los muertos mandan más de lo que parece.
4. Paz del Rey en {casilla}. Las casas que iban a atacar se quedan en la puerta, como si llovieran edictos.
5. La Paz del Rey detiene los ejércitos en {casilla}. El cronista aprovecha para dormir una noche entera.
6. Nadie combate en {casilla}: lo manda la Paz del Rey. Hasta los cuervos se van a otra parte.

---

## 16. Hambre (solo en la crónica de la casa)

Los recursos de cada casa son secretos, así que estas frases no salen en el boletín: solo las ve la propia casa, en su crónica y en el aviso.

1. Sin Pan para todos: desertan {n} tropas. Se fueron a buscar una casa con mejor cocina.
2. {n} tropas se marchan por hambre. Prometen volver cuando haya pan de verdad.
3. El granero vacío habla por sí solo: {n} desertores esta noche.
4. Desertan {n} tropas. Dicen que no es personal, que es el estómago.
5. Faltó Pan y sobraron soldados: se van {n}. El cronista guarda el secreto, por esta vez.
6. {n} tropas cambian la lanza por la azada en busca de comida. Nadie se lo reprocha.

---

## 17. La memoria del cronista

Salen cuando el registro de la partida lo justifica, como mucho dos por boletín.

### 17.1 Rivalidad (dos casas que se han enfrentado muchas veces)

1. {jugador} y {rival} ya van por {veces} combates. El cronista les ha reservado un capítulo propio.
2. Otra vez {jugador} contra {rival}. Van {veces} enfrentamientos y ninguno ha mandado flores.
3. La rivalidad entre {jugador} y {rival} ({veces} combates) ya tiene canciones en las dos lenguas del reino.
4. {veces} veces se han visto las caras {jugador} y {rival} en el campo de batalla. Pronto tendrán que presentarse a las familias.
5. El cronista ya no presenta a {jugador} y {rival}: se conocen de sobra. {veces} combates.
6. Si {jugador} y {rival} pusieran el mismo empeño en otra cosa, el reino tendría ya un puente nuevo. Van {veces} combates.

### 17.2 Venganza (recupera una casilla que le quitaron)

1. {jugador} recupera {casilla}, que le había quitado {rival}. El cronista tenía la frase escrita desde entonces.
2. Venganza servida en {casilla}: {jugador} vuelve a casa y {rival} vuelve a la suya.
3. {casilla} vuelve a {jugador}. {rival} la tuvo prestada {noches} noches.
4. {jugador} no olvida: recupera {casilla} de manos de {rival}. Los rencores también dan Prestigio.
5. Ojo por ojo y {casilla} por {casilla}: {jugador} se la quita a {rival}, que se la había quitado antes.
6. {rival} se quedó {casilla}; {jugador} se quedó con las ganas. Esta noche, al revés.

### 17.3 Récord: la batalla más grande de la partida

1. LA MAYOR BATALLA DEL INTERREGNO: {n} tropas se juntan en {casilla}. Gana {ganador}.
2. Nunca se habían visto tantas tropas juntas en Aldricia: {n} en {casilla}. El cronista necesitó un pergamino más largo.
3. {casilla} acoge la batalla más grande de la partida ({n} tropas). Gana {ganador}; pierde la hierba.
4. Récord del reino en {casilla}: {n} tropas en un solo combate. {ganador} se lleva la casilla y el récord.
5. {n} tropas en {casilla}. Los historiadores tendrán que contar dos veces; el cronista ya lo ha hecho.
6. La batalla de {casilla} entra en los libros: {n} tropas, la mayor hasta hoy. Ganó {ganador}.

### 17.4 Récord: el asedio más largo

1. {sitiador} bate el récord de paciencia del reino: {noches} noches sitiando {casilla}.
2. Ningún asedio había durado tanto: {noches} noches de {sitiador} ante {casilla}. Las tiendas ya pagan impuestos.
3. {noches} noches de asedio en {casilla}. El cronista propone poner una placa.
4. El asedio más largo de la partida es el de {sitiador} a {casilla}: {noches} noches y subiendo.
5. {sitiador} ya ha pasado más noches ante {casilla} ({noches}) que en su propio castillo.
6. Récord: {noches} noches de sitio en {casilla}. Hay soldados que ya han olvidado por qué estaban allí.

### 17.5 Racha de conquistas

1. {jugador} lleva {veces} noches seguidas conquistando algo. El cronista empieza a temer por su propia casilla.
2. {veces} noches, {veces} conquistas: {jugador} no descansa ni los domingos.
3. Racha de {jugador}: {veces} noches seguidas ganando terreno. Los cartógrafos piden un aumento.
4. {jugador} conquista por {veces}.ª noche seguida. A este paso, el mapa tendrá que ser de su color.
5. Nadie detiene a {jugador}: {veces} noches seguidas avanzando. Los vecinos han empezado a preparar el equipaje.
6. {veces} conquistas en {veces} noches. El cronista se plantea pasarse al bando de {jugador}, y lo hace.

### 17.6 Remontada

1. {jugador} pasa del puesto {antes} al {ahora}. El cronista siempre creyó en {jugador}, como puede verse en boletines anteriores convenientemente corregidos.
2. REMONTADA: {jugador} sube del {antes}.º al {ahora}.º. Hay que tener cuidado con los que van detrás.
3. {jugador} era {antes}.º hace nada. Ahora es {ahora}.º. El cronista retira lo que dijo.
4. Del {antes}.º al {ahora}.º en una semana: {jugador} ha descubierto que el Prestigio también se escala.
5. {jugador} sale del pozo: del {antes}.º al {ahora}.º. Los que se reían ya no se ríen tanto.
6. Nadie apostaba por {jugador} en el puesto {antes}. Ahora es {ahora}.º y todos dicen que lo veían venir.

### 17.7 Caída del líder

1. {jugador}, que fue líder, cae al puesto {ahora}. La corona pesaba, y se le ha caído.
2. De líder a {ahora}.º: {jugador} conoce la vista desde abajo. El cronista ya no lo adula; se ha pasado de bando.
3. {jugador} baja del primer puesto al {ahora}.º. El cronista guarda sus elogios para cuando vuelva.
4. Tropiezo de {jugador}: del primero al {ahora}.º. Así son las cosas en un interregno.
5. {jugador} ha perdido el liderato y baja al {ahora}.º. Fray Abundio, como siempre, estaba con el ganador.
6. Ayer, {jugador} encabezaba el reino. Hoy es {ahora}.º. Mañana, quién sabe.

---

## 18. La repetición de la noche

Frases cortas para cada paso de la repetición. Las cifras siempre; la broma, en media línea. Se eligen con la semilla de la noche, así que al volver a verla dicen lo mismo, y no se repite ninguna en la misma noche.

### 18.1 Gana el atacante

1. {ganador} toma {casilla}: {n} contra {m}.
2. {casilla} cambia de bandera. {n} de {ganador} contra {m} de {perdedor}.
3. {ganador} entra en {casilla} ({n} frente a {m}). Sin llamar.
4. {perdedor} pierde {casilla}: {m} no bastan contra {n}.
5. {n} de {ganador}, {m} de {perdedor}. {casilla} cambia de dueño.
6. Victoria de {ganador} en {casilla}, {n} a {m}. Ya se oyen las trompetas.

### 18.2 Resiste el defensor

1. {casilla} aguanta: {n} de {defensor} contra {m}.
2. {defensor} ({n}) rechaza a {atacante} ({m}). Puertas cerradas.
3. {atacante} llama con {m}; {defensor} no abre con {n}.
4. {m} de {atacante} no bastan. {casilla} sigue con {defensor}.
5. {defensor} resiste en {casilla}, {n} contra {m}. Las murallas sonríen.
6. Ataque fallido a {casilla}: {m} contra {n}.

### 18.3 Conquista de una neutral

1. {ganador} ocupa {casilla} ({n} contra {m}).
2. {casilla} se rinde a {ganador}. Los lugareños, ni se inmutan.
3. {ganador} añade {casilla} a su mapa: {n} contra {m}.
4. {n} de {ganador} entran en {casilla}. Bandera nueva.
5. {casilla} jura lealtad a {ganador}, como a cualquiera con {n} tropas.
6. Los {m} vecinos de {casilla} entregan las llaves a {ganador}.

### 18.4 Choque frontal o cruce

1. Choque en el camino: gana {ganador}.
2. {a} y {b} se encuentran a medio camino. Pasa {ganador}.
3. Nadie cede el paso. {ganador} pasa por encima.
4. Dos ejércitos, un camino. Gana {ganador}.
5. {a} contra {b}, sin terreno ni murallas. Gana {ganador}.
6. Encontronazo a mitad de camino. {ganador} sigue entero.

### 18.5 Rebote

1. {a} y {b} empatan ante {casilla}. Nadie entra.
2. Rebote en {casilla}: misma fuerza, misma vuelta a casa.
3. {casilla} se queda como estaba. {a} y {b}, también.
4. Empate en {casilla}. Todos a casa.
5. {a} y {b} chocan en la puerta de {casilla} y rebotan.
6. Fuerzas iguales en {casilla}. La geometría gana.

### 18.6 Asedio

1. {sitiador} sitia {casilla}. Noche {noches}.
2. Tiendas ante {casilla}: noche {noches} del asedio.
3. {casilla} sigue rodeada ({noches} noches).
4. {sitiador} espera ante {casilla}. Ya van {noches} noches.
5. Nadie entra ni sale de {casilla}. Noche {noches}.
6. El asedio de {casilla} sigue: {noches} noches.

### 18.7 Repliegue

1. {n} tropas de {jugador} se repliegan a {destino}.
2. Repliegue de {jugador}: {n} vuelven a {destino}.
3. {jugador} reagrupa {n} tropas en {destino}. Estrategia.
4. {n} tropas vuelven a {destino}, con prisa y con orgullo.
5. {jugador} recoge a los suyos en {destino}: {n}.
6. Vuelta a {destino} de {n} tropas de {jugador}.

### 18.8 Tregua o Paz del Rey

1. Tregua en {casilla}: nadie ataca.
2. {casilla} se libra esta noche.
3. Paz en {casilla}. Las espadas, a la vaina.
4. Ni un golpe en {casilla}: hay tregua.
5. El papel para el ataque a {casilla}.
6. {casilla} duerme tranquila.

### 18.9 Capitán preso

1. ¡{captor} captura al Capitán de {jugador}!
2. El Capitán de {jugador}, preso en {casilla}.
3. {captor} se lleva al Capitán de {jugador}. Con vistas.
4. Capitán de {jugador}: solo, en {casilla}, y ahora preso.
5. Mal paseo: el Capitán de {jugador} acaba en manos de {captor}.
6. {captor} tiene un invitado nuevo: el Capitán de {jugador}.

### 18.10 Fin de la noche

1. Fin de la noche. El cronista se va a dormir.
2. Y así acaba la noche. Mañana, más.
3. Se apagan las antorchas. Hasta la próxima.
4. Fin. El cronista sopla la vela.
5. La noche termina. Las órdenes de mañana, a vuestro cargo.
6. Eso es todo. Fray Abundio guarda la pluma.

Cuando el combate es de tu casa, Fray Abundio te habla de «vuestra merced» (solo en los combates).

### 18.11 Vuestra merced gana

1. Vuestra merced toma {casilla}: {n} contra {m}. El cronista ya afila la pluma.
2. {casilla} es vuestra: {n} contra {m} de {perdedor}. Enhorabuena, vuestra merced.
3. Victoria de vuestra merced en {casilla}, {n} a {m}. {perdedor} no lo contará igual.
4. {perdedor} pierde {casilla} a manos de vuestra merced: {n} contra {m}.
5. Vuestras {n} tropas entran en {casilla}. Las {m} de {perdedor} no bastaron.
6. {casilla} cambia de bandera, y la nueva es la vuestra: {n} contra {m}.

### 18.12 Vuestra merced pierde una casilla

1. Vuestra merced pierde {casilla}: {m} contra {n} de {ganador}.
2. {ganador} entra en {casilla} con {n}. Vuestras {m} no bastaron.
3. {casilla} ya no es vuestra: {n} de {ganador} contra {m}. El cronista lo siente, a su manera.
4. Mala noche, vuestra merced: {ganador} os quita {casilla}, {n} contra {m}.
5. {casilla} cae ante {ganador}: {n} contra vuestras {m}. Habrá revancha, se supone.
6. Baja vuestra bandera en {casilla}. {ganador} traía {n} y vuestra merced tenía {m}.

### 18.13 Vuestra merced resiste

1. {casilla} aguanta: vuestras {n} contra {m} de {atacante}. Bien hecho, vuestra merced.
2. {atacante} llama con {m} y vuestra merced no abre con {n}.
3. Vuestra merced resiste en {casilla}, {n} contra {m}. Las murallas os lo agradecen.
4. {m} de {atacante} se estrellan contra vuestras {n}. {casilla} sigue siendo vuestra.
5. Ni un palmo para {atacante}: {casilla} resiste con {n} contra {m}.
6. {atacante} viene a por {casilla} con {m} y se vuelve sin ella. Vuestras {n} ni se despeinan.

### 18.14 Falla el ataque de vuestra merced

1. Vuestro ataque a {casilla} no pasa: {m} contra {n} de {defensor}.
2. {defensor} aguanta en {casilla} con {n}. Vuestras {m} vuelven a casa.
3. Vuestra merced llama a {casilla} con {m} y {defensor} no abre con {n}.
4. {casilla} resiste a vuestra merced, {n} contra {m}. El cronista lo llamará tanteo.
5. Ataque fallido de vuestra merced en {casilla}: {m} contra {n}. Habrá otra noche.
6. {m} tropas vuestras contra {n} de {defensor}. {casilla}, de momento, sigue sin ser vuestra.

### 18.15 Vuestra merced ocupa una neutral

1. Vuestra merced ocupa {casilla}: {n} contra {m}.
2. {casilla} se rinde a vuestra merced. Los lugareños ni se inmutan.
3. {casilla} entra en vuestro mapa: {n} contra {m}.
4. Vuestras {n} tropas entran en {casilla}. Bandera nueva.
5. Los {m} vecinos de {casilla} entregan las llaves a vuestra merced.
6. {casilla} jura lealtad a vuestra merced, como a cualquiera con {n} tropas.

---

## 19. Proclamas

Cada casa puede mandar una frase propia por semana, de hasta 140 letras, que sale firmada en el boletín del domingo. Fray Abundio no la toca: solo la presenta y, a veces, se desmarca.

### 19.1 Presentación de la sección

1. El cronista publica, sin corregir ni una coma, lo que las casas han querido decir.
2. Las casas toman la palabra. El cronista se lava las manos.
3. Proclamas de la semana, tal como llegaron. Las faltas de ortografía son de origen.
4. Hablan los pretendientes. El cronista solo sujeta el pergamino.
5. Lo que sigue lo firman las casas. Si alguien se ofende, que se queje a ellas.
6. Voces del reino, sin filtro. El cronista ha pedido un día libre.

### 19.2 Nota del cronista tras una proclama que nombra a otra casa

1. (El cronista no comparte necesariamente esta opinión, pero la encuentra entretenida.)
2. (Se ruega a la casa aludida que conteste el domingo que viene, por escrito y sin espadas.)
3. (El cronista se limita a transcribir.)
4. (Nota: el cronista no se hace responsable de lo que pase el martes.)
5. (Se publica íntegra, como manda la libertad de prensa del reino, que acaba de inventarse.)
6. (El cronista se aparta un poco del pergamino, por si acaso.)

---

## 20. La hoja volandera del miércoles

Boletín corto de mitad de semana, con los hechos desde el domingo.

### 20.1 Entradilla

1. Hoja volandera del miércoles. El cronista no podía esperar al domingo.
2. Noticias de mitad de semana, aún calientes. Cuidado al tocarlas.
3. El cronista interrumpe su siesta para contar lo que ha pasado desde el domingo.
4. Edición del miércoles: menos páginas, mismas cifras, adjetivos igual de exagerados.
5. A mitad de semana, el reino ya ha dado para un pergamino. Aquí va.
6. Lo que ha pasado desde el domingo, en breve. Lo largo, el domingo que viene.

### 20.2 Mitad de semana tranquila

1. Desde el domingo no ha pasado nada digno de tinta. El cronista lo agradece.
2. Tres noches sin sangre. El reino parece otro.
3. Calma desde el domingo. Las casas deben de estar tramando algo.
4. Nada que contar a mitad de semana, salvo que el cronista ha dormido muy bien.
5. Silencio en Aldricia desde el domingo. Sospechoso.
6. Mitad de semana sin batallas. Los herreros están preocupados.

---

## 21. Títulos de fin de partida

Un título por casa en la coronación (bloque 13), el del dato en que más destaca, con su cifra exacta. El ganador lleva además «Futuro Rey, según el cronista». Se ríen de lo que pasó, nunca de una persona.

### 21.1 Azote de Fronteras

1. Con {n} casillas tomadas a otras casas, {casa} ha obligado a redibujar el mapa tantas veces que el cartógrafo pide aumento.
2. {n} casillas arrebatadas a otras casas. Los mojones de las fronteras de {casa} ya no se clavan: se llevan en carro.

### 21.2 La Gallina que Cruzó el Vado

1. {n} victorias cruzando ríos sin puente. Nadie sabe por qué cruzó {casa} el río; el cronista sospecha que para ganar.
2. Sin puente y con los pies mojados, {casa} ganó {n} veces al otro lado del río. Los patos lo consideran uno de los suyos.

### 21.3 Muralla con Patas

1. {n} ataques rechazados. Las tierras de {casa} no tienen murallas: tienen una muralla que camina.
2. Quien atacó a {casa} se fue por donde vino, y así {n} veces. El cronista ha dejado de apostar en contra.

### 21.4 Asediador con Paciencia de Santo

1. {n} noches de asedio a castillos. Las tiendas de {casa} llevaban tanto tiempo plantadas que ya tenían huerto.
2. {n} noches esperando ante unos muros. A {casa} se le podría canonizar, si los muros opinaran lo mismo.

### 21.5 Mercader de Lengua Larga

1. {n} tratos cerrados. Con {casa} nadie sale de una conversación con lo mismo que entró.
2. {n} tratos, y en todos {casa} juró que salía perdiendo. El cronista lo anota con una ceja levantada.

### 21.6 Arquitecto sin Freno

1. {n} niveles entre sus cinco edificios. En el castillo de {casa} no se duerme: se oye el martillo.
2. {n} niveles de obra. Si {casa} hubiera puesto la misma piedra en murallas, aún estarían subiendo.

### 21.7 Tesorero de las Llaves Perdidas

1. {n} de Oro guardado al final. Las llaves del tesoro del rey no aparecieron, pero el tesoro de {casa} sí.
2. Con {n} de Oro en el arcón, {casa} es lo más parecido a las llaves perdidas que ha visto el reino.

### 21.8 General de Mil Bocas

1. {n} tropas al final. El ejército de {casa} es enorme y, sobre todo, come mucho Pan.
2. {n} soldados bajo la bandera de {casa}. Los panaderos del reino le hacen reverencias.

### 21.9 Coleccionista de Subastas

1. {n} lotes de la Gran Subasta. El subastador ya saludaba a {casa} por su nombre.
2. Con {n} lotes ganados, {casa} pujaba por todo. Al subastador se le escapó un «¿otra vez?».

### 21.10 Caído con Honor

1. {n} casillas perdidas ante otras casas, todas con la cabeza alta. No fue rendición de {casa}: fue ceder terreno con elegancia.
2. {n} casillas cambiaron de bandera a costa de {casa}. El cronista lo llama generosidad territorial.

### 21.11 Traidor de la Corona

1. {n} alianzas rotas. Firmar con {casa} era como firmar en el agua: bonito mientras duró.
2. {n} pactos deshechos por {casa}. El cronista lo llama visión de estado; sus aliados, otras cosas.

### 21.12 Aliado de Hierro

1. {n} noches de alianza sin romperla. La palabra de {casa} valía más que el Oro, que ya es decir.
2. {n} noches junto a sus aliados y ni una traición. El cronista anota a {casa} en mayúsculas, por rareza.

### 21.13 Mecenas del Cronista

1. {n} de Oro en sobornos al cronista. Sin {casa}, Fray Abundio no habría podido comprar tanta tinta (ni tanto vino).
2. {n} de Oro para el cronista, que lo agradece con toda la objetividad que el Oro permite. Larga vida a {casa}.

### 21.14 Saqueador de Ruinas

1. {n} ruinas saqueadas. Por donde pasaba {casa}, las ruinas quedaban todavía más arruinadas.
2. {n} ruinas visitadas y vaciadas. Los fantasmas de las ruinas presentaron queja contra {casa}.

### 21.15 Rey de la Remontada

1. {n} puestos remontados desde su peor domingo. Quien dio por perdida la causa de {casa} se precipitó.
2. Subió {n} puestos en la clasificación cuando nadie miraba. Lo de {casa} no es correr: es llegar.

### 21.16 Guardián del Castillo Propio

1. {n} tropas en su castillo al final. El mundo exterior es peligroso y {casa} lo sabía.
2. {n} tropas guardando la puerta de casa. Nadie entró en el castillo de {casa}; casi nadie salió.

## 22. Cinemáticas

Las cinemáticas del bloque 13 (`apps/web/src/cinematics.tsx`). Las viñetas de los eventos usan la frase del evento (sección 10); el fantasma y el aniversario, la frase del difunto rey del boletín (sección 6). Esto es lo que se añade encima.

### 22.1 El fantasma de Aldric: lo que dice en el bocadillo

1. ¡En mis tiempos esto no pasaba!
2. ¡Más pan!
3. ¿Quién ha tocado mi trono?
4. ¡Qué semana más vulgar!
5. ¿Alguien ha visto mis llaves?
6. ¡Yo habría ganado comiendo!

### 22.2 El fantasma de Aldric: la nota de Fray Abundio

1. El cronista lo anota. Con letra pequeña.
2. Su Majestad ya no vota, pero opina.
3. El cronista estaba allí y no lo recuerda así.

### 22.3 La última semana

1. Última semana del interregno. Quien quiera la corona, que se dé prisa.
2. Quedan {n} noches. El cronista ya afila la pluma.

## 23. Portada

La portada del bloque 7 (`apps/web/src/home.ts`). Fray Abundio cambia de frase cada pocos segundos en su bocadillo. La tarjeta de instalar usa la 11.11.

### 23.1 Bienvenida a quien no ha entrado

1. El trono de Aldricia sigue vacío. Se buscan candidatos con ambición y sin alergia al pollo.
2. Seis semanas, un trono y ninguna llave. El cronista ya ha afilado la pluma.
3. Aquí se forjan reyes de verdad. Bueno, de pacotilla, pero reyes.
4. El difunto Aldric insiste en que con él el reino iba mejor. El cronista no lo recuerda así.

De noche se añaden:

5. A estas horas solo velan los fantasmas y los que no han dado sus órdenes.
6. El cronista duerme con un ojo abierto. El otro también, por si acaso.

### 23.2 Con partidas

Según la partida de arriba (la más urgente). Si toca más de una, se turnan en este orden.

- Te faltan órdenes:
  1. Las órdenes de esta noche siguen en blanco. El cronista no sabe escribir sobre nada, aunque lo intenta.
  2. Quedan {tiempo} para el cierre y vuestras tropas miran al cielo esperando instrucciones.
- Anoche perdiste una casilla: Anoche perdisteis {casilla}. El cronista no dirá que lo vio venir, pero lo vio venir.
- Anoche conquistaste una: Anoche conquistasteis {casilla}. El cronista ya busca adjetivos a la altura.
- Anoche resististe: Anoche atacaron vuestras tierras y no pasaron. El cronista lo apunta como hazaña.
- Vas primero: {casa} va en cabeza con {n} de Prestigio. El cronista ya ensaya la reverencia, por si acaso.
- Vas detrás: {casa} va {puesto}.º, a {n} de Prestigio del primero. El cronista lo considera un triunfo moral.
- Vas último: {casa} cierra la clasificación. Desde abajo, dicen, se ve mejor el cielo.
- Sin nada que contar: Noche tranquila en Aldricia. Sospechosamente tranquila.
- En la sala de espera: La corte de «{partida}» aún se está reuniendo. El cronista guarda sitio, y pan.
- Acabada y ganaste: {casa} lleva la corona de «{partida}». El cronista lo dijo desde el principio, en voz muy baja.
- Acabada: «{partida}» ya tiene rey. El cronista recomienda ver la coronación, aunque duela.
- Sin partidas: Aún no estás en ninguna partida. Pide un enlace de invitación: el cronista no se presenta solo.

### 23.3 Invitación

1. Una invitación a la corte. El cronista recomienda aceptar: la comida es buena, salvo el pollo.
2. Se busca casa con ambición, escudo propio y pocos escrúpulos. Lo del escudo es obligatorio.

Si la partida ya ha empezado: Llegáis tarde: la corte ya está repartiéndose el reino. El cronista os guarda sitio en la próxima.

Si ya tienes casa en ella: Ya tenéis casa en esta corte. El cronista no apunta a nadie dos veces, por ahorrar tinta.

Si la invitación no existe: Esa invitación no aparece en ningún archivo. El cronista sospecha de las ratas.

### 23.4 La hoja para entrar con el código

1. Fray Abundio no lo apunta, por discreción y porque se le olvidaría.

### 23.5 La corona del título

Al tocarla, la corona se pone derecha un momento y vuelve a torcerse.

1. No la toquéis, que se tuerce sola. Como todo en Aldricia.
2. La corona está torcida a propósito. El cronista lo sabe porque lo dice él.
3. Ponerla derecha no os hace más reyes. Pero queda bonito.
4. El difunto Aldric también la enderezaba. Mirad cómo acabó.

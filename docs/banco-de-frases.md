# Banco de frases de Fray Abundio

Banco de textos del cronista de Reyes de Pacotilla, versión 2 (adaptada al diseño v2: sin puntos de acción, con apoyos, rebotes, logros y objetivos secretos). Complementa la sección 17 del documento de diseño. En el código, las secciones 1 a 8 (y los avisos de alianzas, 11.15 a 11.19) están en `packages/engine/src/texts/cronista.ts` y los eventos en `packages/engine/src/events.ts`: si cambia una frase aquí, se cambia también allí.

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

## 10. Eventos

Cada evento tiene un nombre épico, el efecto exacto (diseño, sección 10) y dos líneas del cronista; la variante de cada partida la fija la semilla. En el código viven en `packages/engine/src/events.ts` (`EVENT_LINES`). `{jugador}` es la casa afectada.

| Evento | Variantes |
| --- | --- |
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

### 11.3 Trato cerrado

1. Trato cerrado. Ambas partes creen haber ganado.
2. Trato hecho: recibes {cantidad} de {recurso}.
3. Apretón de manos y trato cerrado.
4. Trato cerrado con {jugador}. El cronista lo apunta.
5. Intercambio completado. Contad los dedos, por si acaso.

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

1. Ataque fallido en {casilla}: tus tropas se repliegan con {m}. Fray Abundio lo llamará repliegue genial.
2. Combate en {casilla}: ¡victoria! Te quedan {n} tropas.
3. Han atacado {casilla}. Resultado completo en el boletín.
4. {casilla} resiste. Tus {n} tropas siguen allí.
5. {casilla} ha caído. El cronista ya está buscando un adjetivo amable.

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
4. {edificio} mejorado a nivel {nivel}. Queda precioso.
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

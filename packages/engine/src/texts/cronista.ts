// Banco de frases de Fray Abundio (docs/banco-de-frases.md, secciones 1 a 8).
// Generado a partir del documento: si cambia el banco, se cambia aquí también.
// Las variables entre llaves las rellena bulletin.ts; las cifras siempre son exactas.

export const PHRASES = {
  "combate.gana_atacante": [
    "GLORIOSA JORNADA EN {casilla}. Las huestes de {ganador} ({n} tropas) se imponen a las de {perdedor} ({m}). El cronista, que siempre creyó en {ganador}, lo celebra.",
    "{ganador} toma {casilla} con {n} tropas frente a {m}. Los bardos ya componen la canción; los bardos de {perdedor}, otra muy distinta.",
    "{casilla} cambia de bandera: {ganador} ({n}) desaloja a {perdedor} ({m}). El cronista anota la fecha en mayúsculas.",
    "Tras una batalla que durará en la memoria al menos hasta el miércoles, {ganador} ({n}) se queda con {casilla}. {perdedor} ({m}) busca nuevos horizontes.",
    "Victoria aplastante de {ganador} en {casilla}: {n} contra {m}. El cronista tuvo que afilar la pluma dos veces.",
    "{perdedor} ({m} tropas) ejecuta un repliegue genial: abandona {casilla} para confundir a {ganador} ({n}). {ganador}, de momento, no parece confundido.",
    "{ganador} ({n}) entra en {casilla} sin pedir permiso. {perdedor} ({m}) tampoco lo habría concedido.",
    "Las tropas de {perdedor} ({m}) defendieron {casilla} con valor, con orgullo y con muy pocas tropas. {ganador} ({n}) se la queda.",
    "{casilla} es ahora de {ganador} ({n} frente a {m}). Los vecinos dicen que el cambio se nota poco.",
    "Empate moral en {casilla}: {perdedor} pierde {m} tropas, pero conserva intacta la dignidad. {ganador} ({n}) conserva la casilla."
  ],
  "combate.resiste": [
    "{defensor} resiste en {casilla}: {n} tropas frente a las {m} de {atacante}. Las murallas, encantadas.",
    "{atacante} ({m}) llama a las puertas de {casilla}. {defensor} ({n}) no abre.",
    "Asalto fallido a {casilla}. {atacante} llevó {m} tropas; {defensor} tenía {n} y mejor humor.",
    "{defensor} ({n}) rechaza a {atacante} ({m}) en {casilla}. El cronista lo llama \"una lección de urbanidad\".",
    "{atacante} ({m}) descubre que {casilla} estaba mejor defendida de lo que parecía: {defensor} tenía {n} tropas.",
    "Las defensas de {casilla} aguantan. {atacante} ({m}) vuelve a casa con una historia y menos tropas; {defensor} ({n}), con una casilla.",
    "{defensor} ({n}) sostiene {casilla} ante {atacante} ({m}). El cronista no sabe si admirar la defensa o lamentar el ataque, y hace las dos cosas.",
    "En {casilla}, {atacante} ({m}) aprende que el defensor siempre juega en casa. {defensor} ({n}) lo celebra con sopa."
  ],
  "combate.neutral": [
    "{ganador} ({n} tropas) ocupa {casilla}. Los lugareños no se han enterado todavía.",
    "{casilla} jura lealtad a {ganador}. Juraba lealtad a cualquiera que llegara con {n} tropas.",
    "{ganador} añade {casilla} a sus dominios. Los antiguos defensores ({m}) se han reconvertido en agricultores.",
    "Con {n} tropas, {ganador} toma {casilla}. La resistencia local ({m}) fue entusiasta pero breve.",
    "{casilla} tiene nuevo dueño: {ganador}. El cronista desea al nuevo señor suerte con los mosquitos.",
    "{ganador} planta su bandera en {casilla} ({n} frente a {m}). Queda bonita.",
    "{casilla} pasa a manos de {ganador}, que promete prosperidad. Prometer es gratis.",
    "Los {m} defensores de {casilla} entregan las llaves a {ganador} ({n}). Al menos ellos sí sabían dónde estaban las llaves."
  ],
  "combate.tumulto": [
    "TUMULTO EN {casilla}. Varias casas llegan a la vez y {ganador} es quien queda en pie con lo que le queda.",
    "{casilla} se convierte en un mercado de espadas. Gana {ganador}; los demás pagan en tropas.",
    "Tres ejércitos, una casilla y ningún sentido común. {ganador} se queda {casilla}.",
    "El cronista no ha conseguido apuntar quién atacó primero en {casilla}, pero sí quién ganó: {ganador}.",
    "En {casilla} hubo más casas que sitio. Se queda {ganador}; el resto, la experiencia."
  ],
  "combate.rebote": [
    "{a} y {b} llegan a la vez a {casilla} con la misma fuerza. Se miran, se saludan y se vuelven a casa con la mitad de las tropas.",
    "Empate perfecto en {casilla}: ni {a} ni {b} consiguen entrar. El cronista lo considera una victoria de la geometría.",
    "{a} y {b} chocan a las puertas de {casilla} y rebotan como pelotas. Ambos se repliegan.",
    "{casilla} se queda como estaba. {a} y {b} vuelven a sus tierras explicando que solo estaban de paseo.",
    "Nadie entra en {casilla}: {a} y {b} se anulan mutuamente. El cronista no sabe a quién adular y se abstiene."
  ],
  "combate.apoyo_ataque": [
    "{ganador} toma {casilla} con la inestimable ayuda de {apoyo}. La amistad, a veces, se mide en tropas.",
    "Gracias al apoyo de {apoyo}, {ganador} entra en {casilla}. {perdedor} no esperaba tanta compañía.",
    "{apoyo} no movió ni un soldado, pero sin sus tropas {ganador} no habría tomado {casilla}. Así se hace la historia: de pie y mirando.",
    "Alianza eficaz en {casilla}: {ganador} ataca, {apoyo} apoya y {perdedor} lo lamenta."
  ],
  "combate.apoyo_defensa": [
    "{defensor} resiste en {casilla} con el apoyo de {apoyo}. Los buenos vecinos existen, al menos esta semana.",
    "{apoyo} sostiene la defensa de {casilla} junto a {defensor}. El cronista anota quién ayuda a quién, por si luego hace falta."
  ],
  "combate.apoyo_cortado": [
    "{apoyo} prometió apoyo a {a}, pero un ataque en su propia casilla le tuvo ocupado. {a} atacó solo y se replegó.",
    "El apoyo de {apoyo} no llegó: tenía la casa en llamas. Metafóricamente.",
    "{a} contaba con {apoyo}; {apoyo} contaba con no ser atacado. Ninguno acertó.",
    "Un ataque oportuno corta el apoyo de {apoyo} y desbarata los planes de {a}. Alguien lo había pensado muy bien.",
    "Sin el apoyo de {apoyo}, el ataque de {a} sobre {casilla} se queda en un repliegue genial."
  ],
  "clasificacion.lider": [
    "Saludamos a {líder}, primero en Prestigio ({pv}), cuya sabiduría este humilde cronista lleva elogiando exactamente una semana.",
    "{líder} encabeza el reino con {pv} de Prestigio. El cronista ya ha encargado su retrato, por si acaso.",
    "Gloria a {líder} ({pv}), faro de la nación, ejemplo de pretendientes y, según fuentes propias, muy buen conversador.",
    "{líder} sigue en cabeza ({pv}). El cronista quisiera recordar que siempre le cayó bien.",
    "Con {pv} de Prestigio, {líder} demuestra que el trono le queda como un guante. El guante aún no es oficial.",
    "{líder} ({pv}) lidera el reino con mano firme y sonrisa amable. El cronista no ha visto la sonrisa, pero la imagina.",
    "Primero en Prestigio: {líder} ({pv}). Las demás casas lo felicitan, unas con más entusiasmo que otras.",
    "{líder} ({pv}) ocupa el primer puesto con la naturalidad de quien ha nacido para ello. El cronista lo dice todas las semanas a quien vaya primero.",
    "¡Larga vida a {líder}! ({pv} de Prestigio.) Al menos, hasta el domingo que viene.",
    "{líder} lidera con {pv}. El cronista ha empezado a practicar la reverencia."
  ],
  "clasificacion.nuevo_lider": [
    "Como siempre sostuve, {líder} era el elegido. Cualquier crónica anterior que diga lo contrario es una falsificación.",
    "NUEVO LÍDER: {líder} ({pv}). El cronista corrige discretamente la dedicatoria de su obra.",
    "{líder} toma la cabeza con {pv} de Prestigio. El cronista, fiel a sus principios, cambia de principios.",
    "Las tornas cambian y {líder} ({pv}) pasa a dirigir el reino. El cronista lo vio venir, aunque no lo dijo.",
    "{líder} asciende al primer puesto ({pv}). El cronista ha quemado unos pergaminos sin importancia.",
    "Relevo en la cima: {líder} ({pv}). Este cronista siempre fue un admirador secreto. Tan secreto que ni él lo sabía.",
    "{líder} ({pv}) es el nuevo favorito del reino y, casualmente, del cronista.",
    "Giro en la carrera por el trono: {líder} pasa a liderar con {pv}. El anterior líder recibe una nota de agradecimiento por los servicios prestados."
  ],
  "clasificacion.ultimo": [
    "{último} cierra la tabla con {pv} de Prestigio. El cronista lo menciona con todo respeto, por si acaso.",
    "{último} ({pv}) ocupa el último puesto, que también es un puesto.",
    "{último} ({pv}) avanza a su ritmo. El cronista recuerda que las tortugas también llegan.",
    "Último en Prestigio: {último} ({pv}). Los grandes reyes empezaron desde abajo. Algunos.",
    "{último} ({pv}) recibe hoy la ayuda de la Corona. La Corona espera no tener que repetirlo.",
    "{último} ({pv}) prepara, según sus allegados, una remontada histórica.",
    "El cronista no olvida a {último} ({pv}). De hecho, lo ha apuntado.",
    "{último} ({pv}) está donde está. Por ahora."
  ],
  "economia.subasta": [
    "{jugador} se lleva {lote} en la Gran Subasta por {oro} de Oro. Una inversión que la historia juzgará. Probablemente mal.",
    "¡Adjudicado! {lote} para {jugador} por {oro} de Oro. Los demás pujadores fingen que no lo querían.",
    "{jugador} paga {oro} de Oro por {lote}. El cronista no sabe si es genialidad o capricho, y prefiere no preguntar.",
    "La Gran Subasta corona a {jugador}, que se lleva {lote} por {oro} de Oro. Su tesorero llora en silencio.",
    "{lote} cambia de manos por {oro} de Oro. Las manos nuevas son las de {jugador}.",
    "{jugador} gana {lote} con una puja de {oro} de Oro, demostrando que el dinero sí da la felicidad, o al menos {lote}.",
    "Nadie pujó tanto como {jugador} ({oro} de Oro). {lote} es suyo, y el silencio en la sala también.",
    "{lote} para {jugador} ({oro} de Oro). El cronista apunta que en sus tiempos todo era más barato."
  ],
  "economia.comercio": [
    "Semana de mercaderes: {n} tratos cerrados. {jugador} ha comerciado con todos, menos con su propia conciencia.",
    "{n} tratos esta semana. El reino es pobre, pero comercia con mucho entusiasmo.",
    "{jugador} es el mercader de la semana con {n} tratos. Los demás revisan sus bolsillos.",
    "Los mercados hierven: {n} tratos cerrados. El cronista ha cambiado una pluma vieja por una nueva, y está satisfecho.",
    "{jugador} cierra {n} tratos y se gana el respeto de los mercaderes, y el recelo de todos los demás.",
    "Semana floja en los mercados: solo {n} tratos. Las ratas de la plaza se aburren.",
    "{n} tratos esta semana. Ambas partes de cada trato creen haber ganado, que es lo que distingue al buen comercio.",
    "{jugador} ha hecho negocios con {n} casas distintas. El cronista lo considera diplomacia; las casas, otra cosa."
  ],
  "reino.tranquila": [
    "Semana sin batallas. El reino descansa, los pretendientes conspiran y el cronista se ha dormido sobre el pergamino.",
    "Ni una espada desenvainada. El cronista sospecha que se está tramando algo.",
    "Paz en Aldricia. Las casas acumulan tropas con fines estrictamente decorativos.",
    "Semana tranquila. Tan tranquila que el cronista ha tenido que inventarse el titular.",
    "No hubo combates. Los herreros protestan; los enterradores, también.",
    "Calma total en el reino. Es la clase de calma que los cronistas llaman \"antes de la tormenta\".",
    "Ni guerras ni traiciones. El cronista recomienda a las casas que se animen un poco.",
    "Una semana de paz. Los campesinos, encantados; el cronista, sin material."
  ],
  "reino.construccion": [
    "{jugador} eleva su {edificio} a nivel {nivel}. Los vecinos lo describen como muy alto y un poco presuntuoso.",
    "Nuevo {edificio} de nivel {nivel} para {jugador}. El cronista no entiende de obras, pero aplaude.",
    "{jugador} termina las obras de su {edificio} (nivel {nivel}) a tiempo, cosa nunca vista en el reino.",
    "El {edificio} de {jugador} alcanza el nivel {nivel}. Dicen que desde arriba se ve el trono.",
    "{jugador} amplía su {edificio} a nivel {nivel}. El cronista recuerda que el difunto rey también empezó construyendo.",
    "{jugador} invierte en su {edificio} (nivel {nivel}). Mientras otros conquistan, {jugador} pone ladrillos.",
    "El {edificio} de {jugador} sube a nivel {nivel}. Los albañiles exigen que se mencione su nombre; no se mencionará.",
    "Nivel {nivel} para el {edificio} de {jugador}. Una obra digna de un rey, o al menos de un aspirante."
  ],
  "reino.logro": [
    "{jugador} consigue el logro {logro}. El cronista lo grabaría en piedra, pero la piedra está cara.",
    "{logro} para {jugador}. Un honor que nadie le podrá quitar, aunque lo intentarán.",
    "{jugador} entra en los anales con el logro {logro}. Los anales, de momento, son este pergamino.",
    "El reino reconoce a {jugador} con el logro {logro}. Las demás casas aplauden con una mano.",
    "{jugador} es el primero en lograr {logro}. Ser el primero es lo que cuenta; el segundo no sale en el boletín.",
    "Logro {logro} para {jugador}. El cronista ya ha preparado los adjetivos."
  ],
  "casas.presentacion": [
    "{jugador}, {escudo}, aspira al trono. El cronista prefiere no comentar.",
    "Se presenta {jugador}, {escudo}, bajo el lema \"{lema}\". Prometedor.",
    "{jugador} llega a la corte con un escudo {escudo} y muchas ganas. Las ganas no figuran en el escudo.",
    "{jugador}, {escudo}. Una casa antigua, según ella misma.",
    "Desde sus tierras llega {jugador}, {escudo}. El cronista ya ha practicado cómo pronunciar el nombre.",
    "{jugador}, cuyo lema es \"{lema}\", se suma a la carrera. El cronista anota el lema para usarlo más adelante.",
    "{jugador}, {escudo}, entra en la corte como si fuera suya. Aún no lo es.",
    "Completa la lista de pretendientes {jugador}, {escudo}. Que gane el más capaz, como dijo el rey. O el más astuto, como no dijo."
  ],
  "casas.lema": [
    "{jugador}, cuyo lema es \"{lema}\", acaba de hacer justo lo contrario.",
    "\"{lema}\", dice el lema de {jugador}. Esta semana, el lema y {jugador} no se hablan.",
    "El cronista recuerda que el lema de {jugador} es \"{lema}\". Solo lo recuerda.",
    "\"{lema}\". Precioso lema. {jugador} debería leerlo de vez en cuando.",
    "{jugador} honra su lema, \"{lema}\", a su manera, que es una manera muy particular.",
    "Si el lema de {jugador} (\"{lema}\") fuera una profecía, esta semana habría fallado.",
    "\"{lema}\", proclama {jugador}. Los hechos de la semana proclaman otra cosa.",
    "El cronista propone actualizar el lema de {jugador} de \"{lema}\" a algo más acorde con la semana."
  ],
  "casas.gallina": [
    "{jugador} ha elegido una gallina para su escudo. El cronista considera esto una falta de respeto a la memoria del rey y no dirá más.",
    "El escudo de {jugador} luce una gallina. El cronista ha pedido que se retire de su vista durante los banquetes.",
    "{jugador} lleva una gallina en su escudo. Sea dicho para la historia: el rey Aldric jamás tuvo nada que ver con gallinas."
  ],
  "casas.objetivo_cumplido": [
    "Se revela la ambición oculta de {jugador}: {objetivo}. Cumplida. El cronista siempre lo sospechó.",
    "Sorpresa en la coronación: {jugador} buscaba {objetivo} desde el primer día, y lo ha logrado.",
    "¡{objetivo}! Era la meta secreta de {jugador}, y la ha cumplido delante de todos sin que nadie lo viera.",
    "El objetivo secreto de {jugador} era {objetivo}. El cronista finge que lo sabía."
  ],
  "casas.objetivo_fallido": [
    "{jugador} perseguía en secreto {objetivo}. No lo consiguió, pero nadie se dio cuenta, que ya es algo.",
    "{jugador} se quedó a las puertas de su objetivo secreto, {objetivo}. Las puertas, como siempre, cerradas.",
    "{jugador} desvela su plan: {objetivo}. Ahora se entienden muchas cosas.",
    "{jugador} confiesa que su ambición era {objetivo}. El cronista aplaude la discreción, que es más de lo que suele aplaudir."
  ],
  "rey.fantasma": [
    "El fantasma de Su Majestad Aldric opina que esta semana ha sido un desastre. Su Majestad siempre fue muy exigente.",
    "Su Majestad difunta se ha aparecido en la cocina pidiendo explicaciones. El cronista se las ha dado; no han gustado.",
    "El fantasma del rey afirma que {líder} no le convence. El cronista matiza que al rey no le convencía nadie.",
    "Aldric se apareció a medianoche para quejarse del ruido de las batallas. Se le recordó que fue él quien no dejó heredero.",
    "El espíritu real ha dejado un mensaje: \"Más pan\". Los eruditos debaten su significado.",
    "Según el fantasma de Aldric, en sus tiempos las guerras eran más elegantes. El cronista estaba allí y no lo recuerda así.",
    "El fantasma del rey felicita a {jugador}. El cronista sospecha que lo ha confundido con otra persona.",
    "Su Majestad difunta ha intentado votar en la Gran Subasta. Se le ha explicado, con todo el respeto, que los fantasmas no pujan."
  ],
  "rey.muerte": [
    "Hoy se cumplen {semanas} semanas de la heroica caída del rey Aldric en combate singular contra un ave. Quien hable de huesos será desterrado.",
    "El cronista desmiente, una vez más, los rumores sobre un hueso de pollo. El rey cayó luchando. Contra un pollo, sí, pero luchando.",
    "En memoria de Aldric, que dio su vida por el reino durante un banquete particularmente intenso.",
    "Se prohíbe servir pollo en la corte hasta nuevo aviso. Por respeto. Solo por respeto."
  ],
  "soborno.frase": [
    "Esta semana, {jugador} ha demostrado una vez más su enorme talento para gobernar.",
    "El reino entero comenta la elegancia de {jugador}.",
    "Fuentes muy fiables aseguran que {jugador} es el pretendiente más guapo de la corte.",
    "{jugador} ha sido visto ayudando a una anciana a cruzar El Puente Que Nadie Cruza.",
    "Los campesinos de {jugador} son los más felices del reino, según los propios campesinos de {jugador}.",
    "{jugador} tiene la mejor sopa de la corte. Lo dice todo el mundo que la ha probado gratis.",
    "Si el difunto rey viviera, elegiría a {jugador}. Lo dice el cronista, que lo conocía bien.",
    "La humildad de {jugador} es tan grande que no quería que se publicara esta frase. Ha pagado para que se publique.",
    "Los bardos del reino solo componen canciones sobre {jugador}. Las demás casas no tienen bardos tan caros.",
    "{jugador} nunca ha perdido una batalla que considerara importante.",
    "Dicen que el escudo de {jugador} brilla incluso de noche.",
    "La sabiduría de {jugador} es comparable a la de los grandes reyes antiguos, cuyos nombres el cronista no recuerda."
  ],
  "soborno.pie": [
    "Esta crónica cuenta con el generoso patrocinio de {jugador} ({oro} de Oro).",
    "El cronista agradece a {jugador} su donativo de {oro} de Oro, que en nada ha influido en esta crónica.",
    "Crónica patrocinada por {jugador} ({oro} de Oro). El cronista sigue siendo imparcial, en líneas generales.",
    "Con la colaboración desinteresada de {jugador} ({oro} de Oro). Bueno, interesada.",
    "{jugador} ha contribuido con {oro} de Oro al mantenimiento de la pluma del cronista.",
    "Gracias a {jugador} ({oro} de Oro), el cronista ha cenado caliente esta semana.",
    "Esta crónica ha sido posible gracias a {jugador} ({oro} de Oro). Cualquier parecido con la verdad es mérito suyo.",
    "Patrocinador oficial de esta semana: {jugador}, con {oro} de Oro. Se aceptan más patrocinadores."
  ],
  "margen": [
    "Nota del cronista: esto no lo escribí yo.",
    "Aquí iba un dibujo de un caballero luchando contra un caracol. Ganó el caracol.",
    "Tinta derramada. El cronista culpa a las ratas.",
    "Recordatorio: cobrar el próximo domingo.",
    "Las cifras de arriba son exactas. Los adjetivos, no tanto.",
    "Si encuentras las llaves del tesoro, devuélvelas al cronista. Hay recompensa (pequeña).",
    "Este margen se ha dejado en blanco por respeto al difunto rey.",
    "El dibujo de abajo es un dragón. Si parece un perro, es culpa del pergamino.",
    "Nota para mí mismo: comprar más velas. Y dejar de escribir notas para mí mismo en los boletines.",
    "El cronista se reserva el derecho a cambiar de opinión la semana que viene.",
    "Se buscan escribientes. Sueldo: el honor. Pan: poco.",
    "Si estás leyendo esto, deberías estar dando órdenes."
  ]
} as const;

export type PhraseKey = keyof typeof PHRASES;

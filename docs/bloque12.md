# Bloque 12: diseño de la sección Órdenes

Decidido el 20 de octubre de 2026 · copia del documento «Reyes de Pacotilla: bloque 12, diseño de la sección Órdenes» (claude.ai). No cambia reglas de combate.

Este bloque decide cómo se compone, se repasa y se corrige una orden. Ya está decidido en otros bloques: arrastrar de una casilla a otra abre la orden rellena, la ficha sube desde abajo y vibra al confirmar (bloque 6); la etiqueta de la noche planeada («Sáb 31 · 3 órdenes»), a la que este bloque añade «· 2 sin orden», y el «6 → 2» de las tropas que quedan (bloque 9).

## Cómo es hoy

Dar una orden pide cinco toques desde que abres el mapa: la casilla, «Mover o atacar», el destino, ajustar una barra deslizante por tipo de tropa y «Añadir orden». Para repasarlas hay que ir a la pestaña Órdenes, que es una lista de texto con un enlace Quitar y una tarjeta Simulación.

En el móvil (390x844):

- El compositor queda debajo del mapa: hay que subir y bajar la página entre el destino y las barras.
- Los destinos posibles solo llevan un borde amarillo fino.
- Las flechas de dos órdenes a la misma casilla se tapan.
- Textos confusos: el apoyo ofrece «la defensa de» la casilla que atacas, «1 … apoyan» en plural, el nombre largo del castillo en cada línea y una simulación que no dice claro que el ataque fracasa.
- «Quitar» (57x36) y «Ver en el mapa» (103x36) son pequeños y están lejos de su orden.
- No se puede cambiar una orden, solo quitarla, y nada avisa de que se cierran las órdenes.
- El asedio hay que ordenarlo cada noche; si se olvida, se levanta.

## Qué hacen otros juegos

| Juego | Cómo lo hace | Qué sacamos |
| --- | --- | --- |
| [webDiplomacy](https://webdiplomacy.net/faq.php) | Órdenes sin guardar en rojo; se cambian hasta el cierre; «Listo» adelanta el turno si todos lo marcan | Estado claro de cada orden; adelantar no encaja con la hora fija |
| [PlayDiplomacy](https://www.playdiplomacy.com/help.php) | Se toca la unidad en el mapa; la lista de órdenes se abre desde encima del mapa; recomiendan dar órdenes provisionales pronto | Lista a mano desde el mapa |
| [Frozen Synapse](https://blog.playstation.com/2014/09/11/frozen-synapse-prime-combat-basics-on-ps-vita/) | Se simula el turno antes de confirmarlo | Simulación junto a las órdenes |
| [Backstabbr](https://www.backstabbr.com/how-to-play) | Tocar unidad y destino; botones bajo el mapa en el móvil | Pocos toques |

## Decisiones

| Punto | Decisión |
| --- | --- |
| 1. Cuántas tropas | Botones «−» y «+» por tipo de tropa, con atajos «Todas» y «La mitad». Empieza con todas las que quedan libres |
| 2. Tipo de orden | El destino propone el verbo: casilla tuya → Mover; vacía o enemiga → Atacar; aliada → Entrar; donde ya va un ataque tuyo o aliado → Apoyar; fortaleza o castillo ajeno → Atacar o Sitiar. Debajo, los otros verbos posibles para cambiarlo |
| 3. Cambiar una orden | Tocar la flecha en el mapa, o la orden en la lista, la abre para cambiar tropas, verbo o destino |
| 4. Dónde se repasan | La pestaña Órdenes se queda, rediseñada, y el mapa lleva una etiqueta «3 órdenes · 2 ejércitos sin orden» que abre la lista rápida en la hoja de abajo |
| 5. Avisos | Cada día, una notificación 1 hora antes del cierre: avisa de que las órdenes se cierran y, si la casa aún no ha dado órdenes, le pide que las dé ya. Se puede apagar. Sin lista de avisos en la pestaña |
| 6. Cada orden en la lista | Tarjeta con dibujo pequeño de origen y destino, tropas por tipo, Capitán y la cuenta con lo que ves («6 contra 4, +25% de bosque»). Un ataque y sus apoyos van juntos, con la fuerza total |
| 7. Simulación | En cada orden, su resultado previsto con lo que ves. Botón «¿Y si atacan?» que prueba que cada vecino a la vista ataca con todo lo que le ves y dice qué casillas perderías. Nunca usa nada que la casa no vea |
| 8. Órdenes que se repiten | Casilla «Repetir cada noche» en asedios y apoyos a la defensa: la orden se copia a la noche siguiente hasta que la quites o deje de ser posible |
| 9. Quitar una orden | Papelera de 48x48 y aviso «Deshacer» unos segundos |

## Pasos

Se hace junto al bloque 9, después del 6 y después de las reglas de los bloques 4 y 8, porque usa sus órdenes nuevas (Capitán solo, entrar en casilla aliada, apoyo sin origen).

1. **Compositor nuevo** (puntos 1 a 3): verbo propuesto según el destino, botones «−»/«+» con «Todas» y «La mitad», y abrir una orden ya dada para cambiarla. En el servidor, cambiar una orden es una acción nueva en `app.ts` que la sustituye en el mismo lote.
2. **Lista rápida en el mapa** (punto 4): etiqueta «N órdenes · M ejércitos sin orden» que abre la lista en la hoja de abajo. El recuento de ejércitos sin orden sale de una función nueva del motor (en `plan.ts`, junto a `threats`), con su prueba.
3. **Pestaña Órdenes** (puntos 6 y 9): tarjetas agrupadas por objetivo con la cuenta de fuerza, y papelera con «Deshacer». Corregir de paso los textos confusos de «Cómo es hoy».
4. **Simulación** (punto 7): resultado previsto en cada orden y «¿Y si atacan?», con `project` y `threats`; solo con lo que la casa ve.
5. **Repetir cada noche** (punto 8): columna nueva en `orders` (migración nueva); al resolver, `jobs.ts` copia a la noche siguiente las que siguen siendo posibles (pasadas por `fitOrders`), en el mismo lote y con su clave. El simulador hace lo mismo.
6. **Notificación antes del cierre** (punto 5): tarea diaria en `scheduler.ts` 1 hora antes del cierre, idempotente (clave en `job_runs`), con la hora de la partida vía `schedule.ts`. Ajuste para apagarla.
7. **Comprobar en un móvil** de 390x844: dar, cambiar y quitar una orden contando toques.

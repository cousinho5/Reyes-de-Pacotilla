# Bloque 10: diseño de la sección Comercio

Decidido el 20 de octubre de 2026 · copia del documento «Reyes de Pacotilla: bloque 10, diseño de la sección Comercio» (claude.ai). No cambia reglas de comercio, salvo que las ofertas caducan (punto 5).

Este bloque decide cómo se ordena la pestaña Comercio y cómo se hace y se juzga un trato. Ya está decidido en otros bloques: botones de 48x48 y hojas que suben desde abajo (bloque 6), el dibujo del Mercado en el castillo (bloque 2), y la Corona y los mercenarios (bloque 5).

## Cómo es hoy

La pestaña es una columna de seis tarjetas de texto: Nueva oferta, Gran Subasta, Para ti, Mercado, Tus ofertas abiertas (como mucho 3 públicas), Tus ofertas recientes y Tratos del reino.

- Lo urgente queda abajo: la subasta ocupa media pantalla aunque esté cerrada, y «Para ti» sale después.
- El formulario tiene diez filas de «− número +» (de 5 en 5) para un trato que casi siempre es un recurso por otro.
- No hay referencia de precio.
- Las ofertas no caducan y lo ofrecido no se aparta: si al aceptar ya no lo tienes, el trato falla.

## Qué hacen otros juegos

| Juego | Cómo lo hace | Qué sacamos |
| --- | --- | --- |
| [Forge of Empires](https://forgeofempires.fandom.com/wiki/Trading) | Filtros por recurso y «solo las que puedo aceptar»; Aceptar en gris si no tienes los bienes; ofertas que caducan a los 7 días; casilla «trato justo» que rellena la otra mitad | Filtro, aceptar en gris, caducidad y relleno justo |
| [Travian: Kingdoms](https://support.kingdoms.com/en/articles/69-marketplace) | Filtro «1:1» de cambios justos; cambios entre 1:2 y 2:1; mercader del sistema a 1:1 por una tarifa | Referencia de precio |
| [CATAN Console Edition](https://live.catanconsoleedition.com/news/catan-101-how-trading-works) | Una oferta a todos; cada uno rechaza, contraoferta o acepta, y tú eliges con quién cierras | Ver el regateo |

## Decisiones

| Punto | Decisión |
| --- | --- |
| 1. Orden de la pestaña | Arriba Para ti, Mercado y Tus ofertas. La subasta, en una línea cuando está cerrada («Gran Subasta: lotes el martes») y en tarjeta solo cuando está abierta. Recientes y Tratos del reino, plegados al final |
| 2. Hacer una oferta | Dos líneas, «Das» y «Pides», cada una con un recurso y su cantidad; «+ otro recurso» si hace falta; botones +1, +5 y +10. Botón «Precio justo» que rellena la otra mitad con el precio de referencia |
| 3. Saber si es buen precio | Junto a cada oferta, lo que valdría en Oro con los precios de la Corona del bloque 5, sin su 30%. Sin etiquetas de «buen trato», «justo» o «caro» |
| 4. Qué puedo aceptar | Aceptar en gris si te falta algo, con «te faltan 5 de Hierro» debajo. Filtro «solo las que puedo aceptar» |
| 5. Ofertas que caducan | Caducan a las 3 resoluciones, con la cuenta atrás en la tarjeta («se retira en 2 noches»). Lo ofrecido sigue sin apartarse |
| 6. Qué busca cada casa | Nada nuevo: una casa ya puede publicar una oferta con lo que necesita y lo que está dispuesta a pagar, y las demás la aceptan o contraofertan |
| 7. Corona y mercenarios | La Corona en Comercio (precio del día y lo que queda del tope semanal); los mercenarios en Castillo, junto a Reclutar. Sin atajo para comprar a la Corona desde las fichas de los edificios |
| 8. Contraofertas | La oferta y sus contraofertas van en la misma tarjeta, una debajo de otra. Cada contraoferta puede llevar una frase corta (80 letras como mucho) |

## Revisión del 23 de octubre

Dudas resueltas con Pablo antes de empezar:

- **Corona (punto 7):** ya no tiene tope semanal (se quitó el 22 de octubre), así que solo se enseña el precio del día. Los mercenarios ya estaban en Castillo, debajo de Reclutar.
- **Alianzas:** las propuestas que te hacen van en «Para ti», con Aceptar y Rechazar; el resto del panel, plegado al final de Comercio hasta que el bloque 11 lo lleve a Reino.
- **Valor en Oro:** en los dos lados, debajo de lo que se da y de lo que se pide.
- **Si a quien hizo la oferta ya no le llega:** al intentar aceptarla, la oferta se retira sola y se le avisa («te faltaban 5 de Madera»).
- **Volver a publicar:** botón en Recientes para repetir una oferta tuya caducada o retirada.
- **Frase corta (punto 8):** en cualquier oferta, no solo en las contraofertas.
- **Caducidad (punto 5):** también para las dirigidas y las contraofertas, sin notificación; en Recientes sale «caducada».
- **Cantidades:** −5, +1, +5 y +10, y el número también se puede escribir.

## Pasos

Van después de los bloques 5 (usan los precios de la Corona) y 6.

1. **Orden de la pestaña** (punto 1): Para ti, Mercado y Tus ofertas arriba; subasta en una línea cuando está cerrada; Recientes y Tratos plegados.
2. **Formulario nuevo** (punto 2): dos líneas Das y Pides, «+ otro recurso», botones +1/+5/+10 y «Precio justo».
3. **Precio de referencia** (punto 3): función del motor que da el valor en Oro de un lote con los precios de la Corona (`crown.ts`), con su prueba; se enseña el valor, sin etiquetas. La API solo envía los precios, nunca lo que guarda el reino.
4. **Aceptar en gris y filtro** (punto 4).
5. **Caducidad** (punto 5): columna nueva en `offers` (migración nueva); `jobs.ts` retira las caducadas al resolver, en el mismo lote y con su clave. Los bots de `pruebas.ts` lo tienen en cuenta. Actualizar `docs/diseno.md` (sección 9).
6. **Corona y mercenarios** (punto 7): la Corona en Comercio y los mercenarios en Castillo, junto a Reclutar.
7. **Hilo del trato** (punto 8): las contraofertas ya guardan su oferta madre (`parent_offer_id`); la tarjeta junta la cadena. La frase corta es una columna nueva, de 80 letras como mucho.
8. **Comprobar en un móvil** de 390x844: hacer, contraofertar y aceptar un trato.

## Hecho

- **PR 1** (pasos 1 y 3): Para ti, Mercado y Tus ofertas arriba; la Gran Subasta en una línea si no está abierta (el resultado, plegado); Recientes, Alianzas y Tratos del reino plegados, y las propuestas de alianza recibidas en Para ti (`DiplomacyPanel` con `part="propuestas"`). El valor en Oro de cada lado va debajo de lo que se da y lo que se pide (`referenceValue` de `crown.ts`, con `referenceUnit` y `fairAmount` para «Precio justo»). La API ya enviaba solo los precios de la Corona. Los mercenarios ya estaban en Castillo, debajo de Reclutar.
- **PR 2** (paso 2): formulario con dos lados, Das y Pides. Cada línea elige su recurso con cinco botones (los que ya están en otra línea salen apagados, así que no se puede dar y pedir lo mismo) y la cantidad con −5, +1, +5 y +10, o escribiéndola. «+ otro recurso» añade una línea y «Quitar» la quita. «Precio justo» rellena lo que se pide (si es un solo recurso) con `fairAmount`. Cada lado enseña lo que vale en Oro y, si falta algo, «te faltan 5 de Hierro». Una oferta nueva empieza dando de lo que más tienes y pidiendo de lo que menos.
- **PR 3** (pasos 4 y 5): Aceptar en gris con «Te faltan 5 de Hierro» (`missingFor`) y «Solo las que puedo aceptar» en Mercado. Migración 0018: `offers.expires_after` (resolución actual + `TRADE.offerNights` al crearla, con `offerExpiry`), `offers.expired` y `offers.note`. `runResolution` retira las caducadas en su lote (`expireOffersStatement`); los bots de `pruebas.ts` ponen la caducidad al publicar. La tarjeta dice «Se retira en 2 noches» y Recientes «caducada», con «Volver a publicar». Si al aceptar a quien ofrece ya no le llega, `acceptOffer` retira la oferta y le avisa. El simulador no cambia: allí las ofertas se cierran el mismo día.
- **PR 4** (pasos 7 y 8): la frase corta (`frase` en la API, 80 letras, `TRADE.noteMax`) en cualquier oferta. El hilo del trato va encima de la última oferta (`threadOf`); las contraofertas a tus ofertas públicas cuelgan de ellas en «Tus ofertas» en vez de salir en Para ti. Comprobado en 390x844: hacer, contraofertar dos veces, aceptar y volver a publicar; prueba de humo con caducidad y frase (64 comprobaciones).
- **Gran Subasta** (extra, fuera de los pasos): escena dibujada en pxl (`docs/maquetas/bloque10/pxl/subasta.px.js` → `apps/web/src/art/subasta.ts`), montada en `art/auctionScene.ts` (`renderAuctionScene`, `lotAt`) y pintada en `components/AuctionScene.tsx`. `AuctionPanel.tsx`: abierta, arriba del todo en Comercio con la vela que se consume (desde `abre` hasta el cierre), los sobres por lote (`sobres` de `auctionView`) y una fila de tres columnas con el nombre de cada lote; tocar un lote abre la hoja para pujar. Cerrada, una línea plegada con el resultado contado la primera vez (`localStorage`). En el mapa, «Gran Subasta abierta ›» en la línea de avisos lleva a Comercio. El push del martes empieza por la subasta.

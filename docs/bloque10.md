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

# Simulaciones de equilibrio

Resultados del simulador (`npm run simular`) con los valores actuales de `packages/engine/src/rules.ts`. Los bots son sencillos, así que las cifras marcan tendencias, no verdades: lo que importa es lo que sale muy desequilibrado.

## Cómo se simula

Cada partida reproduce el calendario del servidor: producción diaria, acciones del día, comercio, resoluciones el miércoles y el domingo, mantenimiento, ayuda al último, Prestigio en vivo y final con objetivos secretos.

Cada casa juega con una de estas estrategias:

| Estrategia | Qué hace |
| --- | --- |
| equilibrada | El bot de las partidas de prueba: piloto automático equilibrado y ataques con margen (x1,2 a neutrales, x1,5 a casas). |
| constructora | Sube edificios siempre que puede; solo ataca neutrales y con mucho margen. |
| conquistadora | Recluta todo lo posible y ataca con poco margen, también a otras casas. |
| comerciante | Como la equilibrada, y además cada día cambia 10 de lo que más le sobra por 10 de lo que le falte (si alguien tiene de sobra). |
| ausente | Solo el piloto automático: nunca ataca y defiende con +25%. |
| pasiva | No hace nada. |

Comandos:

```bash
npm run simular                                   # 500 partidas de 6 semanas, 4-8 casas, estrategias mezcladas
npm run simular -- --partidas 2000 --modo espejo  # todas iguales: ¿es justo el reparto inicial?
npm run simular -- --semanas 2                    # partidas cortas
npm run simular -- --json datos.json              # además, todos los datos
```

## Resultados (16 de octubre de 2026)

### Estrategias (1000 partidas de 6 semanas)

| Estrategia | Gana | x lo esperado | Prestigio medio |
| --- | --- | --- | --- |
| comerciante | 45% | 2,7 | 41,7 |
| equilibrada | 30% | 1,8 | 35,8 |
| constructora | 14% | 0,9 | 32,0 |
| conquistadora | 8% | 0,5 | 25,1 |
| ausente | 0% | 0 | 18,8 |
| pasiva | 0% | 0 | 7,7 |

«x lo esperado»: 1,0 es lo que ganaría por puro azar.

### Lo que está bien

- **Las especialidades iniciales son justas.** Con todas las casas iguales (2000 partidas), cada pareja gana entre 0,9 y 1,1 veces lo esperado.
- **Comerciar compensa.** La comerciante gana casi el triple de lo esperado. El comercio es central en el diseño y los números lo respaldan.
- **La partida de 6 semanas no se decide pronto.** El líder tras la semana 2 gana entre el 20% (casas iguales) y el 49% (estrategias mezcladas).
- **El piloto automático sostiene a quien se ausenta** (19 de Prestigio frente a 8 sin piloto), pero nunca le hace ganar.

### Lo que está desequilibrado

1. **El Hierro es el único recurso escaso.** Al final quedan de media unos 100 de Pan, 130-150 de Madera y 135-220 de Oro sin gastar, y casi 0 de Hierro. Cada tropa cuesta 2 de Hierro y la mina a nivel 1 da 2 al día. Como a nadie le sobra Hierro, el comercio no puede resolver esa escasez.
2. **El mantenimiento no se nota.** Ninguna casa sufre deserciones, porque el Pan siempre sobra.
3. **El Oro se acumula sin uso** hasta la versión 1, cuando llegarán la subasta y los sobornos. La Riqueza toca techo en 250 de Oro.
4. **Atacar sale caro.** La conquistadora gana la mitad de lo esperado. Además, con casas iguales las casillas cambian de dueño una y otra vez: de 20 a 56 casillas robadas por partida.
5. **Los objetivos secretos son muy desiguales.**
   - Casi regalados: oro_100 (96-100%), tropas_30 (61-75%) y casilla_ajena (55-100%).
   - Casi imposibles: dos_puertos (2%), comercio_con_todas (0-4%) y obra_maestra (0%). En obra_maestra influye que los bots no se especializan; una persona sí lo haría.
6. **La partida de 2 semanas es una carrera corta.** El líder tras la semana 2 gana el 84% de las veces, el 14% se decide por desempate y el ganador acaba con unos 20 de Prestigio.

## Propuestas (sin aplicar)

| Problema | Cambio propuesto en rules.ts |
| --- | --- |
| Hierro escaso y Pan sobrante | Tropa: 1 de Hierro + 2 de Pan (ahora 2 + 1) |
| Mantenimiento sin efecto | 1 de Pan por cada 2 tropas (ahora por cada 4) |
| Madera sobrante y Piedra justa | Mejoras con más Madera que Piedra, por ejemplo 15/10, 30/20, 50/30, 75/45 |
| Objetivos regalados | oro_100 → oro_200; tropas_30 → tropas_40; casilla_ajena → quitar 3 casillas a otras casas |
| Objetivos imposibles | dos_puertos → un puerto y una fortaleza; comercio_con_todas → comerciar con 3 casas distintas |
| Piloto demasiado corto | Hacer la partida piloto de 4 semanas |

Cada cambio se comprueba volviendo a simular antes de aplicarlo al diseño (`docs/diseno.md`).

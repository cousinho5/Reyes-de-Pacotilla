# Bots para rellenar partidas

Plan aprobado por Pablo el 24 de octubre de 2026 (documento de trabajo en claude.ai, «Bots para rellenar partidas: plan»). Objetivo: poder jugar una partida normal con pocas personas (Pablo y un amigo) rellenándola con bots, y que los bots usen todo el juego de forma realista.

## Decisiones

1. La partida de prueba con el amigo será una partida normal de 2 semanas con el calendario real (una noche al día) y 2 o 3 bots.
2. Sin ritmo más rápido en esta fase.
3. Se sabe quién es bot: marca pequeña junto al escudo (espantapájaros de pxl, 16x16) y «Casa gobernada por su mayordomo» en la ficha. La personalidad no se enseña.
4. La personalidad sale al azar (sin repetir hasta agotarlas) o se elige al añadir el bot.
5. Tres niveles: Novato, Normal (el bot de hoy) y Taimado, con `BOT_LEVELS` en `rules.ts` modificando los pesos de la personalidad.
6. Los bots tratan igual a personas y a bots. Se comprueba en el simulador con «2 personas de mentira + bots».
7. Proclamas de los bots: banco nuevo (sección 24), como mucho una por semana, y respuesta si les mencionan con «@».
8. Comercio con personas: contraofertas a las ofertas que les hagan (si están cerca del precio justo) y frase corta. Sin ofertas dirigidas.
9. No se cambia un bot por una persona a mitad de partida.
10. Quien deja de jugar sigue con el piloto automático (3 días); no se convierte en bot.
11. Plan gratuito de Cloudflare (ver «CPU» abajo).

Ideas extra: entra el **rencor con memoria** (si le atacas, te lo recuerda en su proclama y no comercia contigo unos días). Quedan fuera el mayordomo en el boletín, el estilo de proclama por personalidad y el aviso del aliado bot. Como no hay aviso del aliado, **los bots solo ven las órdenes de sus aliados bots**, no las de una persona (ella tampoco ve las suyas).

## Cómo juegan en una partida real (PR 1)

- El cerebro sigue en `packages/engine/src/ai`. El servidor los mueve desde `apps/server/src/bots.ts`, que usan igual la mesa de pruebas (`pruebas.ts`, reloj simulado) y el cron (`runBotJobs`, llamado por `runHourly` tras `runGameJobs`).
- Horario (`BOT_SCHEDULE` en `rules.ts`, `dueBotJobs` en `scheduler.ts`): cada bot juega su día a su hora (`botHour`, de 9 a 19, sale de la semilla), o en cuanto pase el cron si se saltó esa hora; contesta ofertas y alianzas de 9 a 24 con 1 a 3 horas de retraso (`answerDelayHours`); da sus órdenes en la última hora antes del cierre. De madrugada no hace nada.
- El día se reserva antes en `job_runs` (`bot_dia:casa:fecha`): nunca juega dos veces; si algo falla a medias, ese día se queda sin terminar.
- Si un cron perdido deja a un bot sin órdenes, las da justo antes de la resolución.
- `isAbsent` devuelve falso para los bots: no pasan al piloto automático.

## CPU

Medido con el simulador (8 casas, 2 semanas, 10 partidas): la resolución del motor tarda de media 0,35 ms (máximo 1,2 ms) y el turno de un bot unos 3 ms. El límite del plan gratuito es de 10 ms de CPU por llamada; como cada bot juega a su hora, rara vez coinciden varios en la misma. Si en los registros de Cloudflare aparece «exceeded CPU», el plan de 5 $ al mes lo resuelve.

## Pasos

1. **PR 1: bots en partidas reales** (hecho): `bots.ts`, horario, órdenes antes del cierre y de reserva, `isAbsent`.
2. **PR 2: sala de espera y marca de bot**: «Añadir bot» y quitarlo, «Rellenar hasta 4» al empezar, más nombres, niveles, espantapájaros y su sitio en clasificación, ficha y portada.
3. **PR 3: comercio y diplomacia más humanos**: contraofertas con frase, límite de tratos por casa, retirar ofertas, rencor en el comercio, informe `--informe bots` en el simulador.
4. **PR 4: la voz de los bots**: proclamas (sección 24), respuestas a menciones, soborno con motivo, fe de erratas, repaso de las 11 ambiciones.

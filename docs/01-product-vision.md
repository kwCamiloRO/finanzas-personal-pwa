# 01 — Product Vision

## En una frase

Un asistente financiero personal que vive en tu bolsillo, funciona sin internet y te ayuda a tomar decisiones antes de gastarte la plata, no a contarla después.

## Lo que NO es

- No es una app de contabilidad.
- No es un presupuesto mensual.
- No es un libro de gastos.
- No es una herramienta de inversión.
- No es una plataforma social/colaborativa.

## Lo que SÍ es

- Una herramienta **predictiva**: dice qué viene, no qué pasó.
- Una herramienta **decisional**: simula impactos antes de actuar.
- Una herramienta **privada**: los datos no salen del dispositivo.
- Una herramienta **mobile-first**: optimizada para una mano, sin red.

## Preguntas que la app responde diariamente

| Pregunta | Cómo la responde |
|---|---|
| ¿Cuánto dinero me queda realmente? | Indicador "Dinero Libre Real" en el Dashboard. |
| ¿Cuánto puedo gastar hoy? | "Gasto máximo diario recomendado" = DLR / días hasta próximo pago. |
| ¿Cuánto tengo comprometido? | Total obligaciones pendientes con desglose por prioridad y vigencia. |
| ¿Estoy sobregirado? | Indicador "Necesidad de Financiamiento" y semáforo de Estado Financiero. |
| ¿Qué obligaciones están en riesgo? | Card de "Vencidas" + lista de "Próximas a vencer". |
| ¿Qué pasará el próximo ciclo? | Vista de Proyecciones (1 ciclo). |
| ¿Puedo asumir una nueva obligación? | Indicador "Capacidad de Endeudamiento". |
| ¿Estoy mejorando o empeorando? | Indicador "Tendencia" comparando últimos 3 ciclos. |
| ¿Qué plan me recomienda el sistema? | Card "Recomendaciones" + botón "Generar plan automático". |

## Audiencia

Una sola persona: el usuario que la instala. La app no soporta multi-usuario; cada dispositivo es una identidad independiente. El respaldo JSON permite migrar a otro dispositivo manualmente.

## Hipótesis fundamentales

1. **Las decisiones financieras se toman en el momento, no al final del mes.** Por eso captura rápida + dashboard predictivo > reportes a fin de mes.
2. **La privacidad financiera vale más que la sincronización.** El usuario prefiere mover el respaldo a la nube manualmente si quiere, antes que ceder sus datos.
3. **Los ciclos de nómina importan más que los meses calendario.** En Colombia un pago el día 30 manda hasta el siguiente 15; el calendario no.
4. **La gente sabe lo que tiene que hacer; lo que necesita es ver el impacto.** El simulador de planes es el diferenciador.

## Métricas de éxito (uso personal, no comerciales)

- Tiempo promedio para registrar un gasto: **< 5 segundos**.
- Frecuencia de consulta del Dashboard: **≥ 1 vez/día**.
- Cantidad de planes simulados antes de tomar una decisión grande: **≥ 1**.
- Cantidad de obligaciones vencidas no detectadas: **0**.

## Anti-objetivos

- No competir con Mint, Splitwise, ni apps de inversión.
- No ofrecer "metas de ahorro" gamificadas; eso distrae del problema real (¿cuánto tengo realmente disponible?).
- No incluir publicidad, tracking, ni analytics de terceros.
- No agregar features que requieran backend.

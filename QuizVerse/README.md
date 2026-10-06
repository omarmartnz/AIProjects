# QuizVerse

QuizVerse es un **proyecto de trivia multijugador en tiempo real** creado por IA en **Google AI Studio** (frontend React + TypeScript + Vite, backend Express + WebSocket).

> **Estado del proyecto:** **INCONCLUSO**  
> **Revisión de seguridad:** **NO REALIZADA**  
> **Revisión de funcionabilidad:** **NO REALIZADA**

## ¿Qué hace actualmente?

- Biblioteca de quizzes por categorías y dificultad.
- Modo **solo** con temporizador, rachas, puntaje y feedback por pregunta.
- Modo **multijugador en tiempo real** con:
  - creación/unión de salas por código,
  - lobby de jugadores,
  - partida sincronizada por preguntas,
  - chat en vivo,
  - podio final.
- Creador de quizzes comunitarios (publicación desde UI).
- Reto diario con bonificación.
- Tabla de clasificación global/mensual.
- Personalización de avatar y centro de notificaciones.

## Hallazgos técnicos (análisis actual)

1. **Estado en memoria (no persistente):** quizzes, ranking y salas activas viven en memoria del proceso (`server.ts`), por lo que se pierden al reiniciar.
2. **Reconexión multijugador limitada:** durante partida, un jugador desconectado no puede reingresar porque `JOIN_ROOM` solo acepta salas en estado `waiting`.
3. **Confianza excesiva en el cliente (riesgo de manipulación):**
   - `CREATE_ROOM` permite enviar `customQuiz` completo desde cliente.
   - `/api/leaderboard/submit` acepta `pointsEarned` desde cliente.
4. **Fechas hardcodeadas:** hay valores fijos como `2026-09` y textos de fecha estáticos en ranking/reto diario.
5. **Tipado laxo (`any`) en frontend:** reduce seguridad de tipos y aumenta riesgo de regresiones.
6. **Inconsistencias de lógica de negocio:**
   - en cliente se incrementa `gamesWon` en multiplayer de forma incondicional;
   - en servidor `winRate` no se recalcula al actualizar puntajes.
7. **Capacidad IA declarada pero no integrada:** se declara capacidad Gemini y dependencia `@google/genai`, pero no hay integración funcional visible.
8. **Script no portable para Windows:** `clean` usa `rm -rf` en `package.json`.

## Advertencia de uso

Este proyecto debe considerarse **prototipo**.  
No está listo para producción mientras no pase revisión formal de seguridad, robustez en tiempo real y validación funcional end-to-end.

# Prompt original de generación (formateado)

Dame una app de juego en donde los jugadores deben de responder quiz de varias categorías.  
Gana quien tenga más puntos y hay un récord de puntuación global.  
Los quiz son públicos y cualquier usuarios puede crear uno.  
Incluye un modo multijugador en tiempo real para mayor dinamismo y un sistema de chat integrado para los participantes.  
Además, incluye tablas de clasificación mensuales y avatares personalizable.  
Retos diarios.  

La app debe ser moderna con un modo dark y light.  
Debe de incluir animaciones fluidas entre pantallas y transiciones suaves durante la navegación.  
También debe permitir notificaciones push personalizadas para mantener a los usuarios comprometidos.

---

## Resumen limpio del resultado (sin referencias a archivos)

Se desarrolló una aplicación de **Trivia Quiz Multijugador en Tiempo Real** con diseño moderno, soporte de tema oscuro/claro y navegación con animaciones suaves.

### Funcionalidades implementadas

- **Multijugador en tiempo real (WebSocket)**:
  - Creación de salas públicas/privadas con código de invitación.
  - Sincronización de preguntas, temporizador compartido y revelación simultánea de respuestas.
  - Podio final (1.º, 2.º y 3.º) con confeti y acumulación de puntuación.

- **Chat integrado en sala**:
  - Mensajería en vivo entre participantes.
  - Mensajes con avatar, nombre y marca de tiempo.
  - Reacciones rápidas con emojis.

- **Biblioteca y creación comunitaria de quizzes**:
  - Filtros por categorías y dificultad.
  - Creación pública de quizzes con preguntas, opciones, respuesta correcta, tiempo límite y explicación.

- **Clasificación mensual y récord global**:
  - Vista de ranking mensual y ranking histórico global.
  - Podio visual + tabla con posición del usuario.

- **Avatares personalizables**:
  - Editor visual de avatar con estilos, colores, expresiones y accesorios.
  - Títulos de perfil para identidad del jugador.

- **Retos diarios y racha**:
  - Desafío diario con meta mínima de aciertos y bonificación de puntos.
  - Seguimiento de rachas por días consecutivos.

- **Notificaciones push personalizadas**:
  - Solicitud de permisos y configuración de alertas.
  - Recordatorios de reto diario, invitaciones multijugador y avisos de ranking.
  - Notificaciones emergentes dentro de la interfaz.

- **UX moderna (dark/light + transiciones)**:
  - Diseño visual contemporáneo.
  - Transiciones fluidas entre pantallas y feedback audiovisual en eventos de juego.

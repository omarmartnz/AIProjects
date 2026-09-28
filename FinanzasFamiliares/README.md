# FinanzasFamiliares

## Descripción detallada

Este proyecto implementa un espacio financiero familiar compartido donde varios miembros pueden registrar movimientos, organizar categorías y etiquetas, planificar metas de ahorro, revisar deuda, y generar reportes (incluyendo exportaciones).  

Incluye autenticación y sincronización cloud con Firebase, reglas de acceso por familia, y capacidades auxiliares para flujos de seguridad y operación (por ejemplo, configuración de entorno, políticas de acceso y despliegue).  

También incorpora funciones orientadas a experiencia y productividad, como paneles con métricas, módulos educativos y herramientas de apoyo para toma de decisiones financieras en contexto familiar.

> **Nota de origen del proyecto:** esta aplicación es **experimental**, fue **generada con Google AI Studio usando Gemini 3.8 Flash** y posteriormente **revisada por mí** para su ajuste, validación y publicación.

Este proyecto requiere configuración local antes de ejecutarse.

## Documentación adicional (`docs/`)

- `docs/resumen-conversacion-ai-studio.md`: resumen depurado de la conversación original y de la evolución funcional/técnica del proyecto.
- `docs/prompts-y-respuestas-solo-texto.md`: transcripción limpia con solo prompts y respuestas (sin logs ni metadatos de ejecución).

## Notas de seguridad

- La versión inicial generada a partir de los prompts contenía múltiples fallas de seguridad y exposición de datos.
- Dichas violaciones se detectaron y corrigieron únicamente después de una revisión manual exhaustiva realizada por mí.
- Este patrón (entregar una base funcional pero con brechas de seguridad relevantes) es un comportamiento relativamente típico en aplicaciones generadas por IA y debe mitigarse con revisión técnica humana antes de publicar.

## Configuración obligatoria de Firebase

Completa `firebase-applet-config.json` con los valores reales de tu proyecto:

- `projectId`
- `appId`
- `apiKey`
- `authDomain`
- `firestoreDatabaseId`
- `storageBucket`
- `messagingSenderId`
- `measurementId` (si usas Analytics)
- `oAuthClientId` (si usas Google Sign-In)
- `recaptchaSiteKey` (si usas reCAPTCHA)

## Variables de entorno

Configura también tus variables en `.env` (puedes usar `.env.example` como base):

- `GEMINI_API_KEY`
- `APP_URL`
- `VITE_CLOUD_SECURITY_MODE` (`compat` o `strict`)

## Ejecución local

1. Instala dependencias:
   - `bun install` o `npm install`
2. Inicia en modo desarrollo:
   - `bun run dev` o `npm run dev`

# Referencia de API — cv-api-wp

API backend para el agente WhatsApp de TrabajoYa. Recibe mensajes vía webhooks de Zavu, gestiona conversaciones de registro de CV y expone endpoints de administración y envío de notas de voz.

**Base URL:** `http://localhost:3000` (desarrollo) o la URL de producción configurada en `PUBLIC_BASE_URL`.

---

## Tabla de contenidos

1. [Autenticación](#autenticación)
2. [Health](#health)
3. [Webhooks](#webhooks)
4. [Voice API](#voice-api)
5. [Admin — Auth](#admin--auth)
6. [Admin — API](#admin--api)
7. [Recursos estáticos](#recursos-estáticos)
8. [Errores comunes](#errores-comunes)
9. [Flujo de conversación WhatsApp](#flujo-de-conversación-whatsapp)

---

## Autenticación

La API usa tres mecanismos según el módulo:

| Módulo | Mecanismo | Header |
|--------|-----------|--------|
| Admin API | JWT Bearer | `Authorization: Bearer <token>` |
| Voice API | API Key | `X-Api-Key: <VOICE_API_KEY>` |
| Webhook Zavu | Firma HMAC | `X-Zavu-Signature: <firma>` |

### Admin (JWT)

1. Obtener token con `POST /admin/api/auth/login`.
2. Enviar el `accessToken` en todas las peticiones protegidas:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

El token expira según `JWT_EXPIRES_IN` (por defecto `7d`).

### Voice API

Todas las rutas bajo `/api/voice/*` requieren la clave configurada en `VOICE_API_KEY`:

```http
X-Api-Key: tu-clave-secreta
```

### Webhook Zavu

Zavu firma el cuerpo crudo del request. La verificación usa `ZAVU_WEBHOOK_SECRET`. En desarrollo local se puede desactivar con `ZAVU_SKIP_SIGNATURE_VERIFICATION=true`.

---

## Health

### `GET /health`

Verifica conectividad con PostgreSQL y Redis. No requiere autenticación.

**Respuesta 200**

```json
{
  "status": "ok",
  "checks": {
    "postgres": true,
    "redis": true
  },
  "timestamp": "2026-07-04T19:30:00.000Z"
}
```

| Campo | Descripción |
|-------|-------------|
| `status` | `"ok"` si ambos servicios responden; `"degraded"` si alguno falla |
| `checks.postgres` | Resultado del ping a la base de datos |
| `checks.redis` | Resultado del ping a Redis |

---

## Webhooks

### `POST /webhooks/zavu`

Recibe eventos entrantes de Zavu (mensajes WhatsApp). Responde `200 OK` con cuerpo `"OK"`.

**Headers requeridos**

| Header | Descripción |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-Zavu-Signature` | Firma HMAC del body (omitir si `ZAVU_SKIP_SIGNATURE_VERIFICATION=true`) |

**Eventos procesados**

Solo se procesan eventos con `type: "message.inbound"`. Otros tipos se ignoran silenciosamente.

**Payload de ejemplo (Zavu → API)**

```json
{
  "type": "message.inbound",
  "data": {
    "from": "+50371234567",
    "message": {
      "id": "msg_abc123",
      "type": "text",
      "text": "Hola"
    }
  }
}
```

**Comportamiento**

1. Verifica la firma del webhook.
2. Extrae `waMessageId` y `waNumber` (`data.from`).
3. Deduplica por `waMessageId` (reintentos de Zavu se ignoran).
4. Encola el mensaje en BullMQ para procesamiento asíncrono.

**Errores**

| Código | Causa |
|--------|-------|
| `401` | Firma inválida, body ausente o secret no configurado |

---

## Voice API

Genera audio con ElevenLabs TTS, lo almacena localmente y lo envía como nota de voz por WhatsApp vía Zavu.

### `POST /api/voice/send`

**Autenticación:** `X-Api-Key`

**Body (JSON)**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `text` | string | Sí | Texto a sintetizar (máx. 5000 caracteres) |
| `phone` | string | Sí | Número destino. E.164 (`+50371234567`) o formato local salvadoreño |
| `voiceId` | string | No | ID de voz ElevenLabs. Usa `ELEVENLABS_VOICE_ID` por defecto |
| `idempotencyKey` | string | No | Clave de idempotencia para evitar envíos duplicados en Zavu |

**Ejemplo de request**

```bash
curl -X POST http://localhost:3000/api/voice/send \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: tu-voice-api-key" \
  -d '{
    "text": "Hola, tu postulación ha sido recibida.",
    "phone": "+50371234567"
  }'
```

**Respuesta 200**

```json
{
  "ok": true,
  "messageId": "msg_xyz789",
  "audioUrl": "https://api.example.com/media/audio/abc123.mp3"
}
```

| Campo | Descripción |
|-------|-------------|
| `messageId` | ID del mensaje en Zavu/WhatsApp |
| `audioUrl` | URL pública del MP3 generado (servido en `/media/audio/`) |

**Errores**

| Código | Causa |
|--------|-------|
| `400` | `text` o `phone` ausente/inválido, texto demasiado largo |
| `401` | API key inválida o no configurada |
| `502` | Error en ElevenLabs o fallo al enviar por Zavu |
| `503` | ElevenLabs, `PUBLIC_BASE_URL` o Voice API no configurados |

**Dependencias de entorno**

- `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`
- `PUBLIC_BASE_URL` (URL base para servir el audio generado)
- `ZAVUDEV_API_KEY` (envío WhatsApp)
- `VOICE_API_KEY` (autenticación del endpoint)

---

## Message API

Envía un mensaje de texto por WhatsApp vía Zavu. Misma autenticación que la Voice API.

### `POST /api/message/send`

**Autenticación:** `X-Api-Key`

**Body (JSON)**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `text` | string | Sí | Texto a enviar (máx. 5000 caracteres) |
| `phone` | string | Sí | Número destino. E.164 (`+50371234567`) o formato local salvadoreño |
| `idempotencyKey` | string | No | Clave de idempotencia para evitar envíos duplicados en Zavu |

**Ejemplo de request**

```bash
curl -X POST http://localhost:3000/api/message/send \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: tu-voice-api-key" \
  -d '{
    "text": "Hola, tu postulación ha sido recibida.",
    "phone": "+50371234567"
  }'
```

**Respuesta 200**

```json
{
  "ok": true,
  "messageId": "msg_xyz789"
}
```

| Campo | Descripción |
|-------|-------------|
| `messageId` | ID del mensaje en Zavu/WhatsApp |

**Errores**

| Código | Causa |
|--------|-------|
| `400` | `text` o `phone` ausente/inválido, texto demasiado largo |
| `401` | API key inválida o no configurada |
| `502` | Fallo al enviar por Zavu |
| `503` | Zavu o Message API no configurados |

**Dependencias de entorno**

- `ZAVUDEV_API_KEY` (envío WhatsApp)
- `VOICE_API_KEY` (autenticación del endpoint)

---

## Admin — Auth

### `POST /admin/api/auth/login`

Autentica un usuario del panel de administración.

**Body (JSON)**

```json
{
  "username": "admin",
  "password": "trabajoya2024"
}
```

**Respuesta 200**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@trabajoya.com",
    "name": null
  }
}
```

**Errores**

| Código | Causa |
|--------|-------|
| `401` | Usuario o contraseña incorrectos |

> Usuario inicial creado por seed: `admin` / `trabajoya2024` (configurable con `ADMIN_USERNAME` y `ADMIN_PASSWORD`).

---

### `GET /admin/api/auth/me`

Devuelve el usuario autenticado.

**Autenticación:** JWT Bearer

**Respuesta 200**

```json
{
  "id": "uuid",
  "username": "admin",
  "email": "admin@trabajoya.com",
  "name": null
}
```

---

## Admin — API

Todos los endpoints requieren JWT Bearer (`Authorization: Bearer <token>`).

Las respuestas paginadas siguen el formato:

```json
{
  "data": [ ... ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

Parámetros de paginación comunes: `page` (default `1`), `limit` (default varía, máx. `100`).

---

### `GET /admin/api/stats`

Métricas generales del sistema.

**Respuesta 200**

```json
{
  "sessionsTotal": 120,
  "sessionsActive": 45,
  "sessionsHandoff": 3,
  "messagesTotal": 890,
  "messagesToday": 52,
  "webhooksTotal": 450,
  "webhooksToday": 28,
  "requestCapturesTotal": 460,
  "requestCapturesToday": 30
}
```

---

### `GET /admin/api/sessions`

Lista sesiones de conversación WhatsApp.

**Query params**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `page` | number | Página (default `1`) |
| `limit` | number | Resultados por página (default `20`, máx. `100`) |
| `status` | string | Filtrar por estado: `active`, `idle`, `closed`, `handoff` |
| `search` | string | Buscar por número WhatsApp (`waNumber`) |

**Respuesta — item de sesión**

```json
{
  "id": "uuid",
  "waNumber": "+50371234567",
  "currentStep": "ASK_CV",
  "status": "active",
  "context": { "fullName": "Juan Pérez" },
  "lastMessageAt": "2026-07-04T18:00:00.000Z",
  "createdAt": "2026-07-04T17:30:00.000Z",
  "messageCount": 8
}
```

---

### `GET /admin/api/sessions/:waNumber`

Detalle de una sesión con historial completo de mensajes.

**Parámetro de ruta:** `waNumber` — número WhatsApp (URL-encoded, ej. `%2B50371234567`).

**Respuesta 200**

Incluye todos los campos de la sesión más un array `messages` con preview legible de cada mensaje.

**Errores**

| Código | Causa |
|--------|-------|
| `404` | Sesión no encontrada |

---

### `GET /admin/api/messages`

Lista global de mensajes (inbound y outbound).

**Query params**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `page`, `limit` | number | Paginación |
| `direction` | string | `inbound` o `outbound` |
| `sessionId` | string | UUID de la sesión |
| `search` | string | Buscar por número WhatsApp de la sesión |

---

### `GET /admin/api/analytics/funnel`

Distribución de sesiones por paso del flujo de conversación.

**Respuesta 200**

```json
{
  "byStep": [
    { "step": "MENU_ROOT", "count": 30 },
    { "step": "ASK_FULL_NAME", "count": 25 },
    { "step": "ASK_CV", "count": 20 },
    { "step": "INTAKE_REGISTERED", "count": 45 }
  ],
  "byStepAndStatus": [
    { "step": "ASK_CV", "status": "active", "count": 15 },
    { "step": "INTAKE_REGISTERED", "status": "idle", "count": 40 }
  ]
}
```

**Pasos del funnel**

| Step | Descripción |
|------|-------------|
| `MENU_ROOT` | Inicio / bienvenida |
| `ASK_FULL_NAME` | Esperando nombre completo |
| `ASK_CV` | Esperando documento CV |
| `INTAKE_REGISTERED` | Intake creado en TrabajoYa |
| `MENU_MAIN` | Menú principal post-registro |

---

### `GET /admin/api/webhook-events`

Lista eventos de webhook procesados (deduplicación).

**Query params:** `page`, `limit`

---

### `GET /admin/api/webhook-events/:id`

Detalle de un evento webhook con contexto enriquecido:

- Mensaje inbound asociado
- Respuesta outbound generada
- Request HTTP crudo capturado (si existe)

---

### `GET /admin/api/request-captures`

Lista requests HTTP capturados (middleware de observabilidad).

**Query params**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `page`, `limit` | number | Paginación |
| `path` | string | Filtrar por ruta (contains) |
| `method` | string | Filtrar por método HTTP |
| `statusCode` | number | Filtrar por código de respuesta |

---

### `GET /admin/api/request-captures/:id`

Detalle completo de un request capturado (headers, body, duración, IP, etc.).

---

## Recursos estáticos

| Ruta | Descripción |
|------|-------------|
| `GET /admin/` | Panel de administración (SPA) |
| `GET /media/audio/:filename` | Archivos MP3 generados por Voice API |

---

## Errores comunes

NestJS devuelve errores con el formato estándar:

```json
{
  "statusCode": 401,
  "message": "Invalid API key",
  "error": "Unauthorized"
}
```

| Código | Significado |
|--------|-------------|
| `400` | Parámetros inválidos o faltantes |
| `401` | Autenticación fallida (JWT, API key o firma webhook) |
| `404` | Recurso no encontrado |
| `502` | Error en servicio externo (ElevenLabs, Zavu, TrabajoYa) |
| `503` | Servicio no configurado o dependencia no disponible |

---

## Flujo de conversación WhatsApp

El bot guía al usuario por WhatsApp para registrar su CV en TrabajoYa:

```
MENU_ROOT → ASK_FULL_NAME → ASK_CV → INTAKE_REGISTERED → MENU_MAIN
```

1. **MENU_ROOT** — Mensaje de bienvenida; avanza a pedir nombre.
2. **ASK_FULL_NAME** — Recibe el nombre completo del candidato.
3. **ASK_CV** — Recibe un documento (PDF/DOCX). Parsea el CV y crea un intake en TrabajoYa.
4. **INTAKE_REGISTERED** — Confirma registro y muestra menú principal.
5. **MENU_MAIN** — Menú interactivo con opciones:
   - Ver perfil (`menu_profile`)
   - Reiniciar conversación (`menu_reset`)

**Comandos especiales**

| Comando | Acción |
|---------|--------|
| `menu` | Vuelve al menú según el paso actual |
| `reset` / `reiniciar` | Reinicia la conversación desde cero |

**Estados de sesión**

| Status | Descripción |
|--------|-------------|
| `active` | Conversación en curso |
| `idle` | Sin actividad reciente |
| `closed` | Sesión cerrada |
| `handoff` | Transferida a agente humano |

---

## Variables de entorno

Ver [`.env.example`](../.env.example) para la lista completa. Resumen:

| Variable | Módulo | Descripción |
|----------|--------|-------------|
| `DATABASE_URL` | Core | PostgreSQL |
| `REDIS_HOST`, `REDIS_PORT` | Core | Redis / BullMQ |
| `ZAVUDEV_API_KEY` | Zavu | API key para envío WhatsApp |
| `ZAVU_WEBHOOK_SECRET` | Webhook | Secret para verificar firmas |
| `JWT_SECRET` | Admin | Secret para firmar tokens JWT |
| `VOICE_API_KEY` | Voice | API key del endpoint de voz |
| `PUBLIC_BASE_URL` | Voice | URL pública para servir audio |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | Voice | Text-to-speech |
| `TRABAJOYA_INTAKE_API_KEY` | Conversación | API key para crear intakes |

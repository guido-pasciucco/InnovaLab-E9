# BA Protege+ — Frontend/Mobile (React Native + TypeScript + Kotlin) — v10 (1.0.0-rc1)

Estado a las **Semanas 10-11** (build candidato `1.0.0-rc1`). Documentos: **GUIA_SEMANAS_10_11.md** (cómo generar el APK release), **VALIDACION_DISPOSITIVOS.md** (pruebas por dispositivo), **LIMITACIONES_ANDROID.md**, y las guías de las semanas 8 y 9.

## Estructura

```
App.tsx
src/
  api/          Cliente de Backend: Firebase Auth (REST), HTTP, endpoints reales y simulados
  security/     Intentos de PIN persistentes y escalonados
  config/env.ts URL del backend, Web API Key de Firebase y flags de endpoints pendientes
  components/   Badge de estado, PIN, compuerta de PIN, código de vinculación, filas de eventos, formularios
  data/         Lista de respaldo (demo)
  hooks/        useProtection, useCriticalAction, useDeviceHistory, useAsyncData
  native/       Contrato del módulo nativo + mock + selector automático
  navigation/   Root (con deep links), Onboarding, pestañas del Tutor, stack del dispositivo protegido
  screens/      onboarding/, protected/, responsible/
  services/     Sincronización de listas y del dispositivo, catálogo de eventos
  state/        AppModeContext (modo de la app y permisos, persistido)
  storage/      AsyncStorage
  utils/        Fechas y dominios
android-native/ Código Kotlin + manifest y strings completos para copiar a android/
```

## Qué es real y qué es simulado

| Parte | Estado |
|---|---|
| Registro y login del Tutor (Firebase Auth email/contraseña) + perfil `POST /api/responsible-profile` | **Real** (con Web API Key) |
| Código de vinculación `POST /api/link-codes` (6 caracteres alfanuméricos, 15 min) | **Real** |
| Canje desde el celular protegido (sesión anónima + `POST /api/link-codes/redeem`) | **Real** |
| Perfil protegido `POST /api/devices/:id/protected-profile` | **Real** |
| Lista LOTBA `GET /api/blocklists/lotba/current?hash=` | **Real**, con copia local para funcionar sin conexión |
| Filtro DNS, notificación de bloqueo, historial local, watchdog, anti-bypass, detección de instalaciones, guardián de Ajustes | **Implementado en Kotlin; pendiente de validar en dispositivo** |
| Envío de eventos `POST /api/devices/:id/events`, lista de dispositivos `GET /api/devices`, actividad `GET /api/devices/:id/events` | **Real** |
| Alertas | **Armadas en la app a partir de los eventos reales** hasta que Backend publique `GET /api/alerts` |
| Sitios personalizados, PIN, desvincular | **Simulado**: endpoints pendientes en Backend (`ENDPOINTS_READY` en `src/config/env.ts`) |
| Login social, recuperar contraseña, QR | No disponible (Backend solo habilitó email/contraseña; QR requiere librería de cámara) |

Sin `FIREBASE_WEB_API_KEY`, toda la app funciona en **modo demo** con datos simulados.

## Historial de versiones

- **v10 / 1.0.0-rc1 (Semanas 10-11):** integración con dispositivos, actividad y eventos reales; alertas derivadas de eventos; sesión cifrada con Android Keystore; logs nativos solo en debug; deep link validado; configuración de firma y build release.
- **v9 (Semana 9):** 9 bugs corregidos (bloqueo de PIN salteable, PIN offline, PIN demo, admin al quitar la protección, reintentos de sync/token/HTTP, backoff de eventos), DNS de la red real + caché, freno a DNS cifrado (DoH/DoT), alertas que se actualizan solas, documento de limitaciones.
- **v8 (Semanas 5-8):** integración con Backend real, eventos con la taxonomía acordada, notificación y pantalla de sitio bloqueado, historial de actividad, watchdog, anti-bypass (DNS privado, VPN externa, admin/accesibilidad desactivados, proceso terminado), "VPN siempre activa", ahorro de batería, detección de instalaciones, guardián de Ajustes por Accesibilidad, sitios personalizados, alta/cambio de PIN, pantallas del Tutor con datos (dashboard, alertas, bloqueos, detalle).
- **v4 (Semana 4):** activar/desactivar, persistencia, PIN para cambios críticos, primer módulo Kotlin.
- **v3 (Semana 3):** pantallas finales de UX y alineación con el modelo de datos de Backend.

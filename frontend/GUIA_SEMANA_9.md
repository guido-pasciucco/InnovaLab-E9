# Semana 9 — Optimización y estabilidad (Frontend/Mobile)

Plan (Sprint 5 – Iterar): *optimizar rendimiento, reconexiones y persistencia; ajustar alertas y acciones protegidas; corregir comportamientos ante reinicios, cierres, cambios de permisos o intentos de desactivación; reforzar el anti-bypass; documentar limitaciones.*

Como todavía no hay resultados de pruebas en dispositivo, esta semana se hizo una **revisión completa del código** buscando esos problemas. Se corrigió todo lo encontrado.

## Bugs encontrados y corregidos

| # | Problema | Dónde | Corrección |
|---|---|---|---|
| 1 | El bloqueo por 3 PIN incorrectos **se salteaba** cerrando y volviendo a abrir el diálogo | `PinGateModal` | Contador y bloqueo **guardados en el celular** (sobreviven a cerrar el diálogo o la app) y **escalonados**: 30 s → 2 min → 10 min → 30 min (`src/security/pinAttempts.ts`) |
| 2 | Sin conexión, el PIN contaba como **incorrecto** y bloqueaba | `PinGateModal` | Ahora avisa "Sin conexión: los cambios críticos solo se autorizan con internet" y no suma intento |
| 3 | En modo demo el PIN creado **se ignoraba** (siempre era 1234) | `mockBackend` | Se usa el PIN que creaste; 1234 solo si nunca se creó (ej. en el celular protegido) |
| 4 | "Quitar la protección" dejaba el **administrador activo**: la app quedaba imposible de desinstalar | Estado de protección + Kotlin | Nuevo `removeDeviceAdmin()` después del PIN |
| 5 | Si la sincronización fallaba, **no se reintentaba por 6 h** | `deviceSync` | Reintento a los 5 min; no se lanzan dos sincronizaciones a la vez; "Actualizar listas" ahora avisa si falló |
| 6 | Varias llamadas a la vez **renovaban el token varias veces** | `session.ts` | Una sola renovación compartida |
| 7 | Un 401 por token revocado **no se recuperaba** | `http.ts` | Renueva el token y reintenta una vez. Las lecturas (GET) se reintentan 2 veces ante cortes de red o errores 5xx |
| 8 | El reenvío de eventos **insistía sin pausa** estando offline (batería) | `EventUploader.kt` | Espera creciente 1→30 min; al volver la red se intenta enseguida |
| 9 | El temporizador del código de vinculación **se recreaba cada segundo** | `QrCodeDisplay` | Callback en `useRef` |

## Mejoras de rendimiento y reconexión (Kotlin)

- **DNS de la red real primero:** antes solo se usaban 8.8.8.8 y 1.1.1.1, que en redes de escuelas u oficinas suelen estar bloqueados. Ahora se usa primero el DNS del Wi-Fi o de los datos, y se actualiza en cada cambio de red.
- **Caché de DNS de 60 s:** las consultas repetidas se responden desde memoria. Se vacía al cambiar de red.
- **Al volver la conexión** se envían enseguida los eventos pendientes.
- **El registro de eventos se mantiene en memoria**, en lugar de leer el archivo completo en cada evento.
- **Notificaciones de "sitio bloqueado":** como máximo una cada 15 s. El evento se registra igual.

## Anti-bypass reforzado

- **Freno al DNS cifrado:** se bloquean los nombres de los servicios de DNS cifrado conocidos: Google, Cloudflare, Quad9, OpenDNS, AdGuard, NextDNS, CleanBrowsing, Mullvad y Control D (`AntiBypassList.kt`). También se bloquea el dominio "canario" de Firefox (`use-application-dns.net`), que le indica a Firefox que apague su DNS seguro automático.
  - Así, el **DNS seguro de Chrome y Firefox** vuelve a usar nuestro filtro.
  - El **DNS privado estricto** de Android se queda sin Internet hasta que lo desactiven.
  - Cada intento se registra como `intento_bypass` / `dns_privado`, como mucho cada 6 h por servicio, y no muestra la pantalla de "sitio bloqueado".

## Alertas y acciones protegidas

- **El Inicio del Tutor se actualiza solo cada 60 s** mientras está en pantalla, así aparecen las alertas nuevas. Todavía no hay notificaciones push.
- **Nuevo botón "Marcar todas como leídas"** en Alertas.

## Cómo actualizar el proyecto

1. Reemplazá `src/` (borrando la carpeta vieja antes) y `App.tsx`.
2. Reemplazá la carpeta `android\app\src\main\java\com\baprotege\protection\` por la nueva. Son **20 archivos**: se sumaron `AntiBypassList.kt` y `DnsCache.kt`.
3. **El manifest y `strings.xml` no cambian.**
4. Desinstalá la app del emulador y compilá: `npx react-native run-android`.

## Pruebas prolongadas (para QA)

| # | Prueba | Duración | Qué registrar |
|---|---|---|---|
| P1 | Dejar la protección activa con uso normal (navegar, redes sociales) | 24 h | ¿Se cayó alguna vez? Batería consumida por la app (Ajustes → Batería) |
| P2 | Pantalla apagada sin tocar el celular | 8 h | ¿Sigue activa al volver? ¿Hay "proceso terminado" en Actividad? |
| P3 | Cambiar Wi-Fi ↔ datos 10 veces | 15 min | ¿Siguen cargando los sitios permitidos? ¿Se bloquean los prohibidos? |
| P4 | Modo avión 1 h con bloqueos → quitar modo avión | 1 h | ¿Llegan los eventos a Backend? (cuando exista el endpoint) |
| P5 | Reiniciar 5 veces seguidas | 15 min | ¿Vuelve sola cada vez? |
| P6 | Chrome → Configuración → Privacidad → DNS seguro → Google | 5 min | ¿Se sigue bloqueando `example.org`? Evento `dns_privado` en Actividad |
| P7 | Firefox con "DNS sobre HTTPS" en modo predeterminado | 5 min | ¿Se sigue bloqueando? |
| P8 | Ajustes → DNS privado → `dns.google` (con la Accesibilidad sin activar) | 5 min | Debería quedarse sin Internet hasta quitarlo (comportamiento esperado) |
| P9 | 3 PIN incorrectos → Cancelar → reabrir | 2 min | Debe seguir bloqueado y la espera debe crecer en cada tanda |
| P10 | Quitar la protección con PIN → desinstalar la app | 2 min | Se tiene que poder desinstalar sin pasos extra |
| P11 | Samsung o Xiaomi real (si alguien tiene) | 24 h | ¿La cierra el sistema? ¿El guardián reconoce las pantallas de Ajustes de esa marca? |

## Próximos pasos (semana 10)

1. Compilar el build de Android y registrar los errores de Gradle, si aparecen. Es la base del build candidato de la semana 10.
2. Correr con QA las pruebas prolongadas de arriba y registrar los resultados (funcionó / no funcionó / qué pasó).

## Para mandar a Backend

- Siguen pendientes los endpoints de la guía de la semana 8. El más urgente es **`POST /api/devices/:id/events`**: sin él, las alertas al adulto no funcionan de punta a punta.
- **`intento_bypass` ahora puede traer `dominio`**, el servicio de DNS cifrado que se frenó. Si su validación rechaza campos extra, que lo permitan o avisen.
- **Límite de intentos de PIN del lado del servidor:** el de la app es solo una barrera de interfaz.

## Documento para todos los equipos

`LIMITACIONES_ANDROID.md`: limitaciones conocidas de la plataforma, con lo que hace la app hoy y las posibles mejoras.

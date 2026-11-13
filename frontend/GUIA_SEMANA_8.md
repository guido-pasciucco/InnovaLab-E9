# Semanas 5 a 8 — Guía de puesta al día (Frontend/Mobile)

Este paquete cubre lo que el plan pide a Frontend/Mobile en las semanas 5, 6, 7 y 8, y reemplaza la versión de la Semana 4.
Hacelo en este orden: **A** (JS, modo demo) → **B** (conectar al Backend real) → **C** (Kotlin) → **D** (pruebas) → **E** (subir a git).

> **Estado (actualizado en la semana 11):** el TypeScript está verificado con `tsc` y el código Kotlin compila y funciona en emulador con el build `1.0.0-rc1` (ver `VALIDACION_RC1_RESULTADOS.md`).

---

## Qué se hizo, semana por semana

| Semana | Pedido del plan (Frontend/Mobile) | Qué quedó hecho |
|---|---|---|
| **5** | Integrar la lógica de bloqueo y las notificaciones básicas; completar la integración nativa | Cada bloqueo genera el evento `acceso_bloqueado` (lista LOTBA o personalizada) y una **notificación "Sitio bloqueado"** que abre nuestra pantalla de bloqueo con el dominio (deep link `baprotege://blocked/<dominio>`). La lista LOTBA se baja del **endpoint real** de Backend con su hash y se guarda en el celular. |
| **6** | Historial de actividad; mejor persistencia; primer anti-bypass | Pantalla **Actividad** en el celular protegido (historial guardado localmente, funciona sin conexión). **Watchdog** cada 15 min que reactiva la protección si se cayó. Exclusión del **ahorro de batería**, **"VPN siempre activa"**, detección de **proceso terminado**. Anti-bypass: **DNS privado**, **otra VPN**, **administrador** y **accesibilidad desactivados**. |
| **7** | Integrar alertas, historial y estado del dispositivo protegido | **Registro, login, perfil, código de vinculación, canje y perfil protegido conectados al Backend real.** El celular protegido manda sus eventos al contrato que propuso Backend (con cola sin conexión). La app del Tutor muestra **dashboard con estado, alertas sin leer, actividad, bloqueos y detalle por dispositivo**. |
| **8** | Alta y baja de sitios personalizados; detección/restricción de instalaciones, modificaciones críticas e intentos de evasión | Pantalla **Sitios personalizados** (agregar sin PIN, quitar con PIN), que el celular protegido aplica junto con LOTBA. **Creación y cambio del PIN.** **Detección de instalaciones** de VPNs y apps de apuestas. **Guardián de Ajustes** (Accesibilidad): con la protección encendida, cierra las pantallas para desinstalar, forzar detención, quitar permisos o activar DNS privado, y lo registra. Cada intento de PIN (bueno o malo) en el celular protegido queda registrado. |

### Lo que depende de Backend (por eso parte se ve con datos simulados)

Backend ya tiene: registro del perfil, códigos de vinculación, canje, perfil protegido y lista LOTBA. **Todo eso ya está conectado de verdad.**
Lo que **todavía no existe** en la rama `backend` (lo tienen como propuesta o sin empezar) está simulado y se enciende con un flag en `src/config/env.ts`:

| Flag en `ENDPOINTS_READY` | Endpoint que falta | Para qué |
|---|---|---|
| `listDevices` | `GET /api/devices` | Lista de dispositivos del Tutor, y detectar que el otro celular ya canjeó el código |
| `deviceEvents` | `GET /api/devices/:id/events` | Actividad de cada dispositivo en la app del Tutor |
| `ingestEvents` | `POST /api/devices/:id/events` | Recibir los eventos del celular protegido (su propuesta #9) |
| `alerts` | `GET /api/alerts`, `POST /api/alerts/:id/read` | Alertas del Tutor |
| `customList` | `GET/POST/DELETE /api/custom-list`, `GET /api/devices/:id/custom-list` | Sitios personalizados |
| `pin` | `PUT /api/responsible-profile/pin`, `POST .../pin/verify`, `POST /api/devices/:id/verify-pin` | PIN real (hoy el PIN de prueba es **1234**) |
| `unlink` | `DELETE /api/devices/:id` | Desvincular |

El contrato exacto que espera la app está en `src/api/backend.ts` (sección 2) y abajo, en "Pedidos a Backend".

---

## A. Código JS (modo demo, sin backend)

1. Copiar `src/` y `App.tsx` sobre los del proyecto React Native (**borrar antes la carpeta `src/`**, porque se eliminaron archivos viejos, como `PinVerification.mock.ts`).
2. Si no la tenías de la Semana 4: `npm install @react-native-async-storage/async-storage`
3. `npx react-native run-android`
4. Probá el modo demo (cualquier mail y contraseña; **PIN 1234**):
   - Welcome → Continuar como Tutor → "¿Sos nuevo? Crear cuenta" → completar → crear PIN (no acepta 1234 ni 1111) → aparece un código de 6 caracteres → **a los 8 segundos simula que el otro celular lo canjeó** → perfil protegido → pestañas del Tutor.
   - Inicio: estado, 2 alertas sin leer, actividad. Bloqueos: lista + "Mis sitios" (agregar y quitar con PIN).
   - Ajustes → Cerrar sesión → "Vincular Dispositivo protegido" → cualquier código de 6 caracteres + nombre → permisos → estado. Con la protección activa, **cada 45 s el mock simula un bloqueo**, que aparece en "Ver actividad".

## B. Conectar al Backend real

1. Pedile a Backend:
   - que levanten el server (`npm start --prefix backend`) en una PC de la misma red, o correlo vos con su `serviceAccountKey.json` (**ese archivo nunca va en la app ni en git**);
   - la **Web API Key** del proyecto Firebase *sandbox* (Firebase Console → Configuración del proyecto → General). No es secreta como la cuenta de servicio, pero preguntales si la quieren commitear o no.
2. Editá `src/config/env.ts`:
   - `FIREBASE_WEB_API_KEY: 'la-key'`
   - `API_BASE_URL`: `http://10.0.2.2:3000` si el backend corre en tu PC y usás el emulador. Si corre en otra PC, usá su IP (`http://192.168.x.x:3000`).
3. Recargá la app. Ya no dice "modo demo".
4. Prueba punta a punta (necesitás **dos dispositivos**: el emulador + tu celular, o dos emuladores):
   - Celular A (Tutor): crear cuenta → se crea en Firebase y en `responsables/{uid}`. Aparece un código real.
   - Celular B (protegido): "Vincular Dispositivo protegido" → ingresar el código → "¡Listo!" y muestra el **ID del dispositivo**.
   - Celular A: como `GET /api/devices` todavía no existe, aparece el campo "(Integración) pegá el ID". Pegá el ID de B → cargá el perfil → se guarda en `dispositivos/{id}/perfilProtegido/datos`.
   - Errores del canje: código vencido, ya usado o inexistente muestran mensajes claros (los códigos de error son los reales de Backend).

## C. Código Kotlin

1. **Borrá** la carpeta `android\app\src\main\java\com\baprotege\protection\` de la Semana 4 y copiá la nueva de `android-native/app/src/main/java/com/baprotege/protection/` (**18 archivos**).
2. Copiá `android-native/app/src/main/res/xml/` → `android\app\src\main\res\xml\` (`device_admin.xml` y `accessibility_service_config.xml`).
3. Reemplazá `android\app\src\main\AndroidManifest.xml` por `android-native/app/src/main/AndroidManifest.COMPLETO.xml` (renombralo). Antes, compará la `<activity>` con la tuya: si la tuya tiene algún atributo distinto, conservalo.
4. Reemplazá `android\app\src\main\res\values\strings.xml` por `strings.COMPLETO.xml` (renombralo). Agrega la descripción que exige Accesibilidad y cambia el nombre visible a "BA Protege+".
5. `MainApplication.kt` sigue igual que en la Semana 4 (línea `add(com.baprotege.protection.ProtectionPackage())`).
6. Desinstalá la app vieja del emulador (cambiaron permisos y servicios) y compilá: `npx react-native run-android`.

## D. Pruebas (sirven también para QA)

Logs: `adb logcat -s BlockerVpnService EventLog EventUploader AccessibilityGuard InstallMonitor ProtectionWatchdog BootReceiver`

| # | Semana | Qué probar | Cómo | Esperado |
|---|---|---|---|---|
| 1 | 5 | Bloqueo + notificación | Protección activa, DNS privado apagado, Chrome sin "DNS seguro". Abrir `example.org` (en modo demo) o un dominio de la lista LOTBA real (con backend) | Chrome no carga, llega la notificación "Sitio bloqueado", al tocarla se abre nuestra pantalla roja con el dominio |
| 2 | 5 | Sin falsos positivos | Abrir `wikipedia.org`, `google.com` | Cargan normal |
| 3 | 5 | Lista personalizada + subdominios | En el celular protegido tocar "Actualizar listas de sitios" y abrir `www.casino-ejemplo.com` (está en la lista personalizada de ejemplo) | Bloqueado; en Actividad dice "(sitio personalizado)" |
| 4 | 5 | Sin repetir | Recargar el sitio bloqueado 5 veces en 1 minuto | Un solo evento y una sola notificación |
| 5 | 6 | Historial sin conexión | Modo avión → abrir "Ver actividad" | Se ve todo lo registrado |
| 6 | 6 | Cierre forzado | Cerrar la app deslizándola | La notificación "Protección activa" sigue; el bloqueo sigue funcionando |
| 7 | 6 | Reinicio | `adb reboot` | Vuelve sola la protección (logcat BootReceiver sin errores) |
| 8 | 6 | DNS privado | Con la protección activa y **la Accesibilidad todavía sin activar** (si no, el guardián cierra esa pantalla, que también es correcto): Ajustes → Red → DNS privado → nombre de host `dns.google` | Estado en "advertencia", evento `dns_privado`, notificación |
| 9 | 6 | Otra VPN | Instalar y activar otra VPN (ej. 1.1.1.1) | Evento `vpn_externa` + "La protección se detuvo" |
| 10 | 6 | Quitar VPN | Con la protección activa y la Accesibilidad sin activar: Ajustes → VPN → BA Protege+ → desconectar | Evento `cambio_permiso` (vpn), estado "caída" |
| 11 | 7 | Eventos a Backend | Con `ingestEvents: true` y el endpoint hecho por Backend | Los eventos aparecen en `dispositivos/{id}/eventos`; en el celular "Actividad sin enviar" baja a 0 |
| 12 | 7 | Cola offline | Modo avión, provocar bloqueos, quitar modo avión | Se envían al volver la conexión (como mucho 15 min, por el watchdog) |
| 13 | 8 | Guardián: desinstalar | Protección activa → Ajustes → Apps → BA Protege+ | La pantalla se cierra, notificación "Acción protegida", evento |
| 14 | 8 | Guardián: permitir permisos | En la app, tocar "Activar" en Administrador | El diálogo **sí** se abre (ventana de 90 s) |
| 15 | 8 | Instalación riesgosa | Instalar una app de VPN | Evento `intento_instalacion` con el paquete + notificación |
| 16 | 8 | PIN | Desactivar con PIN incorrecto 3 veces | Bloqueo de 30 s y 3 eventos `intento_modificacion_config` "fallido" |
| 17 | 8 | Sitios personalizados | Agregar `casino-test.com`; quitarlo | Quitar pide PIN |

## E. Subir a git (rama `frontend`)

Desde la carpeta del repo clonado:

```
git checkout frontend
git pull
```
Copiá a la carpeta `frontend/` del repo: `App.tsx`, `src/`, `README.md`, `GUIA_SEMANA_8.md` y `android-native/` (y también tu `android/` modificado, si lo están versionando). **No copies `node_modules/`.** Antes, borrá `frontend/src/` para que no queden archivos viejos.

```
git add frontend
git commit -m "Frontend semanas 5-8: integracion con Backend, eventos, anti-bypass, sitios personalizados"
git push origin frontend
```

---

## Pedidos a Backend (para mandar al equipo)

1. **Ingesta de eventos** (su propuesta #9): `POST /api/devices/:deviceId/events`, token anónimo, **un evento por request**, idempotente por `eventoId` (si ya existe, responder 200 o 409). La app reintenta con 401 (renueva token), 404/5xx o sin red; descarta con 400/422. Campos que manda: `eventoId, tipoEvento, resultado, timestampDispositivo, secuencia, versionApp` + `versionLista` (en `acceso_bloqueado` y `sync_lista`) + específicos: `dominio, origenLista, permiso, configuracion, tipoBypass, paquete`. Pedido: que al recibir eventos actualicen `dispositivos.ultimoReporte` y `estado`.
2. **Catálogos (punto 4 de su README):** Mobile confirma `permiso` = vpn / accesibilidad / device_admin; `configuracion` = desactivar_proteccion / desvincular_dispositivo / cambiar_pin / editar_lista_personalizada; `tipoBypass` = los 5 propuestos. Respuestas a sus preguntas: **sí** podemos distinguir cada caso (otra VPN vs. permiso quitado se distingue mirando si aparece otra VPN 3 s después); Device Admin **se mantiene** (la barrera para desinstalar sigue funcionando); `proceso_terminado` **sí** se reporta como evento propio (lo detectamos cuando el servicio vuelve sin haber sido detenido).
3. **Campo nuevo `paquete`** en `intento_instalacion` (nombre del paquete instalado) — necesita OK de Data Analytics.
4. **Lectura para el Tutor:** `GET /api/devices` → `{ dispositivos: [{ id, nombre, estado, plataforma, versionApp, ultimoReporte, fechaVinculacion, perfil }] }`; `GET /api/devices/:id/events?limit=50` → `{ eventos: [...] }`. Con `GET /api/devices`, además, el Tutor detecta el canje sin el listener de Firestore (la app usa polling cada 4 s porque no usa el SDK de Firestore).
5. **Alertas:** `GET /api/alerts` → `{ alertas: [{ alertaId, eventoOrigenId, dispositivoId, tipoEvento, mensaje, fecha, leida }] }` con `leida` **por responsable**, y `POST /api/alerts/:id/read`. Sugerencia de reglas: alerta para `proteccion_desactivada`, `cambio_permiso`, `intento_bypass`, `intento_instalacion` y `intento_modificacion_config` fallido; **no** para cada `acceso_bloqueado`.
6. **Lista personalizada:** `GET/POST /api/custom-list` (`{ dominio }`) y `DELETE /api/custom-list/:dominio` para el Tutor; `GET /api/devices/:id/custom-list` (token anónimo) con la unión de las listas de sus responsables. La app normaliza igual que su importador.
7. **PIN:** `PUT /api/responsible-profile/pin { pin }` (guardar hash), `POST /api/responsible-profile/pin/verify` y `POST /api/devices/:id/verify-pin` → `{ valido }`, **con límite de intentos del lado del servidor**. Aceptamos su propuesta: sin conexión no se autorizan cambios críticos (ya está así en la app).
8. **Desvincular:** `DELETE /api/devices/:id`.

## Avisos para UX/UI

- **Corrección:** el código de vinculación son **6 letras o números** (ej. `G2T D8K`), no solo números como figuraba en el documento de la Semana 3. Así lo genera Backend.
- El menor ve el **error del navegador** al bloquearse un sitio; nuestra pantalla aparece al tocar la **notificación**. Conviene que diseñen esa notificación.
- "Solicitar acceso a un adulto" hoy muestra un consejo, porque no hay un tipo de evento aprobado para pedirlo. Si lo quieren, hay que pedírselo a Data Analytics + Backend.
- Nuevas pantallas que necesitan diseño: **Crear/cambiar PIN**, **Sitios personalizados**, **Actividad** del celular protegido y los **chequeos anti-evasión** en el estado.

## Limitaciones conocidas

1. **Kotlin validado en emulador; falta validar en celulares reales** (ver arriba).
2. **DNS privado estricto / DNS seguro del navegador** saltean el filtro. Ahora se detecta y avisa, y el guardián impide activarlo desde Ajustes, pero no impide que un navegador use su propio DNS seguro.
3. El **guardián de Ajustes** depende del texto de pantalla: probar en el celular real (Samsung/Xiaomi pueden necesitar más palabras clave). Google Play restringe Accesibilidad y `QUERY_ALL_PACKAGES`: para publicar hay que justificarlos.
4. **No se pueden impedir instalaciones** sin Device Owner (validado solo como prueba); se detectan y se avisa.
5. En Android 12+ el watchdog a veces **no puede reiniciar** la protección desde segundo plano: en ese caso muestra una notificación para que la abran. "VPN siempre activa" es lo más robusto: está como recomendación en la pantalla de estado. **No** hay que activar "Bloquear conexiones sin VPN": cortaría Internet, porque nuestra VPN solo filtra DNS.
6. La **sesión anónima** del celular protegido y su refresh token se guardan en el almacenamiento privado de la app (sin cifrar). Para producción: EncryptedSharedPreferences / Keystore.
7. Login social, recuperar contraseña y escaneo de QR no están (Backend solo habilitó email/contraseña; el QR contiene el mismo código que se tipea).

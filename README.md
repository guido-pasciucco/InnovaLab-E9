# BA Protege+

BA Protege+ es un proyecto de simulación full-stack de INNOVA LAB para diseñar una aplicación de control parental enfocada en prevenir el acceso de menores a sitios de apuestas online no autorizados por LOTBA.

El repositorio integra en `main` el código de Backend y Mobile/Frontend. La app contempla dos modos de uso: responsable y dispositivo protegido. Mobile realiza la detección y aplicación local de la protección; Backend autentica y autoriza solicitudes, administra vínculos y perfiles, recibe eventos y distribuye la lista oficial.

> **Estado del proyecto:** los flujos principales de cuenta y vinculación, la sincronización de LOTBA y las API para dispositivos y eventos están implementados. Sin embargo, la app todavía usa mocks para dispositivos, actividad y eventos porque los flags correspondientes siguen desactivados. La integración Android nativa aún requiere compilación y pruebas en dispositivos. Alertas y otros servicios aún no están implementados en Backend.

## Objetivos y alcance

- Registrar responsables y vincular dispositivos protegidos.
- Configurar perfiles y protección con una experiencia clara para las familias.
- Distribuir versiones de la lista oficial de LOTBA.
- Aplicar el bloqueo localmente en el dispositivo y mantener la última lista sincronizada para uso sin conexión.
- Recibir eventos de los dispositivos y permitir consultar su estado y actividad.
- Definir e implementar alertas en una etapa posterior, junto con Mobile, Data Analytics y QA.

### Regla de bloqueo LOTBA

Las versiones de la lista oficial son inmutables. La regla acordada para el prototipo es bloquear el dominio listado y todos sus subdominios. Mobile puede aplicar la lista localmente; no se consulta al Backend en cada navegación. La carga, sincronización y comparación efectiva deben validarse en Android.

### Fuera del alcance implementado

- Alertas, consulta y marcado de lectura, y notificaciones push.
- CRUD de listas personalizadas en Backend.
- Gestión y verificación de PIN en Backend.
- Desvinculación mediante API.
- Restricción efectiva de instalación de aplicaciones.
- Despliegue de producción, observabilidad y endurecimiento operativo.

## Tecnologías y arquitectura

### Backend

- Node.js y CommonJS.
- Express 5 para la API HTTP.
- Firebase Admin SDK para verificar Firebase ID tokens y acceder a Firestore.
- Firebase Authentication para identidades de responsables (email/contraseña) y dispositivos (autenticación anónima).
- Cloud Firestore como almacenamiento documental.

La implementación está en `backend/src/`, organizada en rutas, servicios, middleware, configuración y manejo de errores.

### Mobile / Frontend

- React Native y TypeScript para las pantallas, navegación, estado y llamadas HTTP.
- Kotlin para el módulo Android nativo que contiene código de protección, VPN local (`VpnService`), registro de eventos y servicios del sistema.

El repositorio contiene el código fuente de la app y archivos nativos de referencia en `frontend/android-native/`, pero no incluye un proyecto Android anfitrión ni un `package.json` de React Native dentro de `frontend/`. Por lo tanto, el contenido móvil versionado no constituye por sí solo un paquete listo para compilar. La guía de Frontend indica que el código Kotlin todavía requiere integración, compilación y pruebas en un entorno Android.

## Estado de los flujos

| Flujo | Endpoint | Estado |
|---|---|---|
| Crear perfil de responsable | `POST /api/responsible-profile` | Implementado; probado en sandbox |
| Generar código de vinculación | `POST /api/link-codes` | Implementado; probado en sandbox |
| Canjear código y registrar dispositivo | `POST /api/link-codes/redeem` | Implementado; probado en sandbox |
| Crear perfil protegido | `POST /api/devices/{deviceId}/protected-profile` | Implementado; pruebas reportadas en sandbox |
| Listar dispositivos del responsable | `GET /api/devices` | Implementado; falta integración/prueba E2E desde Mobile |
| Consultar actividad del dispositivo | `GET /api/devices/{deviceId}/events?limit=50` | Implementado; falta prueba integrada contra Firestore |
| Ingerir evento del dispositivo | `POST /api/devices/{deviceId}/events` | Implementado; falta prueba E2E con Mobile y validación de la taxonomía |
| Consultar versión LOTBA vigente | `GET /api/blocklists/lotba/current` | Implementado; verificar el puntero de versión en el sandbox |
| Estado de la API | `GET /health` | Implementado; no comprueba conectividad con Firebase |
| Alertas, listas personalizadas, PIN y desvinculación | — | No implementados en Backend |

Las rutas protegidas requieren un Firebase ID token en el encabezado `Authorization`. Backend comprueba el proveedor y la identidad autenticada; no confía en un UID enviado en el cuerpo de la solicitud. El canje de un código crea y vincula el dispositivo, pero el perfil protegido se crea en una solicitud posterior.

La ingesta de eventos acepta un evento por solicitud, valida sus campos y usa `eventoId` como identificador de documento para permitir reintentos idempotentes. Backend registra `timestampServidor` y actualiza `ultimoReporte`; el estado es un reporte del cliente y no una comprobación independiente de la protección real.

### Estado de integración Mobile

En `frontend/src/config/env.ts`, `FIREBASE_WEB_API_KEY` está vacía y los flags `listDevices`, `deviceEvents` e `ingestEvents` están en `false`. Por eso la app usa datos simulados para esos flujos, aunque sus endpoints ya existen en Backend. Los flags para alertas, listas personalizadas, PIN y desvinculación también están desactivados y esas API todavía no existen en Backend.

Los flujos de registro, login, vinculación, perfil protegido y descarga LOTBA tienen llamadas al Backend en el cliente, pero requieren configurar la URL y la Web API Key del proyecto Firebase de pruebas para usarlos. La clave de Firebase Admin no debe incluirse en Mobile.

## Lista oficial LOTBA

El importador `backend/scripts/import-lotba-list.js`:

1. Acepta un CSV con una columna `LINK`.
2. Normaliza URLs y dominios, quita `www.` y rutas, y deduplica las entradas.
3. Conserva la última fila de origen si un dominio aparece más de una vez.
4. Muestra una vista previa por defecto y solo escribe con `--apply`.
5. Crea una versión en `listaVersion/{versionId}/dominios/{dominioId}` y actualiza `configuracion/listas.lotbaVersionId` después de completar la carga.

El endpoint `GET /api/blocklists/lotba/current` devuelve la versión, fecha, hash, cantidad de dominios y regla de coincidencia. Si el cliente envía `?hash=<sha256>` y coincide con la versión vigente, la respuesta indica que no hace falta volver a descargar los dominios. Cada CSV se interpreta como una lista completa, no como un conjunto incremental de cambios.

## Inicio del Backend

Requisitos: Node.js y acceso a un proyecto Firebase de sandbox para las rutas que usan Firebase.

Desde la raíz del repositorio:

```powershell
npm install --prefix backend
npm start --prefix backend
```

En otra terminal, comprobar que Express responde:

```powershell
npm run health --prefix backend
```

Por defecto, la API escucha en `http://localhost:3000`. Se puede configurar el puerto con `PORT`. `/health` solo comprueba que la API está activa; no valida Firebase.

### Credenciales y seguridad

Para Firebase Admin, coloca la cuenta de servicio en `backend/serviceAccountKey.json`. El archivo está excluido de Git: no lo subas, compartas ni incluyas en capturas o logs. Usa únicamente cuentas y datos de prueba; las escrituras contra el sandbox modifican datos reales de ese proyecto.

El script `backend/scripts/auth-smoke-test.js` carga variables de prueba desde `backend/.env`, que también está excluido de Git. No uses cuentas ni datos personales reales. La Web API Key se usa en los clientes de Firebase Auth; no reemplaza la credencial privilegiada de Firebase Admin.

## Importar y consultar LOTBA

Validar el CSV sin escribir en Firestore:

```powershell
npm run import:lotba --prefix backend
```

Importar y publicar una versión en el sandbox:

```powershell
npm run import:lotba --prefix backend -- --apply --project-id TU_PROJECT_ID
```

El `TU_PROJECT_ID` debe coincidir con `project_id` de la cuenta de servicio local. Para especificar otro CSV, agrega `--file "ruta\al\archivo.csv"`. Revisa y corrige las filas inválidas antes de publicar.

Con el servidor iniciado y una versión vigente configurada:

```powershell
Invoke-RestMethod http://localhost:3000/api/blocklists/lotba/current
Invoke-RestMethod "http://localhost:3000/api/blocklists/lotba/current?hash=HASH_SHA256_LOCAL"
```

## Pruebas y estado de validación

- `npm run health --prefix backend`: smoke check HTTP de `/health`.
- `npm run import:lotba --prefix backend`: validación y vista previa sin escrituras.
- `backend/scripts/auth-smoke-test.js`: pruebas manuales de Firebase Auth, perfiles y vinculación.
- `backend/package.json` todavía tiene un comando `test` de placeholder; no hay una suite automatizada completa.
- Los flujos de perfil y vinculación se han probado contra Firebase sandbox. Las rutas de dispositivos y eventos requieren prueba integrada contra Firestore y Mobile; no se deben considerar validadas por una prueba de mock local.
- La compilación y las pruebas de la protección nativa Android siguen pendientes.

## Próximos pasos

1. Configurar Backend y Mobile contra el mismo proyecto Firebase sandbox y completar una prueba E2E con una cuenta responsable y un dispositivo de prueba.
2. Confirmar el contrato de eventos con Data Analytics y QA; probar ingesta, reintentos, duplicados, autorización y lectura de actividad.
3. Habilitar en Mobile los flags de dispositivos y eventos cuando el equipo confirme la integración.
4. Integrar el código nativo en un proyecto Android anfitrión, compilarlo y validar permisos, sincronización y bloqueo en dispositivos/emuladores compatibles.
5. Acordar reglas, destinatarios, lectura y posible push de alertas.
6. Definir e implementar los contratos restantes: listas personalizadas, PIN y desvinculación.
7. Añadir pruebas automatizadas y preparar la demo integrada.

## Estructura del repositorio

```text
.
├── backend/
│   ├── scripts/         # Smoke tests, health check e importador LOTBA
│   ├── src/
│   │   ├── config/      # Firebase y listas
│   │   ├── middleware/  # Autenticación y errores HTTP
│   │   ├── routes/      # Endpoints Express
│   │   └── services/    # Lógica de negocio y acceso a Firestore
│   └── README.md        # Reporte y contratos detallados de Backend
├── frontend/
│   ├── src/             # Aplicación React Native y TypeScript
│   ├── android-native/  # Código Kotlin y recursos nativos de referencia
│   ├── App.tsx
│   ├── README.md
│   └── GUIA_SEMANA_8.md
├── .gitignore
└── README.md
```

## Responsabilidades por rol

- **Backend:** autenticación de solicitudes, autorización, validación, persistencia, contratos de API e importación/publicación de LOTBA.
- **Mobile/Frontend:** experiencia de usuario, Firebase Auth cliente, sesión del dispositivo, sincronización local y aplicación de la protección disponible en cada plataforma.
- **Data Analytics:** validar taxonomía y campos de eventos para mantener métricas consistentes.
- **QA:** acordar criterios y verificar flujos, autorización, reintentos, errores e integración.
- **UX/UI:** definir pantallas, contenidos y estados visibles para responsables y usuarios protegidos.

## Documentación

- [Reporte técnico y contratos de Backend](backend/README.md)
- [README de Frontend/Mobile](frontend/README.md)
- [Guía de puesta al día de Frontend](frontend/GUIA_SEMANA_8.md)
- [Reglas de exclusión y archivos locales](.gitignore)

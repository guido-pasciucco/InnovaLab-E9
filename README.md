# BA Protege+

Proyecto de simulación full-stack de **INNOVA LAB** para diseñar e implementar una aplicación de control parental enfocada en prevenir el acceso de menores a sitios de apuestas online no autorizados por LOTBA.

El producto propone una única aplicación móvil con dos modos —responsable y dispositivo protegido— y un backend que administra identidades, vinculación, perfiles, listas y, en etapas posteriores, actividad y alertas. La aplicación protegida debe aplicar el bloqueo localmente; el backend distribuye la lista oficial y gestiona los datos y flujos compartidos.

> **Estado de las ramas:** Backend y Frontend se desarrollan en ramas separadas (`backend` y `frontend`) y todavía no se integraron mediante merge en `main`. Por eso, al trabajar desde `backend`, la carpeta `frontend/` no aparece en el árbol de archivos de ese checkout. La rama `frontend` contiene el esqueleto de React Native y sus pantallas; la integración real de ambos componentes sigue pendiente.

## Objetivos del producto

- Permitir que un adulto responsable registre una cuenta y vincule uno o más dispositivos protegidos.
- Facilitar una configuración parental guiada y clara para las familias.
- Sincronizar la lista oficial de dominios de LOTBA sin permitir que el responsable la modifique.
- Permitir, en el alcance previsto, listas personalizadas adicionales.
- Hacer que el dispositivo protegido evalúe los dominios localmente y pueda seguir aplicando la última lista sincronizada sin conexión.
- Consultar el estado y la actividad de los dispositivos, y recibir alertas ante eventos relevantes.
- Respetar los límites y permisos de cada plataforma móvil; las capacidades de protección y control de instalación deben validarse por plataforma.

## Alcance funcional

### Modos de uso

- **Modo Responsable:** registro e inicio de sesión, vinculación de dispositivos, configuración de protección, consulta de estado y futura consulta de actividad y alertas.
- **Modo Dispositivo Protegido:** sesión anónima del dispositivo, canje del código, sincronización de listas y ejecución local de la protección.

### Regla actual para la lista oficial

La lista LOTBA se importa como versiones inmutables. La regla acordada para el prototipo es bloquear el dominio listado y todos sus subdominios. La app compara el host exacto o el sufijo `.` + dominio, evitando falsos positivos como `noejemplo.com` al consultar `ejemplo.com`.

La app debe sincronizar la lista cuando corresponda y conservar una copia local; **no debería consultar al backend en cada navegación**. La detección y el bloqueo en tiempo real corresponden a Mobile.

### Fuera del alcance implementado actualmente

- Lista personalizada operativa desde la aplicación.
- Ingesta, consulta y visualización de eventos/actividad.
- Generación, consulta, lectura y envío push de alertas.
- Restricción efectiva de instalación de aplicaciones.
- Despliegue de producción, observabilidad y endurecimiento operativo.

Estos puntos forman parte del alcance proyectado o están en definición; no deben interpretarse como funciones ya disponibles.

## Tecnologías y arquitectura

### Backend disponible en este repositorio

- **Node.js** con módulos CommonJS.
- **Express 5** para la API HTTP.
- **Firebase Admin SDK** para verificar Firebase ID tokens y acceder a Firestore.
- **Cloud Firestore** como almacenamiento documental.
- **Firebase Authentication** como proveedor de identidad: email/contraseña para responsables y autenticación anónima para el dispositivo protegido.

La arquitectura separa rutas, servicios de negocio, middleware, configuración y manejo de errores bajo `backend/src/`.

### Aplicación móvil (`frontend/`, rama `frontend`)

El esqueleto móvil está desarrollado con **React Native y TypeScript**, e incluye navegación y pantallas para onboarding, modo responsable y modo dispositivo protegido. La integración nativa de Android se plantea mediante **Kotlin** para las capacidades de protección, incluyendo una VPN local (`VpnService`) y permisos/servicios del sistema, como Accesibilidad. Estas capacidades —y su equivalencia en iOS— requieren validación técnica por plataforma. Varias integraciones de autenticación, protección y datos todavía son mocks o están pendientes de conectar al backend.

## Flujos implementados en el backend

| Flujo | Ruta | Identidad requerida | Estado |
|---|---|---|---|
| Crear perfil del responsable | `POST /api/responsible-profile` | Responsable autenticado con email/contraseña | Implementado; probado en sandbox |
| Generar código de vinculación | `POST /api/link-codes` | Responsable autenticado con perfil existente | Implementado; probado en sandbox |
| Canjear código y registrar dispositivo | `POST /api/link-codes/redeem` | Sesión anónima del dispositivo protegido | Implementado; probado en sandbox |
| Crear perfil protegido | `POST /api/devices/{deviceId}/protected-profile` | Responsable autenticado y vinculado al dispositivo | Implementado; pruebas reportadas exitosas |
| Consultar lista oficial vigente | `GET /api/blocklists/lotba/current` | Pública, solo lectura | Implementado; verificar la versión activa del sandbox |
| Comprobar estado de la API | `GET /health` | No requiere autenticación | Implementado |

Las solicitudes a endpoints protegidos incluyen el Firebase ID token en el encabezado HTTP de autorización. Backend verifica la identidad y el proveedor de autenticación; no debe confiar en un UID enviado por el cliente para identificar al responsable o al dispositivo.

El canje crea el documento técnico del dispositivo y lo asocia al responsable. **No crea automáticamente el perfil personal protegido**: ese paso se realiza después con la sesión autenticada del responsable.

## Sincronización de la lista LOTBA

El importador `backend/scripts/import-lotba-list.js`:

1. Acepta un CSV de una columna `LINK`.
2. Normaliza URLs y dominios a hosts en minúsculas, quita `www.` y rutas, y deduplica.
3. Conserva la última fila de origen como referencia cuando hay dominios repetidos.
4. Por defecto muestra una vista previa; solo escribe si se indica `--apply`.
5. Crea una versión en `listaVersion/{versionId}/dominios/{dominioId}` y actualiza `configuracion/listas.lotbaVersionId` al final, una vez completa y verificada.

El endpoint `GET /api/blocklists/lotba/current` devuelve la versión, fecha, hash, cantidad de dominios y regla de coincidencia. Si el cliente envía su hash local —`?hash=<sha256>`— y coincide con la versión vigente, la respuesta indica `actualizada: false` sin volver a enviar los dominios. Si difiere o no se envía, incluye `dominios`.

El importador asume que cada CSV es una lista completa acumulada. Una nueva importación publica una nueva fotografía; no implementa una carga incremental por diferencias.

## Inicio rápido del backend

Requisitos: Node.js instalado y acceso a un proyecto Firebase de **sandbox** para las operaciones que usan Firebase.

Desde la raíz del repositorio:

```powershell
npm install --prefix backend
npm start --prefix backend
```

En otra terminal, comprobar el servidor local:

```powershell
npm run health --prefix backend
```

Por defecto el servidor escucha en `http://localhost:3000`; se puede configurar el puerto con `PORT`. El chequeo de salud solo confirma que Express responde, no comprueba Firebase.

### Credenciales locales

Para inicializar Firebase Admin, coloca el archivo de cuenta de servicio como `backend/serviceAccountKey.json`. El archivo está excluido de Git: no lo subas, no lo compartas y no lo incluyas en capturas o logs.

El cliente de pruebas `backend/scripts/auth-smoke-test.js` carga variables desde `backend/.env`, incluyendo la Web API Key de Firebase y credenciales de cuentas de prueba. Ese archivo también está excluido de Git. Configura los nombres de variables requeridos en el script; no uses cuentas ni datos personales reales.

Nunca envíes contraseñas al backend: Firebase Authentication las gestiona. La Web API Key usada por el cliente de prueba no reemplaza ni debe confundirse con las credenciales privilegiadas de Firebase Admin.

## Importar una lista LOTBA

La vista previa no escribe en Firestore:

```powershell
npm run import:lotba --prefix backend
```

Para importar y publicar una versión en el sandbox:

```powershell
npm run import:lotba --prefix backend -- --apply --project-id TU_PROJECT_ID
```

`TU_PROJECT_ID` debe coincidir con `project_id` del archivo de cuenta de servicio local. Se puede indicar otro CSV con `--file "ruta\al\archivo.csv"`. Corregí las filas inválidas que informe la vista previa antes de publicar.

Para probar la lectura una vez que exista el puntero a una versión activa:

```powershell
Invoke-RestMethod http://localhost:3000/api/blocklists/lotba/current
Invoke-RestMethod "http://localhost:3000/api/blocklists/lotba/current?hash=HASH_SHA256_LOCAL"
```

Las operaciones de importación escriben datos: ejecutarlas solo de forma intencional contra el proyecto sandbox correcto.

## Pruebas y validación

- `npm run health --prefix backend`: smoke check HTTP de `/health`.
- `npm run import:lotba --prefix backend`: validar y previsualizar el CSV sin escrituras.
- `backend/scripts/auth-smoke-test.js`: cliente manual de pruebas de Firebase Auth, perfiles y vinculación.
- El script `test` de `backend/package.json` sigue siendo un placeholder; no existe todavía una suite automatizada completa.

La implementación se ha probado localmente contra Firebase sandbox para autenticación, perfil del responsable, creación y canje de códigos, registro del dispositivo y perfil protegido. El endpoint de lista y el publicador de versión se añadieron después; verificar la versión activa consultando la API en el entorno sandbox antes de integrar Mobile.

## Próximos pasos del proyecto

1. Integrar los flujos de registro, vinculación y perfil protegido desde Mobile.
2. Confirmar con Mobile el almacenamiento local, frecuencia de sincronización y coincidencia por dominio/subdominios; probar el bloqueo real en el dispositivo.
3. Acordar con Mobile, Data Analytics y QA el catálogo de eventos, sus campos, reintentos y comportamiento offline.
4. Implementar la ingesta autenticada e idempotente de eventos tras aprobar el contrato.
5. Definir qué eventos generan alertas, destinatarios, estado de lectura por responsable y si el envío push forma parte del MVP.
6. Evaluar y priorizar la lista personalizada y las capacidades de restricción de aplicaciones según plataforma.
7. Completar pruebas automatizadas, estabilización y preparación de una demo funcional.

## Estructura actual

El repositorio se organiza en dos componentes que actualmente viven en ramas distintas:

```text
.
├── backend/
│   ├── scripts/         # Pruebas manuales, health check e importador LOTBA
│   ├── src/
│   │   ├── config/      # Configuración de Firebase y listas
│   │   ├── middleware/  # Autenticación y errores HTTP
│   │   ├── routes/      # Endpoints Express
│   │   └── services/    # Lógica de negocio y acceso a Firestore
│   ├── package.json
│   └── README.md        # Contratos y reporte detallado de Backend
├── frontend/            # Esqueleto React Native + TypeScript (rama frontend)
│   ├── App.tsx
│   └── src/
│       ├── components/
│       ├── native/
│       ├── navigation/
│       ├── screens/
│       └── storage/
└── docs/                # Documentación y material local, excluido por .gitignore
```

La carpeta `frontend/` está en la rama `frontend`; no se ve al cambiar a la rama `backend` hasta que ambas se integren. El inventario y contenido de las rutas frontend también están descritos en [`docs/frontend.txt`](docs/frontend.txt), aunque actualmente `docs/` está excluida del control de versiones por `.gitignore`. Los cronogramas, material de diseño y archivos fuente de listas que estén en esa carpeta local tampoco estarán disponibles para quien clone una rama que no los incluya.

## Roles y responsabilidades

- **Backend:** autenticar solicitudes, validar autorización y datos, persistir perfiles y vínculos, publicar versiones LOTBA y servir contratos de API.
- **Mobile:** experiencia de usuario, Firebase Auth cliente, sesión anónima del dispositivo, almacenamiento/sincronización local de listas y aplicación de la protección que permita cada plataforma.
- **Data Analytics:** validar la taxonomía de eventos y campos para preservar métricas consistentes.
- **QA:** acordar y verificar criterios de aceptación, idempotencia, reintentos, errores y estabilidad.
- **UX/UI:** definir los flujos, contenidos y estados visibles para responsables y usuarios del dispositivo protegido.

## Documentación relacionada

- [Reporte técnico y contratos de Backend](backend/README.md)
- [Reglas de exclusión y archivos locales](.gitignore)

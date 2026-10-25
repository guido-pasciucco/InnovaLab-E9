# **Arquitectura de datos (issue \#22)**

## Arquitectura para responsable, dispositivos vinculados, eventos y alertas

## (Actualización: La Arquitectura presentada se dió por aprobada ya que no hubo objeciones del resto del equipo)

## 

## **Objetivo**

Proponer al equipo el modelo de datos inicial para el backend de BA Protege+, cubriendo las entidades centrales (responsable, dispositivos, eventos y alertas) y su relación con la gestión de sitios bloqueados (issue \#23), a partir del brief funcional y de la investigación de UX/benchmark ya entregada por el equipo de diseño.

## 

## **Entidades identificadas**

Se definieron 7 entidades principales:

* Responsable  
* Dispositivo  
* Evento  
* Alerta  
* Código de vinculación  
* Versión de Lista  
* Lista de Dominios

### 

## **Subcolecciones vs. colecciones raíz con referencia**

* **RESPONSABLES ↔ DISPOSITIVOS:** colección raíz con referencia. Como un dispositivo puede tener varios responsables (relación N:M). dispositivos/{id} guarda un array responsablesIds con los IDs de todos los responsables vinculados.  
* **DISPOSITIVOS → EVENTOS:** subcolección real (*dispositivos/{id}/eventos/{id}*). Cada evento pertenece a un único dispositivo puntual.  
* **EVENTOS → ALERTAS:** referencia por ID (eventoId dentro de la alerta). La alerta guarda un campo eventoId apuntando al evento que la generó, pero vive en su propia colección (o subcolección de dispositivos, a definir), porque el responsable va a querer ver "todas mis alertas" sin importar de qué dispositivo vinieron.  
* **RESPONSABLES → CODIGOS\_VINCULACION:** colección raíz con referencia (*codigosVinculacion/{id}* con campo responsableId), no es subcolección porque el dispositivo que todavía no está vinculado necesita poder leer ese código sin tener acceso al perfil completo del responsable.  
* **LISTA\_VERSION → LISTA\_DOMINIO:** las listas separadas de la versión anterior se fusionan en una sola colección raíz con una subcolección (*listaVersion/{versionId}/dominios/{dominioId}*), los dominios siempre se consultan en el contexto de una versión puntual.  
* **RESPONSABLES → LISTA\_VERSION** (listas personalizadas): colección raíz con referencia a responsables (responsableId), son sitios agregados por el responsable manualmente. Se consulta a veces de forma independiente (ej. validar un dominio contra todas las listas personalizadas de todos los responsables, si en el futuro hay una función de "sitios reportados por la comunidad").  
* **DISPOSITIVOS → "latido":** no es una entidad aparte, es el campo ultimoReporte dentro del propio documento de dispositivo, más una función programada externa que lo revisa.

## **Descripción detallada de cada entidad**

*Referencia de Columnas:*

| *Campo* | *Tipo* | *Descripción* |
| :---- | :---- | :---- |

| RESPONSABLE (raíz) |  |  |
| :---- | :---- | :---- |
| nombre | string | Nombre del adulto responsable tal como lo ingresa en el formulario, para mostrar en la app |
| fechaNacimiento | string | Fecha de nacimiento en formato ISO `YYYY-MM-DD`, normalizada desde el formulario |
| email | string | Usado para login (Firebase Auth) |
| pinHash | string | Hash (no texto plano) del PIN de 4-6 dígitos que protege configuraciones críticas |
| fechaCreacion | timestamp | Cuándo se registró el responsable |

El formulario de registro de Frontend solicita email, contraseña, repetición de contraseña, nombre y fecha de nacimiento. Firebase Authentication gestiona la contraseña; la contraseña y su repetición no se guardan en el perfil de Firestore. El perfil `responsables/{UID}` conserva los datos de la aplicación asociados al UID de Firebase Authentication.

| PERFIL PROTEGIDO (subcolección de DISPOSITIVOS) |  |  |
| :---- | :---- | :---- |
| nombre | string | Nombre de la persona protegida |
| apellido | string | Apellido de la persona protegida |
| fechaNacimiento | string | Fecha de nacimiento en formato ISO `YYYY-MM-DD` |
| parentesco | string | Relación indicada por el responsable |
| creadoEn | timestamp | Fecha de creación asignada por el servidor |

El perfil protegido se almacena separado de los metadatos técnicos del dispositivo en `dispositivos/{dispositivoId}/perfilProtegido/datos`. Su creación requiere un responsable autenticado y vinculado al dispositivo. Como contiene datos personales de un menor, las reglas de Firestore para clientes deben impedir lecturas y escrituras no autorizadas; Mobile debe acceder a través de la API mientras no se diseñe un mecanismo de lectura seguro.

| DISPOSITIVOS (raíz) |  |  |
| :---- | :---- | :---- |
| uid | string | ID de Firebase Anonymous Authentication |
| nombre | string | Nombre visible del dispositivo (ej. "Celular de Juan"), usado en alertas |
| estado | string (enum) | "activo" / "advertencia" / "caido" / "sin\_configurar" |
| responsablesIds | array\<string\> | IDs de los responsables vinculados (relación N:M) |
| plataforma | string | Ej. "android" *(pedido por Data Analytics)* |
| versionApp | string | Versión de la app instalada en el dispositivo |
| ultimoReporte | timestamp | Última señal de "latido" recibida, base del mecanismo de heartbeat |
| fcmToken | string | Token de Firebase Cloud Messaging para enviarle notificaciones push a ese dispositivo específico |
| fechaVinculacion | timestamp | Cuándo se vinculó al responsable |

| EVENTOS (subcolección de DISPOSITIVOS) |  |  |
| :---- | :---- | :---- |
| eventoId | string | (uuid) Generado en el dispositivo; usado como ID del documento para evitar duplicados |
| dispositivoId | string | (referencia a dispositivos) Dispositivo de origen |
| timestampDispositivo | timestamp | Hora según el dispositivo (puede estar adulterada) |
| timestampServidor | timestamp | Hora asignada por el backend al recibir |
| secuencia | entero | Correlativo por dispositivo, para detectar eventos perdidos |
| tipoEvento | string (enum) | Enum de 14 valores: vinculacion, desvinculacion, proteccion\_activada, proteccion\_desactivada, acceso\_bloqueado, intento\_instalacion, cambio\_permiso, intento\_modificacion\_config, intento\_bypass, sync\_lista, alerta\_generada, alerta\_entregada, alerta\_leida, dispositivo\_sin\_reporte |
| resultado | string (enum) | bloqueado / detectado / exitoso / fallido |
| versionApp | string | Versión de la app al momento del evento |
| versionLista | string | Obligatorio en acceso\_bloqueado y sync\_lista — referencia a LISTA\_VERSION |
| *(campos propios según tipo)* | variable | Ej. dominio, origenLista, cantidad para acceso\_bloqueado; tipoBypass para intento\_bypass; ver especificación completa de Data Analytics |

| ALERTAS (raíz) |  |  |
| :---- | :---- | :---- |
| alertaId | string | Identificador propio |
| eventoOrigenId | string | (referencia a EVENTOS) ID del evento que disparó esta alerta |
| mensaje | string | Texto ya armado para mostrar/notificar (ej. "La protección en el dispositivo de Juan está inactiva") |
| fecha | timestamp | Cuándo se generó |
| estado | string (enum) | "generada" / "entregada" / "leida". Si el responsable ya la abrió/leyó |
| responsableId | array\<string\> | (referencia a RESPONSABLES) Responsable asociado**Nota:** se movió este campo desde EVENTOS para denormalizar y evitar un número innecesario y costoso de consultas al servidor. |

| CODIGOS\_VINCULACION (raíz) |  |  |
| :---- | :---- | :---- |
| codigo | string | Los 6 símbolos alfanuméricos (el QR refleja este valor) que el dispositivo protegido debe ingresar. El código elige de este alfabeto: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" |
| responsableId | string | (referencia a RESPONSABLES) A qué responsable pertenece este código |
| creadoEn | timestamp | Cuándo se generó |
| expiraEn | timestamp | Vencimiento del código, por seguridad |
| usado | boolean | Si ya fue consumido, para que no se reutilice |

| LISTA\_VERSION (raíz) |  |  |
| :---- | :---- | :---- |
| versionId | string | Identificador de esta versión |
| origen | string (enum) | "lotba" / "personalizada" |
| responsableId | string | (referencia a RESPONSABLES, solo si origen \= "personalizada") Dueño de la lista, si aplica |
| fecha | timestamp | Cuándo se publicó esta versión |
| cantidadDominios | entero | Cantidad de dominios en esta versión |
| huella | string | Hash del contenido, para saber qué versión estaba vigente en cada evento |

| LISTA\_DOMINIO (subcolección de LISTA\_VERSION) |  |  |
| :---- | :---- | :---- |
| dominio | string | Dominio normalizado (minúsculas, sin protocolo/www/puerto/ruta) |
| origen | string (enum) | "lotba" / "personalizada" |

## 

## **Decisiones de estructura (Firestore)**

Como usamos Firestore (base de datos de documentos), la jerarquía del diagrama no se traduce toda de la misma forma. Se definieron dos tipos de relación:

### **Subcolecciones (dato anidado bajo su "padre")**

* **Dispositivo → Eventos:** los eventos siempre se consultan en el contexto de un dispositivo puntual.

### **Colecciones raíz con referencia por ID**

* **Responsable ↔ Dispositivos:** Un dispositivo puede tener varios responsables (relación N:M, dos padres, un hermano mayor, etc.). Cada dispositivo guarda un array responsablesIds con los IDs de todos los responsables vinculados.  
* **Alertas:** guardan un eventoId de referencia, pero viven aparte para poder listar "todas las alertas de un responsable" sin depender de un dispositivo específico.  
* **Códigos de vinculación:** el dispositivo que aún no está vinculado necesita poder leerlos sin acceso al perfil completo del responsable.  
* **Lista de Versión (LOTBA y personalizada):** colección raíz única, discriminada por el campo origen.

## 

## **Alcance propuesto para el MVP inmediato**

Prioricé el modelo básico de entidades y el primer flujo de bloqueo funcional. El versionado histórico completo de listas, el mecanismo de latido (dispositivo\_sin\_reporte) y las políticas de retención (TTL) se dejan preparadas en el diseño pero se implementan en sprints posteriores, una vez que el flujo principal esté funcionando.

# 

# 

# **Estado de avance: Entorno de desarrollo**

| FOCO | ESTADO |
| :---- | :---- |
| Setup de Node.js, Express y Firebase Admin SDK | OK |
| Proyecto de Firebase de prueba (sandbox) para validar el esquema | OK |
| Script de carga de datos de prueba (seed), reproducible por el equipo | OK |
| Estructura de carpetas en el repo compartido (backend/) | OK |
| Proyecto de Firebase real/compartido del equipo | Pendiente — a crear una vez aprobada la arquitectura (issue \#22) |

El entorno y los datos cargados actualmente son solo de prueba, en un proyecto de Firebase separado, para validar el modelo antes de implementarlo en el backend definitivo del equipo.

# **Propuestas de Flujos**

## 

## **Registro de un responsable**

1. Mobile crea la cuenta con email y contraseña mediante Firebase Authentication. La contraseña y su repetición son gestionadas por Firebase y no se envían ni guardan en el perfil de Firestore.
2. Tras crear la cuenta, Mobile obtiene el Firebase ID token y envía una solicitud autenticada a `POST /api/responsible-profile` con `nombre` y `fechaNacimiento` en formato ISO `YYYY-MM-DD`.
3. Backend verifica que el token corresponda a una sesión de email/contraseña. Obtiene UID y email de la identidad verificada y crea `responsables/{UID}` con `nombre`, `fechaNacimiento`, `email` y `fechaCreacion` asignada por el servidor.
4. La operación es idempotente: si se reintenta con los mismos datos, responde que el perfil ya existía; si el perfil ya existe con datos distintos, responde conflicto y no lo sobrescribe.
5. El PIN no forma parte de este registro inicial; su configuración queda como flujo separado.

Si la creación de la cuenta Auth tiene éxito pero falla la llamada de perfil, Mobile debe conservar la sesión y permitir reintentar `POST /api/responsible-profile`.

## **Perfil protegido después de vincular**

Una vez completada la vinculación, Mobile envía los datos del formulario de perfil protegido a `POST /api/devices/{deviceId}/protected-profile`, autenticado con el ID token del responsable. El body contiene `nombre`, `apellido`, `fechaNacimiento` (`YYYY-MM-DD`) y `parentesco`. Backend verifica que el UID autenticado figure en `responsablesIds` del dispositivo y guarda el perfil en `dispositivos/{deviceId}/perfilProtegido/datos`, separado del documento técnico.

La operación es idempotente si se reintenta con los mismos datos; si ya existe un perfil diferente, devuelve conflicto y no lo sobrescribe. No se incluye un endpoint de lectura o edición en este primer alcance.

## **Vinculación de un dispositivo**

## 

## (Actualización: Probado e implementado parcialmente, ver sección [Testeo e implementación inicial de Flujos](#testeo-e-implementación-inicial-de-flujos))

**A. El responsable genera el código**  
El responsable inicia sesión en la app con email y contraseña mediante Firebase Auth.

* Cuando elige “Vincular dispositivo”, la app solicita un Firebase ID token y llama al backend. Lo envía en el encabezado:  
  `Authorization: Bearer <ID-token-del-responsable>`  
* El backend verifica el token con Firebase Admin y obtiene de ahí el UID del responsable. No toma esa identidad de un UID enviado en el cuerpo.  
* El backend crea un código de seis símbolos alfanuméricos (por ej. G2TD8K), lo asocia al responsable y fija su vencimiento y estado de “no usado”.  
* La API devuelve el código y la fecha de vencimiento. La app lo muestra como texto y/o como QR. El QR representa el mismo código que se puede ingresar manualmente.

**B. El dispositivo protegido consume el código**

* La persona abre la opción de vinculación en el dispositivo protegido.  
* La app inicia sesión con Firebase Anonymous Auth. Recomiendo hacerlo al comenzar la vinculación, no necesariamente al abrir la app.  
* La persona escanea el QR o escribe el código. Ambos métodos entregan el mismo código a la app.  
* Mobile solicita un Firebase ID token de esa sesión anónima y llama al backend, también con:  
  `Authorization: Bearer <ID-token-anónimo-del-dispositivo>`  
* En el cuerpo envía el código y los datos acordados del dispositivo, por ejemplo:  
  `{`  
    `"codigo": "GBTDPK",`  
    `"nombreDispositivo": "Celular de Juan",`  
    `"plataforma": "android",`  
    `"versionApp": "1.0.0"`  
  `}`  
* El UID \*\*no se envía como dato confiable en ese cuerpo;\*\* el backend lo obtiene del token verificado.  
* El backend verifica el token y confirma que corresponde a una sesión anónima. Luego valida que el código exista, no haya vencido y no se haya usado.  
* Si es válido, el backend registra la relación entre ese UID de dispositivo y el responsable, y marca el código como usado. La validación, la asociación y el consumo deben hacerse de forma atómica para que dos solicitudes simultáneas no puedan reutilizar el mismo código.  
* El backend devuelve éxito al dispositivo. La app conserva su sesión anónima para que el UID del dispositivo no cambie al terminar la vinculación.  
* La app del responsable recibe o consulta la confirmación y muestra que el dispositivo quedó vinculado. La forma concreta de esa confirmación —por ejemplo, listener en tiempo real— conviene acordarla con Mobile.

**C. Si algo falla**  
La API debería devolver estados distinguibles para que Mobile pueda mostrar el paso siguiente adecuado:

* código inválido;  
* código vencido;  
* código ya utilizado;  
* token inválido o sesión vencida;  
* problema de conexión o error inesperado.

Por ejemplo, ante un código vencido, la app del responsable podría generar otro; ante una sesión vencida, Mobile podría volver a obtener el token de Firebase. Además, como el código tiene solo seis dígitos, Backend debería limitar intentos para dificultar pruebas automatizadas.

**Qué le toca acordar a cada rol**  
**Mobile:** iniciar y mantener la sesión anónima; enviar el ID token como Bearer; manejar lectura QR e ingreso manual; enviar los datos del dispositivo; mostrar estados y errores; confirmar el vínculo en la pantalla del responsable.  
**Backend:** verificar los tokens; distinguir responsable de dispositivo; generar y vencer códigos; validar y consumirlos una sola vez; asociar identidades; responder con resultados y errores claros.

# **Testeo e implementación inicial de Flujos** {#testeo-e-implementación-inicial-de-flujos}

### 

## ⚠️ACTUALMENTE (15-10-26): El servidor se ejecutó localmente y el flujo se probó contra el proyecto Firebase sandbox; todavía no se integró con Mobile.

## **Flujo de Vinculación de Dispositivos**

**Estado**: autenticación y flujo básico de vinculación validados con cliente de prueba contra Firebase sandbox. El código alfanumérico de seis caracteres se genera, vence a los 15 minutos y se consume una sola vez mediante una transacción de Firestore. También están implementados los endpoints backend para crear el perfil del responsable y, después de vincular, crear el perfil protegido. **Pendiente:** integración desde Mobile, confirmación al responsable y prueba de escritura del perfil protegido con una sesión vinculada.

Se probó una implementación super simplificada de este flujo, como se detalla a continuación:

1. El responsable inicia sesión con Firebase Auth. La app recibe un ID token y lo envía a la API como Authorization: Bearer ....  
2. Solicita un código de vinculación. El backend verifica el token, comprueba que exista su perfil y devuelve un código alfanumérico de seis caracteres, válido por 15 minutos.  
3. El responsable lo muestra como texto y QR. **La propuesta es que el QR contenga ese mismo código.**  
4. El dispositivo protegido inicia una sesión con Firebase Anonymous Auth y obtiene su propio ID token.  
5. La persona escanea o escribe el código. El dispositivo envía ese código y sus datos a la API junto con su token.  
6. El backend verifica que la sesión sea anónima, comprueba el código y, en una transacción, registra el dispositivo, lo asocia con el responsable y marca el código como usado. Un código vincula un solo dispositivo y no se puede reutilizar.

**Probado en el sandbox:** autenticación de ambos tipos de sesión, creación del código, canje, registro del dispositivo y asociación con el responsable. Es una evidencia sólida para mostrar al equipo.

**Todavía no integrado en Mobile:** login real desde la app, solicitudes a los endpoints, escaneo/ingreso del código y confirmación en la pantalla del responsable. Hasta ahora, las llamadas las hizo el cliente de prueba.

### **⚠️Particularidades importantes:**

* Durante la prueba inicial de vinculación, el perfil del responsable en `responsables/{UID}` se creó manualmente. Crear una cuenta en Firebase Auth no crea automáticamente ese documento. Backend ya expone `POST /api/responsible-profile` para completar ese paso; Mobile aún debe llamarlo desde el registro de Frontend.
* El cliente de prueba crea una sesión anónima nueva al ejecutar el modo de canje. Mobile deberá conservar la sesión de Firebase del dispositivo para mantener su UID.  
* **⚠ ️Formato visible:** el QR debe contener el mismo código de seis caracteres que se ingresa manualmente.

### **Contrato actual de API**

| Operación | Ruta | Quién puede llamarla |
| :---- | :---- | :---- |
| Crear perfil de responsable | POST /api/responsible-profile | Responsable autenticado con email/contraseña |
| Crear código | POST /api/link-codes | Responsable autenticado con email/contraseña y perfil existente |
| Canjear código | POST /api/link-codes/redeem | Dispositivo autenticado anónimamente |
| Crear perfil protegido | POST /api/devices/{deviceId}/protected-profile | Responsable autenticado y vinculado al dispositivo |
| Verificar autenticación (prueba) | GET /api/test-auth | Responsable o sesión anónima |

### **Contrato para crear el perfil protegido**

Solicitud:

```http
POST /api/devices/{deviceId}/protected-profile
Authorization: Bearer <Firebase-ID-token-del-responsable>
Content-Type: application/json
```

```json
{
  "nombre": "Nombre",
  "apellido": "Apellido",
  "fechaNacimiento": "2015-04-23",
  "parentesco": "hijo"
}
```

El `deviceId` es el UID del dispositivo protegido, devuelto por el canje. El ID del responsable se obtiene del token verificado, nunca del body. Primera creación: HTTP `201`; reintento con el mismo contenido: HTTP `200`; si el dispositivo no existe: `404`; si el responsable no está vinculado: `403`; si ya hay un perfil diferente: `409`; body inválido: `400`.

El cliente de prueba está en `scripts/auth-smoke-test.js`. El backend se organiza bajo `src/`: `routes/` declara los endpoints, `services/` contiene la lógica de negocio y acceso a Firestore, `middleware/` verifica Firebase Auth y maneja errores, y `config/firebase.js` inicializa Firebase Admin. `src/server.js` arranca Express; el `server.js` de la raíz se conserva como entrada compatible. Se inicia con `npm start` desde `backend/`.

### **Pendientes para acordar con el equipo**

* **Confirmación al responsable:** cómo se enterará su celular de que el dispositivo terminó de vincularse; el reporte propone tiempo real, pero aún debe definirse cómo lo implementará Mobile.  
* **Registro del responsable y perfil protegido:** integrar desde Mobile las llamadas a `POST /api/responsible-profile` durante el registro y `POST /api/devices/{deviceId}/protected-profile` luego de la vinculación.
* **Datos del dispositivo:** confirmar con Mobile qué valores reales enviará para nombre, plataforma y versión.  
* **Errores en la experiencia:** definir qué mostrar ante código inválido, vencido o ya usado, o ante una sesión/token no válido.

#

# **A DEFINIR (actualizado)**

## Cuestiones a definir y validar con el resto del equipo, incluyendo propuestas desde el área de BACKEND. Si no se recibe un OK ni objeciones dentro de un plazo razonable (aproximadamente una semana), las propuestas se considerarán aprobadas; los roles involucrados deben revisarlas y plantear cualquier objeción dentro de ese plazo.

**1- (PENDIENTE) Validación del PIN** — *Backend \+ Frontend/Mobile*  
¿Se valida contra el backend (comparando el hash) o completamente en el dispositivo protegido, sin llamar a la API?

* **PROPUESTAS:** validar contra el backend (comparando pinHash), no localmente en el dispositivo. Razones:  
  * El PIN nunca queda expuesto en el dispositivo del menor, ni siquiera como hash.  
  * Permite límite de intentos centralizado (ej. 3 intentos fallidos → bloqueo temporal \+ alerta al responsable).  
  * El responsable puede cambiar el PIN sin necesidad de tocar físicamente el dispositivo protegido.  
  * Cada intento (exitoso o fallido) se integra naturalmente como evento intento\_modificacion\_config de la taxonomía ya definida con Data Analytics.  
  * Es el mismo patrón que usan referentes del benchmark (ej. Qustodio valida contra la contraseña del adulto de forma centralizada, no local).  
* **Pendiente de definir junto con esta decisión:** qué hacer si el dispositivo protegido intenta un cambio crítico estando sin conexión — para el MVP, proponemos no permitir el cambio hasta recuperar conexión, en vez de guardar el intento en cola local.

**2- (PENDIENTE) Confirmación en tiempo real** — *Backend \+ Frontend/Mobile*  
Para la confirmación simultánea de vinculación en ambos celulares (QR / código de 6 dígitos), ¿alcanza con polling periódico o se necesita un listener en tiempo real de Firestore del lado del dispositivo?

* **PROPUESTA DESDE BACKEND:** usar un listener en tiempo real de Firestore (onSnapshot) en vez de polling. Razones:  
  * Cumple mejor el requisito de UX de confirmación "simultánea" — la notificación llega prácticamente al instante, sin el delay inherente de un intervalo de polling.  
  * Es más eficiente para el backend: evita múltiples lecturas repetidas de Firestore por cada proceso de vinculación (que además tienen un costo asociado).  
  * No requiere infraestructura adicional — es una funcionalidad nativa del SDK de Firestore, no hay que programar un sistema de notificación aparte.  
  * El trabajo del lado del Backend no cambia (seguimos actualizando el documento de codigosVinculacion normalmente); el cambio principal es de implementación en el cliente (Frontend/Mobile usa onSnapshot() en vez de un fetch repetido), por eso proponemos definirlo en conjunto con ellos.

**3- (DESCARTADO YA QUE NO HUBO OBJECIÓN) Categorías de sitio** — *Backend \+ UX/UI*  
El benchmark de UX menciona categorías de contenido en la pantalla de bloqueo (inspirado en Qustodio). ¿Se confirma este requerimiento o queda descartado para el MVP?

* **PROPUESTA DESDE BACKEND:** El benchmark de UX menciona categorías de contenido en la pantalla de bloqueo (inspirado en Qustodio). No está claro si esto implica ampliar el alcance más allá de sitios de apuestas (lo cual excede el objetivo del proyecto, definido por LOTBA), o simplemente sub-clasificar tipos de apuestas para un mensaje más específico. En cualquier caso, no es necesario para el bloqueo funcional del MVP; se deja descartado para el MVP y como posible feature futura.

**4- (PENDIENTE) Catálogos de `permiso`, `configuracion` y `tipoBypass` para Android** — *Backend \+ Frontend/Mobile*  
Definir los valores posibles de estos enums en base a los mecanismos técnicos ya investigados por Frontend (VpnService, Device Admin, Accesibilidad, Device Owner, Foreground service).

* **Propuesta de catálogo, a validar con Frontend:**  
* permiso (evento cambio\_permiso):  
  * vpn — autorización del servicio VPN local  
  * accesibilidad — Servicio de Accesibilidad  
  * device\_admin — Administrador de dispositivo  
      
* configuracion (evento intento\_modificacion\_config):  
  * desactivar\_proteccion  
  * desvincular\_dispositivo  
  * cambiar\_pin  
  * editar\_lista\_personalizada  
      
* tipoBypass (evento intento\_bypass):  
  * dns\_privado — DNS privado o DoH esquivando el VpnService  
  * vpn\_externa — otra VPN activa en simultáneo  
  * accesibilidad\_desactivada  
  * device\_admin\_desactivado  
  * proceso\_terminado — el proceso es eliminado por el fabricante (Xiaomi, Samsung, etc.)


* **Preguntas puntuales para validar con Frontend en la reunión:**  
  * ¿Pueden detectar específicamente cuál de estos eventos ocurrió, o solo que "algo se desactivó" de forma genérica?  
  * Device Admin está documentado como en desuso por Google — ¿lo mantenemos en el catálogo o nos apoyamos solo en Accesibilidad \+ Foreground Service?  
  * ¿"Proceso terminado por el fabricante" se puede reportar como evento propio, o se infiere indirectamente a través de dispositivo\_sin\_reporte?

**5- (POSPUESTO: CONSIDERADO NO PRIMORDIAL PARA UN MVP; FEATURE A FUTURO) Generación de `dispositivo_sin_reporte`** — *Backend \+ Data Analytics*  
Confirmar que Backend genera este evento vía función programada, por ausencia de latido del dispositivo.

* **PROPUESTA:** implementar con Cloud Scheduler \+ Cloud Function, corriendo cada 5 minutos (más frecuente que el umbral de latido, para no perder precisión). La función consulta los dispositivos cuyo ultimoReporte superó el umbral y genera el evento solo en el momento de la transición (no en cada corrida), usando un campo de control (sinReporteNotificado) en el documento del dispositivo para evitar eventos duplicados mientras el dispositivo siga sin reportar. Este campo se resetea apenas el dispositivo vuelve a enviar señal de vida.

**6- (POSPUESTO: CONSIDERADO NO PRIMORDIAL PARA UN MVP; FEATURE A FUTURO)  Umbral de latido y ventana de deduplicación** — *Data Analytics \+ QA \+ Backend*  
Cerrar los valores propuestos (15 minutos de latido, 60 segundos de ventana de deduplicación de intentos) antes de que QA defina sus criterios de aceptación en base a ellos.

* **PROPUESTA:** en vez de fijar estos valores en el código, guardarlos como parámetros de configuración en Firestore, para que QA pueda ajustarlos durante el testing sin requerir un nuevo deploy. Además, señalamos un riesgo a validar con Frontend antes de cerrar el umbral de latido: según su propio reporte, fabricantes como Xiaomi o Samsung matan procesos en segundo plano de forma agresiva, lo que podría generar falsos positivos de dispositivo\_sin\_reporte si el umbral es muy ajustado respecto a la frecuencia real con la que el dispositivo puede reportar en esas condiciones.

**7- (APROBADO YA QUE NO HUBO OBJECIÓN) Responsable del enum `tipoEvento`** — *Backend \+ Data Analytics*  
Definir si Backend queda como dueño técnico del catálogo, con el compromiso de avisar a Data Analytics antes de agregar un tipo nuevo.

* **PROPUESTA:** Backend mantiene y valida el enum técnicamente (es quien actualiza el esquema y la documentación de la API), pero ningún tipo de evento nuevo se implementa sin aprobación previa de Data Analytics — ya que sus KPIs y dashboards dependen de que la taxonomía se mantenga estable. Proponemos un paso simple: toda propuesta de tipo de evento nuevo se comparte primero (ej. como issue o en el canal del equipo) con el campo y su propósito, y se implementa recién después del OK de Data Analytics.

**8- (APROBADO) Campo responsableId en EVENTOS y referencia en ALERTAS** — *Para: Backend*  
El campo responsableId en EVENTOS quedó marcado como duda en la tabla de entidades. Propuesta: eliminarlo de EVENTOS (se puede derivar consultando el dispositivo cuando haga falta), y en cambio agregar responsablesIds: array\<string\> en ALERTAS, denormalizado al momento de crearla — necesario para poder listar "todas las alertas de un responsable" de forma eficiente, tal como se definió en el objetivo de esa entidad.
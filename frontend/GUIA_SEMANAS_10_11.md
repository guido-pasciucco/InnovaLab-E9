# Semanas 10 y 11 — Build candidato y build final (Frontend/Mobile)

**Plan.** Semana 10 (Sprint 5 – Iterar): corregir bugs críticos y vulnerabilidades, preparar el build candidato para Android con los mecanismos de seguridad integrados. Semana 11 (Sprint 6 – Cierre): generar el build final y validar funcionamiento, protección y alertas en distintos dispositivos.

**Versión:** `1.0.0-rc1` (build candidato). Si la validación de la semana 11 no deja bugs críticos abiertos, se publica como `1.0.0` (build final).

---

## 1. Qué cambió en esta versión

### Integración con los endpoints nuevos de Backend (publicados el 3/11)
| Endpoint | Antes | Ahora |
|---|---|---|
| `GET /api/devices` | Simulado | **Real.** El Tutor ve sus dispositivos reales y detecta solo cuando el otro celular canjea el código (ya no hace falta pegar el ID a mano) |
| `GET /api/devices/:id/events` | Simulado | **Real.** Inicio, Detalle y Bloqueos muestran la actividad real |
| `POST /api/devices/:id/events` | Eventos en cola, sin enviar | **Real.** El celular protegido envía cada evento con reintentos e idempotencia. Se verificó que todos los campos cumplen las validaciones de Backend |
| Alertas | Simuladas | **Armadas en la app a partir de los eventos reales**, con las reglas que se propusieron a Backend: protección desactivada, permiso quitado, intento de evasión, instalación riesgosa e intento de cambio sin PIN. La marca de "leída" se guarda en el celular del Tutor. Cuando exista `GET /api/alerts`, se activa el flag `alerts` y se usan las de Backend |

Siguen simulados (no existen en Backend todavía): lista personalizada, PIN y desvincular.

### Bugs críticos corregidos
- **Estado desconocido rompía la pantalla:** si un dispositivo llegaba de Backend con un `estado` desconocido, el Inicio del Tutor fallaba. Ahora se muestra como "Sin configurar".

### Vulnerabilidades corregidas
| # | Vulnerabilidad | Riesgo | Corrección |
|---|---|---|---|
| V1 | El **refresh token** de la sesión se guardaba **sin cifrar** (en AsyncStorage y en SharedPreferences) | Quien obtuviera los archivos de la app podía actuar como el Tutor o como el dispositivo frente a Backend | Cifrado **AES-256-GCM con clave en el Android Keystore** (`SecureStore.kt`). Las sesiones viejas se migran solas y se borra la copia sin cifrar |
| V2 | Los **logs** del módulo nativo incluían dominios bloqueados y eventos | Cualquier persona con acceso a `logcat` veía la actividad del menor | Los logs informativos solo salen en builds de desarrollo (`L.kt`) |
| V3 | El **deep link** `baprotege://blocked/<texto>` mostraba cualquier texto | Otra app podía abrir la pantalla con un mensaje inventado | Solo se muestra si es un dominio válido |
| V4 | Bloqueo de PIN salteable (corregido en la semana 9) | Probar PINs sin límite | Persistente y escalonado. **El límite real sigue pendiente en Backend** |
| V5 | Build release con **http** | Datos en texto plano por la red | El release bloquea http. La demo debería usar el backend con https; si no, `network_security_config.xml` habilita solo la IP indicada |

---

## 2. Cómo actualizar el proyecto

1. Reemplazar `src/` (borrando la carpeta anterior) y `App.tsx`.
2. Reemplazar `android\app\src\main\java\com\baprotege\protection\` por la carpeta nueva. Son **22 archivos**: se sumaron `L.kt` y `SecureStore.kt`.
3. Copiar `android-native/app/src/main/res/xml/network_security_config.xml` a `android\app\src\main\res\xml\`. Solo se usa si el backend de la demo va sin https.
4. El manifest y `strings.xml` no cambian.

---

## 3. Build candidato (semana 10)

### 3.1 Crear la clave de firma (una sola vez)
Android solo instala apps firmadas. La clave identifica a la app: **si se pierde, no se pueden publicar actualizaciones**. Guardarla fuera del repo y con backup.

En PowerShell, dentro de `android\app`:
```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore baprotege-release.keystore -alias baprotege -keyalg RSA -keysize 2048 -validity 10000
```
Pide una contraseña y algunos datos (nombre, organización). `keytool` viene con el JDK 17 que ya está instalado.

### 3.2 Configurar la firma sin subir contraseñas a git
1. Copiar el contenido de `android-native/release/gradle.properties.EJEMPLO` en `C:\Users\<usuario>\.gradle\gradle.properties` (crearlo si no existe) y poner las contraseñas reales.
2. Agregar al `.gitignore` de la raíz las líneas de `android-native/release/gitignore.AGREGAR`.

### 3.3 Ajustar `android/app/build.gradle`
Seguir `android-native/release/build.gradle.FRAGMENTOS.gradle`. Son 4 cambios:
- **Versión:** `versionCode 10` y `versionName "1.0.0-rc1"`.
- **Firma:** bloque `signingConfigs.release`.
- **Tipo de build:** `buildTypes.release` usa `signingConfigs.release`.
- **ProGuard:** `enableProguardInReleaseBuilds = true`.

Además, agregar al final de `android/app/proguard-rules.pro` lo que está en `android-native/release/proguard-rules.AGREGAR.pro`.

### 3.4 Configurar el entorno
En `src/config/env.ts`:
- `FIREBASE_WEB_API_KEY`: la key del proyecto sandbox.
- `API_BASE_URL`: la URL **https** del backend desplegado. Si el backend corre en una PC de la red local, poner su IP (`http://192.168.x.x:3000`), cargar esa misma IP en `network_security_config.xml` y agregar `android:networkSecurityConfig="@xml/network_security_config"` dentro de `<application>` en el manifest.

### 3.5 Generar el APK
```powershell
cd android
.\gradlew.bat clean
.\gradlew.bat assembleRelease
```
El APK queda en `android\app\build\outputs\apk\release\app-release.apk`. No necesita Metro: el código JS va adentro del APK.

### 3.6 Instalar en un dispositivo
```powershell
adb install -r android\app\build\outputs\apk\release\app-release.apk
```
También se puede pasar el `.apk` por Drive o WhatsApp e instalarlo en el celular, permitiendo "instalar apps desconocidas".

### 3.7 Errores comunes al compilar
| Error | Solución |
|---|---|
| `Unresolved reference: BuildConfig` en `L.kt` | Agregar `buildFeatures { buildConfig true }` dentro de `android { }` en `app/build.gradle` |
| `Could not get unknown property 'BAPROTEGE_STORE_FILE'` | Falta el `gradle.properties` del usuario (paso 3.2) |
| `Keystore file ... not found` | El `.keystore` tiene que estar en `android\app\` |
| `Execution failed for task ':app:minifyReleaseWithR8'` | Revisar que se agregaron las reglas de ProGuard (3.3) |
| Cualquier error de Kotlin | Anotarlo como bug crítico del candidato, con el archivo y la línea |

---

## 4. Build final (semana 11)

1. Correr la validación de `VALIDACION_DISPOSITIVOS.md` con el build candidato.
2. Corregir los bugs críticos que aparezcan. Un bug es crítico si la protección no se activa, no bloquea, se desactiva sin PIN, se cae y no vuelve, o la app se cierra sola.
3. Cambiar la versión a `versionCode 11` y `versionName "1.0.0"` en `build.gradle`, y `APP_VERSION: '1.0.0'` en `env.ts`.
4. Volver a generar con `.\gradlew.bat assembleRelease` y renombrar el archivo a `BAProtege-1.0.0.apk`.
5. Repetir la prueba rápida (sección A de la validación) con ese APK antes de entregarlo.

Para Google Play hace falta un `.aab` (`.\gradlew.bat bundleRelease`) y declarar el uso de VPN, Accesibilidad y `QUERY_ALL_PACKAGES`. Para el MVP y el Demo Day alcanza con el APK.

---

## 5. Pendientes con otros equipos

**Backend:**
- `GET /api/alerts` + marcar como leída por responsable.
- Lista personalizada.
- PIN con límite de intentos del lado del servidor.
- `DELETE /api/devices/:id`.
- Backend desplegado con https para el build release.

**QA:** correr `VALIDACION_DISPOSITIVOS.md` y registrar bugs con dispositivo, versión de Android y pasos.

**UX/UI:** ícono de la app (hoy usa el de React Native por defecto) y los íconos de la barra inferior.

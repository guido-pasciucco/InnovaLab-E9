# BA Protege+ — Esqueleto Frontend (React Native + TypeScript)

Este esqueleto define la navegación, los componentes base y la interfaz
hacia el código nativo de protección, actualizado según las pantallas
finales entregadas por UX/UI (PDF "BA Protege - Prueba"). No es un
proyecto ejecutable por sí solo: hay que copiarlo dentro de un proyecto
React Native ya inicializado.

## Cómo usarlo

1. Crear el proyecto base (si todavía no existe):
   ```bash
   npx @react-native-community/cli init BAProtege
   ```

2. Instalar las dependencias de navegación:
   ```bash
   npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
   npm install react-native-screens react-native-safe-area-context
   ```

3. Copiar el contenido de este esqueleto (carpeta `src/` y `App.tsx`) dentro
   del proyecto recién creado, reemplazando el `App.tsx` por defecto.

4. Correr la app:
   ```bash
   npx react-native run-android
   ```

## Flujo navegable (mock, de punta a punta)

```
Welcome ("Continuar como Tutor" / "Vincular Dispositivo protegido")
 ├── Login / SignUp
 │     └── LinkDevice (QR + código numérico de 6 dígitos, expira en 15 min)
 │           └── ConfigureProtectedProfile
 │                 └── ResponsibleTabs
 │                       ├── Familia  (lista de dispositivos, agregar familiar)
 │                       ├── Inicio   (estado de protección, bloqueos recientes)
 │                       └── Bloqueos (historial completo)
 │
 └── LinkDevice (directo, dispositivo protegido)
       └── ProtectedDeviceStack
             ├── PermissionsSetup (pantallas puente VPN / Admin / Accesibilidad)
             ├── ProtectionStatus
             └── BlockedSitePage (Volver atrás / Solicitar acceso a un adulto)
```

## Qué es real y qué es mock

| Parte | Estado |
|---|---|
| Navegación (stacks + tabs, flujo completo) | Funcional |
| Pantallas de Welcome, Login, SignUp, LinkDevice, ConfigureProtectedProfile | Funcionales, con el copy y campos del diseño final |
| Tabs Familia / Inicio / Bloqueos | Funcionales, con datos simulados tomados del diseño (BetMaster, Apuestas Sonic, etc.) |
| `ProtectionModule` | Solo interfaz + mock. La implementación en Kotlin corresponde a los experimentos E1-E8 y los sprints de desarrollo. |
| Vinculación QR/código | Placeholder visual, pero con el formato real confirmado contra el repo de Backend: código numérico de 6 dígitos, expira a los 15 min, con botón para regenerarlo. Falta el POST real que cree el documento en `codigosVinculacion`. |
| PIN del responsable | Conectado: `DeviceDetailScreen` exige el PIN (vía `PinInput`) para desvincular un dispositivo, verificado contra un mock (`PinVerification.mock.ts`) que simula el `pinHash` real de Backend. Falta la llamada real al endpoint de verificación. |
| Login social (Google/Facebook/X) | Botones conectados a un mock; falta integración real con Firebase Auth. |
| Persistencia del modo elegido | En memoria (`appModeStorage.ts`). Reemplazar por AsyncStorage o MMKV antes de integrar. |

## Pendientes conocidos (no bloquean el desarrollo de pantallas)

- Definir librería de QR (ej. `react-native-qrcode-svg`) una vez resuelto el
  formato del token con Backend.
- Implementar el Native Module `ProtectionModule` en Kotlin.
- Reemplazar el almacenamiento en memoria por uno persistente real.
- `LinkDeviceScreen` se reutiliza tanto en el Onboarding como dentro del tab
  "Familia" (para agregar un nuevo dispositivo). Los tipos de navegación
  están pensados para el caso de Onboarding; al conectar el caso de
  "Familia" conviene revisar el tipado de `navigation` en ese archivo.
- Backend modela que un dispositivo puede tener **varios responsables**
  (`dispositivos.responsablesIds` es un array). `FamilyScreen` y
  `DeviceDetailScreen` hoy asumen un solo responsable por dispositivo —
  falta decidir cómo se muestra eso en la UI (confirmarlo con UX/Backend).
- No hay todavía ningún endpoint de Express corriendo en el repo de
  Backend (`guido-pasciucco/InnovaLab-E9`), solo el modelo de datos
  (`seed.js`). Todo lo marcado como "mock" en la tabla de arriba sigue
  siéndolo hasta que ese endpoint exista.

## Changelog

**v3 (tras revisar el repo real de Backend):**
- `QrCodeDisplay` y `LinkDeviceScreen`: el código de vinculación pasó de
  un placeholder alfanumérico (`A5B 09Q`) a un código numérico de 6
  dígitos con expiración de 15 minutos y botón para regenerarlo —
  coincide con `codigosVinculacion` en el seed real de Backend.
- Se conectó `PinInput` (antes armado y sin usar) en `DeviceDetailScreen`,
  para la acción de desvincular un dispositivo, contra un nuevo mock
  `PinVerification.mock.ts` que simula la verificación contra el
  `pinHash` real que guarda Backend por responsable.
- Confirmado: el PIN es independiente del login (campo `pinHash` propio
  en `responsables`, separado del email).

**v2 (tras recibir las pantallas finales de UX/UI):**
- Se agregó `WelcomeScreen`, `LoginScreen`, `SignUpScreen` y
  `ConfigureProtectedProfileScreen`.
- Se reemplazó `ResponsibleStack` por `ResponsibleTabs` (navegación
  inferior Familia / Inicio / Bloqueos), cada tab con su propio stack
  interno.
- Se agregaron `FamilyScreen` y `BlocksScreen`.
- Se actualizó `DashboardScreen` con el contenido real del diseño
  (saludo, estado de protección, bloqueos recientes).
- Se actualizó `BlockedSitePageScreen` con los botones "Volver atrás" y
  "Solicitar acceso a un adulto".
- Se actualizó el formato del código manual de vinculación a `A5B 09Q`.

**v1 (Semana 2, antes de recibir las pantallas finales):**
- Esqueleto inicial con `OnboardingStack`, `ResponsibleStack`,
  `ProtectedDeviceStack` genéricos y componentes base.

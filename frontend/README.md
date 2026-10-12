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
 │     └── LinkDevice (QR + código "A5B 09Q")
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
| Vinculación QR/código | Placeholder visual con el formato real (`A5B 09Q`). Pendiente de definir con Backend si el token se emite desde el servidor. |
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
- Conectar el PIN del `PinInput` (componente ya armado, todavía no usado
  en ninguna pantalla) a la validación de cambios críticos, según lo que
  se defina con Backend sobre PIN local vs. login del Responsable.

## Changelog

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

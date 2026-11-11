# Resultados de validación — build candidato 1.0.0-rc1

**Fecha:** 11/11/2026 · **Build:** APK release `1.0.0-rc1` (versionCode 10), firmado con la clave de release, R8/ProGuard activado.
**Dispositivo:** emulador Pixel "Medium Phone", Android 17 (API 37), x86_64. **Modo:** demo (sin Backend).

| # | Prueba | Planilla | Resultado |
|---|---|---|---|
| 1 | Instalar el APK release y abrir | A1 | ✅ |
| 2 | Vincular el celular protegido con un código | A2 | ✅ |
| 3 | Aceptar VPN, administrador, accesibilidad y batería → estado sin "Modo simulado" y VPN activa | A3 | ✅ |
| 4 | Abrir `example.org` → no carga + notificación "Sitio bloqueado" | A4 | ✅ |
| 5 | Tocar la notificación → pantalla de sitio bloqueado con el dominio | A5 | ✅ |
| 6 | Abrir `wikipedia.org` → carga normal | A6 | ✅ |
| 7 | "Ver actividad" → activación y bloqueo registrados | — | ✅ |
| 8 | Cerrar la app deslizándola → sigue bloqueando | B1 | ✅ |
| 9 | `adb uninstall` con la protección activa → rechazado (`DELETE_FAILED_DEVICE_POLICY_MANAGER`) | — | ✅ |
| 10 | 3 PIN incorrectos → bloqueo temporal | C1 | ✅ |
| 11 | "Quitar la protección" con PIN → se puede desinstalar | C7 | ✅ |

**Conclusión:** sin bugs críticos en emulador. El módulo nativo (filtro DNS, notificaciones, persistencia, administrador del dispositivo, PIN) funciona en el build release con minificación.

## Pendiente antes del build final 1.0.0
- Validar en al menos un celular real (idealmente Samsung o Xiaomi): persistencia con ahorro de batería y guardián de Ajustes (C3, C4).
- Prueba con Backend real (`FIREBASE_WEB_API_KEY` + URL del backend): vinculación, eventos y alertas en la app del Tutor (sección D de la planilla).
- Reinicio del dispositivo (B2) y pruebas prolongadas (B3–B5).

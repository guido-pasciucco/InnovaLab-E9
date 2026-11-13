# Validación del build en dispositivos (semana 11)

Build a validar: `1.0.0-rc1` (APK release). Completar una copia de la tabla por dispositivo.
Resultado: ✅ funciona · ⚠️ funciona con problemas (anotar) · ❌ no funciona (bug) · — no aplica.

## Dispositivos

Lo mínimo es cubrir versiones de Android distintas y al menos una marca con capa propia (Samsung o Xiaomi), que son las que más cierran apps en segundo plano.

| ID | Dispositivo | Android (API) | Por qué |
|---|---|---|---|
| D1 | Emulador Pixel | 10 (29) | Versión mínima con DNS privado y "VPN siempre activa" detectable |
| D2 | Emulador Pixel | 13 (33) | Permiso de notificaciones en tiempo de ejecución |
| D3 | Emulador Pixel | 14 o 15 (34/35) | Reglas nuevas de servicios en primer plano |
| D4 | Celular Samsung real | el que haya | Capa One UI, ahorro de batería agresivo |
| D5 | Celular Xiaomi/Motorola real | el que haya | Capa MIUI/HyperOS, "Inicio automático" |

En Android Studio: Device Manager → Create Device → Pixel → elegir la imagen de cada versión.

## A. Prueba rápida (10 min, todos los dispositivos)

| # | Paso | Esperado | D1 | D2 | D3 | D4 | D5 |
|---|---|---|---|---|---|---|---|
| A1 | Instalar el APK y abrir | Abre en Bienvenida, sin cierres | | | | | |
| A2 | Vincular con un código real del Tutor | "¡Listo!" y pasa a permisos | | | | | |
| A3 | Aceptar VPN, administrador, accesibilidad y batería | Estado "Protección Activa" | | | | | |
| A4 | Abrir un dominio de la lista LOTBA en Chrome | No carga + notificación "Sitio bloqueado" | | | | | |
| A5 | Tocar la notificación | Pantalla roja con el dominio | | | | | |
| A6 | Abrir wikipedia.org | Carga normal | | | | | |
| A7 | En el celular del Tutor, Inicio | Dispositivo "Protección Activa" y el bloqueo en "Bloqueos exitosos" | | | | | |

## B. Persistencia

| # | Paso | Esperado | D1 | D2 | D3 | D4 | D5 |
|---|---|---|---|---|---|---|---|
| B1 | Cerrar la app deslizándola | Sigue bloqueando | | | | | |
| B2 | Reiniciar el celular | Vuelve sola (sin abrir la app) | | | | | |
| B3 | Pantalla apagada 8 h | Sigue activa al volver | | | | | |
| B4 | Cambiar Wi-Fi ↔ datos 5 veces | Sigue bloqueando y navegando normal | | | | | |
| B5 | Modo avión 30 min con bloqueos, después quitarlo | Los eventos aparecen en la app del Tutor (máx. 15 min) | | | | | |

## C. Acciones protegidas y anti-bypass

| # | Paso | Esperado | D1 | D2 | D3 | D4 | D5 |
|---|---|---|---|---|---|---|---|
| C1 | Desactivar con PIN incorrecto ×3, cancelar y reabrir | Sigue bloqueado; alerta en el Tutor | | | | | |
| C2 | Desactivar con PIN correcto | Se desactiva; alerta "Protección desactivada" | | | | | |
| C3 | Ajustes → Apps → BA Protege+ (protección activa) | La pantalla se cierra; evento registrado | | | | | |
| C4 | Ajustes → DNS privado (protección activa) | La pantalla se cierra | | | | | |
| C5 | Chrome → DNS seguro → Google; abrir sitio LOTBA | Sigue bloqueado | | | | | |
| C6 | Instalar y activar otra VPN | Estado "caída"; alerta `vpn_externa` en el Tutor | | | | | |
| C7 | Quitar la protección con PIN y desinstalar | Se desinstala sin pasos extra | | | | | |

## D. App del Tutor

| # | Paso | Esperado | Resultado |
|---|---|---|---|
| D1 | Crear cuenta nueva + PIN | Cuenta en Firebase y perfil en Backend | |
| D2 | Generar código, canjearlo en el otro celular | Pasa solo a "Perfil protegido" | |
| D3 | Alertas | Aparecen las de C1, C2, C6; "Marcar todas como leídas" funciona | |
| D4 | Detalle del dispositivo | Actividad real ordenada por fecha | |
| D5 | Cerrar sesión y volver a entrar | Ve los mismos dispositivos | |

## Cómo registrar un bug

Título corto + dispositivo (ID de la tabla) + versión de Android + pasos para repetirlo + qué pasó vs. qué se esperaba + captura o `adb logcat` si se puede. Prioridad: **crítico** si afecta la protección o cierra la app; **alto** si afecta alertas o el Tutor; **medio/bajo** para lo visual.

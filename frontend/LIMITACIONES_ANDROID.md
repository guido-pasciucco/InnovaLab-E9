# BA Protege+ — Limitaciones técnicas conocidas en Android

**Para:** todos los equipos (pedido del plan, semana 9). **Plataforma:** Android, app React Native + módulo nativo Kotlin.
Documento vivo: cada limitación indica qué hace la app hoy y qué se podría hacer después.

> **Estado:** el build `1.0.0-rc1` fue validado en emulador (Android 17 / API 37): filtro, notificaciones, persistencia, PIN y bloqueo de desinstalación funcionan. Falta confirmar en celulares reales (sobre todo Samsung/Xiaomi) y en las pruebas prolongadas de QA.

## 1. Filtro de sitios (VPN local por DNS)

| Limitación | Qué hace la app hoy | Posible mejora |
|---|---|---|
| El filtro trabaja con **nombres de dominio**, no con páginas. No puede bloquear una sección de un sitio permitido. | Bloquea el dominio y todos sus subdominios (regla acordada con Backend). | — (es el alcance del MVP) |
| El navegador muestra **"no se puede acceder al sitio"**, no nuestra pantalla. Una VPN por DNS no puede dibujar dentro del navegador. | Notificación "Sitio bloqueado" que abre nuestra pantalla con el dominio. | Proxy HTTP local o Accesibilidad que detecte la URL (más complejo y frágil). |
| **DNS seguro / DNS privado** (DoH/DoT) puede saltear el filtro. | Semana 9: se bloquean los nombres de los servicios de DNS cifrado conocidos y el canario de Firefox; se detecta el DNS privado estricto; el guardián impide activarlo desde Ajustes. | Pedir a LOTBA/Backend que mantengan la lista de servicios DoH. |
| **DoH configurado por IP** (ej. `https://1.1.1.1/dns-query`) no pasa por un nombre: no se puede frenar por DNS. | No se frena. Se registra si la app que lo hace se instala (InstallMonitor). | Rutear todo el tráfico por la VPN y bloquear IPs de DoH conocidas (impacto en batería y rendimiento). |
| **Otra app de VPN** reemplaza la nuestra (Android permite una sola VPN activa). | Se detecta (`vpn_externa`) y se avisa; la protección queda "caída". | "VPN siempre activa" + "Bloquear conexiones sin VPN" (requiere rutear todo el tráfico, ver arriba). |
| Respuestas DNS muy grandes (truncadas) se reintentan por **TCP**, que nuestro filtro no maneja. | Raro en la práctica (se usa EDNS). Si pasa, ese dominio puede no cargar. | Soportar DNS por TCP en el servicio. |
| Apps que usan **IP fija** o su propio resolvedor no consultan el DNS del sistema. | No se filtran. | Igual que DoH por IP. |

## 2. Persistencia (que no se apague)

| Limitación | Qué hace la app hoy |
|---|---|
| Fabricantes como **Xiaomi, Samsung, Huawei y Oppo** cierran apps en segundo plano. | Pide excluirla del ahorro de batería; watchdog cada 15 min; reinicio automático del servicio; detecta y registra "proceso terminado". En Xiaomi además hay que activar "Inicio automático" a mano (no hay API). |
| Android 12+ puede **prohibir reiniciar** un servicio en primer plano desde segundo plano. | Si el watchdog no puede, muestra una notificación para abrir la app. |
| El watchdog no puede correr más seguido que **cada 15 minutos** (límite de JobScheduler). | Es el mínimo permitido. "VPN siempre activa" es la opción más robusta (Android la reinicia solo). |
| Tras un **reinicio**, si el permiso de VPN fue revocado, no se puede volver a pedir sin abrir la app. | BootReceiver avisa con una notificación. |

## 3. Bloqueo de desinstalación y cambios críticos

| Limitación | Qué hace la app hoy |
|---|---|
| Una app común **no puede impedir su desinstalación**. | Administrador del dispositivo (obliga a desactivarlo antes) + guardián de Accesibilidad que cierra esas pantallas. Para quitarla legítimamente: "Quitar la protección" con PIN (desde la semana 9 también quita el administrador). |
| El guardián de Accesibilidad se basa en el **texto de la pantalla**: cambia por fabricante e idioma. | Palabras en español e inglés de Android estándar. Hay que probar en cada marca y sumar palabras. |
| El usuario puede **desactivar la Accesibilidad** desde Ajustes. | El guardián intenta cerrar esa pantalla; si igual pasa, se registra `accesibilidad_desactivada`. |
| **Modo seguro** de Android (reinicio sin apps de terceros) desactiva todo. | No se puede evitar. Al volver al modo normal, la protección se reactiva sola. |
| **Restablecer de fábrica** borra todo. | No se puede evitar sin Device Owner. |

## 4. Instalación de aplicaciones

| Limitación | Qué hace la app hoy |
|---|---|
| **Impedir instalaciones** solo es posible con **Device Owner**, que exige configurar el celular desde cero. | Se detectan las apps riesgosas (VPN, DNS cifrado, nombres de apuestas) y se avisa. Device Owner queda como prueba de concepto. |
| Detectar apps por nombre es **heurístico**. | Lista de apps conocidas + palabras clave. Mejor: una lista de paquetes provista por LOTBA. |

## 5. Google Play y privacidad

- **Accesibilidad, `QUERY_ALL_PACKAGES` y la VPN** son permisos que Google Play revisa especialmente. Para publicar en la tienda hay que declararlos y justificarlos como app de control parental. El MVP se distribuye como APK.
- Desde la versión 1.0.0-rc1, la sesión (refresh token) se guarda **cifrada con el Android Keystore**. En un celular con root, igual se podría usar la clave desde el propio dispositivo: no se puede evitar del lado de la app.
- **No se registran** todas las apps instaladas ni el historial de navegación completo: solo bloqueos, intentos de evasión y cambios críticos.

## 6. Dependencias de Backend (a la fecha)

Ya integrados con Backend real: registro, login, vinculación, perfil protegido, lista LOTBA, lista de dispositivos, actividad y recepción de eventos.
Siguen simulados porque los endpoints no existen todavía: alertas (la app las arma a partir de los eventos reales, sin notificación push), lista personalizada, PIN (y su límite de intentos del lado del servidor) y desvincular.
Sin notificaciones push, el Tutor ve las alertas al abrir la app (el Inicio se actualiza cada 60 s mientras está abierto).

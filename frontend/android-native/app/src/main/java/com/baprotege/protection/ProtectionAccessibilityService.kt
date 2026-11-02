package com.baprotege.protection

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.text.Normalizer

/**
 * Guardián de Ajustes (Semana 8: "restricción de modificaciones críticas").
 *
 * Mientras la protección está ENCENDIDA, si se abre una pantalla de Ajustes que
 * habla de BA Protege+ con acciones destructivas (Desinstalar, Forzar detención,
 * Borrar datos) o de permisos (administrador, accesibilidad, VPN), o la de
 * "DNS privado", la cierra (vuelve al inicio) y registra el intento.
 *
 * Para cambiar algo legítimamente, el adulto primero desactiva la protección con
 * el PIN desde la app: con la protección apagada este guardián no actúa.
 *
 * Limitaciones honestas:
 *  - Se basa en el TEXTO de pantalla: cambia según fabricante e idioma (probado
 *    en español/inglés de Android "puro"; Samsung/Xiaomi requieren ajustar palabras).
 *  - Google Play restringe el uso de Accesibilidad: para publicar habría que declararlo.
 *  - El usuario puede desactivar la Accesibilidad... pero esa pantalla también
 *    menciona a BA Protege+, así que el guardián la bloquea. Si igual lo logra,
 *    BypassMonitor lo detecta (accesibilidad_desactivada).
 */
class ProtectionAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "AccessibilityGuard"
        private const val DEBOUNCE_MS = 1500L
        private const val MAX_NODES = 400

        private fun simplify(s: String): String =
            Normalizer.normalize(s.lowercase(), Normalizer.Form.NFD).replace(Regex("[^a-z0-9 ]"), "")

        /** Acciones que nunca se permiten con la protección encendida, ni siquiera en la "ventana" de permisos. */
        private val DESTRUCTIVE = listOf(
            "desinstalar", "uninstall", "forzar detencion", "force stop", "forzar cierre",
            "desactivar esta app de administracion", "deactivate this device admin", "desactivar administrador",
            "borrar datos", "clear storage", "clear data", "borrar almacenamiento", "olvidar", "forget"
        )
        private val PRIVATE_DNS = listOf("dns privado", "private dns")
        /** Pantallas de permisos sobre nuestra app (se permiten solo cuando la propia app las abrió). */
        private val SENSITIVE = listOf("administrador", "device admin", "admin app", "vpn", "accesibilidad", "accessibility")
    }

    private var lastAction = 0L
    /** Nombre de la app simplificado ("baprotege"), para reconocerla en el texto de Ajustes. */
    private val appKey: String by lazy {
        simplify(applicationInfo.loadLabel(packageManager).toString()).replace(" ", "")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "guardián conectado (etiqueta: $appKey)")
        ProtectionState.notifyStatusChanged()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
            event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) return
        if (!ProtectionPrefs.isEnabled(this)) return

        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName) return
        val isSystemSettings = pkg.contains("settings") || pkg.contains("packageinstaller") ||
            pkg.contains("securitycenter") || pkg.contains("safecenter") || pkg == "com.android.vpndialogs"
        if (!isSystemSettings) return

        val now = System.currentTimeMillis()
        if (now - lastAction < DEBOUNCE_MS) return

        val root = rootInActiveWindow ?: return
        val sb = StringBuilder()
        collectText(root, sb, intArrayOf(0))
        val text = simplify(sb.toString())
        val compact = text.replace(" ", "")
        val mentionsUs = compact.contains(appKey) || compact.contains("baprotege")
        val destructive = DESTRUCTIVE.any { text.contains(it) }

        when {
            // Diálogo del sistema para desconectar nuestra VPN.
            pkg == "com.android.vpndialogs" && mentionsUs -> block("intento_modificacion_config", mapOf("configuracion" to "desactivar_proteccion"))

            // Pantallas de Ajustes sobre nuestra app: acciones destructivas siempre; permisos fuera de la ventana.
            // (No se bloquean listas generales, como "Apps" o "Batería", aunque nos nombren.)
            mentionsUs && (destructive ||
                (SENSITIVE.any { text.contains(it) } && !ProtectionState.settingsAllowedNow())) ->
                block("intento_modificacion_config", mapOf("configuracion" to "desactivar_proteccion"))

            // Configuración de DNS privado (evasión conocida, experimento E3).
            PRIVATE_DNS.any { text.contains(it) } && !ProtectionState.settingsAllowedNow() ->
                block("intento_bypass", mapOf("tipoBypass" to "dns_privado"), resultado = "bloqueado")
        }
    }

    private fun block(tipo: String, extras: Map<String, Any?>, resultado: String = "bloqueado") {
        lastAction = System.currentTimeMillis()
        Log.i(TAG, "pantalla protegida bloqueada: $tipo $extras")
        performGlobalAction(GLOBAL_ACTION_BACK)
        performGlobalAction(GLOBAL_ACTION_HOME)
        EventLog.record(this, tipo, resultado, extras)
        Notifier.warning(this, "Acción protegida", "Para cambiar esta configuración se necesita el PIN del adulto responsable.")
    }

    private fun collectText(node: AccessibilityNodeInfo?, sb: StringBuilder, count: IntArray) {
        if (node == null || count[0] > MAX_NODES) return
        count[0]++
        node.text?.let { sb.append(it).append(' ') }
        node.contentDescription?.let { sb.append(it).append(' ') }
        for (i in 0 until node.childCount) collectText(node.getChild(i), sb, count)
    }

    override fun onInterrupt() {}

    override fun onUnbind(intent: android.content.Intent?): Boolean {
        // El usuario (o el sistema) desactivó la Accesibilidad.
        BypassMonitor.check(applicationContext)
        return super.onUnbind(intent)
    }
}

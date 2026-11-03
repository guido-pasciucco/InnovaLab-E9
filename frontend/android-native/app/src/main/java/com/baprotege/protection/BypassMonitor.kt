package com.baprotege.protection

import android.content.Context

/**
 * Primer mecanismo anti-bypass (Semana 6): detecta TRANSICIONES de estado y las
 * registra una sola vez (no en cada chequeo), con el catálogo de Backend:
 *   intento_bypass / tipoBypass = dns_privado | accesibilidad_desactivada
 * Se llama desde el watchdog, el servicio VPN (cambios de red) y la app.
 */
object BypassMonitor {
    private const val FLAG_DNS_STRICT = "lastPrivateDnsStrict"
    private const val FLAG_ACCESSIBILITY = "lastAccessibilityEnabled"
    private const val FLAG_ACCESSIBILITY_KNOWN = "accessibilityKnown"

    @Synchronized
    fun check(ctx: Context) {
        if (!ProtectionPrefs.isEnabled(ctx)) return
        var changed = false

        val strict = SecurityChecks.privateDnsRisk(ctx)
        if (strict != ProtectionPrefs.flag(ctx, FLAG_DNS_STRICT)) {
            ProtectionPrefs.setFlag(ctx, FLAG_DNS_STRICT, strict)
            changed = true
            if (strict) {
                EventLog.record(ctx, "intento_bypass", "detectado", mapOf("tipoBypass" to "dns_privado"))
                Notifier.warning(ctx, "DNS privado activado",
                    "Esta configuración puede saltear la protección. El adulto responsable fue avisado.")
            }
        }

        val acc = SecurityChecks.accessibilityEnabled(ctx)
        if (!ProtectionPrefs.flag(ctx, FLAG_ACCESSIBILITY_KNOWN)) {
            // Primera lectura: solo se guarda el valor, no hay transición que reportar.
            ProtectionPrefs.setFlag(ctx, FLAG_ACCESSIBILITY_KNOWN, true)
            ProtectionPrefs.setFlag(ctx, FLAG_ACCESSIBILITY, acc)
        } else if (acc != ProtectionPrefs.flag(ctx, FLAG_ACCESSIBILITY)) {
            ProtectionPrefs.setFlag(ctx, FLAG_ACCESSIBILITY, acc)
            changed = true
            if (!acc) {
                EventLog.record(ctx, "intento_bypass", "detectado", mapOf("tipoBypass" to "accesibilidad_desactivada"))
            }
        }

        if (changed) ProtectionState.notifyStatusChanged()
    }
}

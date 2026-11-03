package com.baprotege.protection

import android.content.Context
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import org.json.JSONObject
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Estado en memoria compartido entre el servicio VPN, el servicio de
 * Accesibilidad y el módulo React Native. Lo persistente está en ProtectionPrefs.
 */
object ProtectionState {
    @Volatile var vpnRunning: Boolean = false
        private set

    /** "VPN siempre activa" (lo informa el servicio en Android 10+; null = desconocido). */
    @Volatile var alwaysOnVpn: Boolean? = null

    /**
     * Ventana en la que la propia app abrió Ajustes (para activar un permiso): el
     * guardián de Accesibilidad no bloquea esas pantallas, salvo acciones destructivas.
     */
    @Volatile var settingsAllowedUntil: Long = 0L

    fun allowSettingsFor(ms: Long) { settingsAllowedUntil = System.currentTimeMillis() + ms }
    fun settingsAllowedNow() = System.currentTimeMillis() < settingsAllowedUntil

    interface Listener {
        fun onStatusChanged()
        fun onDomainBlocked(domain: String, timestamp: Long)
        fun onEventRecorded(event: JSONObject)
    }

    private val listeners = CopyOnWriteArrayList<Listener>()
    fun addListener(l: Listener) { listeners.addIfAbsent(l) }
    fun removeListener(l: Listener) { listeners.remove(l) }

    fun setVpnRunning(running: Boolean) {
        if (vpnRunning != running) {
            vpnRunning = running
            notifyStatusChanged()
        }
    }

    fun notifyStatusChanged() = listeners.forEach { it.onStatusChanged() }
    fun notifyDomainBlocked(domain: String) =
        listeners.forEach { it.onDomainBlocked(domain, System.currentTimeMillis()) }
    fun notifyEventRecorded(event: JSONObject) = listeners.forEach { it.onEventRecorded(event) }

    fun isAdminActive(ctx: Context): Boolean {
        val dpm = ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        return dpm.isAdminActive(ComponentName(ctx, BaDeviceAdminReceiver::class.java))
    }

    /** Mismos 4 estados que el componente de UX y que `dispositivos.estado` en Backend. */
    fun status(ctx: Context): String {
        if (!ProtectionPrefs.hasEverBeenEnabled(ctx)) return "unconfigured"
        if (!ProtectionPrefs.isEnabled(ctx)) return "inactive"     // apagada con PIN
        if (!vpnRunning) return "inactive"                         // debería estar encendida y se cayó
        val weak = ProtectionPrefs.blocklistCount(ctx) == 0 ||
            !isAdminActive(ctx) ||
            !SecurityChecks.accessibilityEnabled(ctx) ||
            SecurityChecks.privateDnsRisk(ctx)
        return if (weak) "warning" else "active"
    }
}

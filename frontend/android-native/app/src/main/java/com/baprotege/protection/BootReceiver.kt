package com.baprotege.protection

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.VpnService

/**
 * Reactiva la protección al prender el celular o tras actualizar la app, si el
 * responsable la había dejado encendida. Solo funciona si el permiso de VPN ya
 * fue concedido (prepare() == null): desde un receptor no se puede mostrar el diálogo.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        if (!ProtectionPrefs.isEnabled(context)) return

        ProtectionWatchdog.schedule(context)
        if (VpnService.prepare(context) != null) {
            L.w("BootReceiver", "Protección encendida pero falta el permiso de VPN")
            Notifier.protectionDown(context)
            return
        }
        try {
            BlockerVpnService.start(context, fromBoot = true)
        } catch (e: Exception) {
            L.w("BootReceiver", "no se pudo iniciar: ${e.message}")
            Notifier.protectionDown(context)
        }
    }
}

package com.baprotege.protection

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat

/** Lecturas del estado del sistema que importan para la protección (Semana 6). */
object SecurityChecks {

    /**
     * Modo de "DNS privado" (Android 9+): "off", "opportunistic" (automático) o
     * "hostname" (estricto con un proveedor elegido). El estricto puede mandar
     * las consultas DNS cifradas por fuera de nuestro filtro (experimento E3).
     */
    @Suppress("DEPRECATION") // allNetworks: alcanza para leer, no hay reemplazo simple sin callbacks
    fun privateDnsMode(ctx: Context): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return "off"
        // 1) API oficial: si alguna red tiene un servidor DNS privado con nombre, es modo estricto.
        try {
            val cm = ctx.getSystemService(ConnectivityManager::class.java)
            for (n in cm.allNetworks) {
                val lp = cm.getLinkProperties(n) ?: continue
                if (lp.privateDnsServerName != null) return "hostname"
            }
        } catch (_: Exception) {}
        // 2) Ajuste global (legible por apps en la mayoría de las versiones).
        return when (Settings.Global.getString(ctx.contentResolver, "private_dns_mode")) {
            "off" -> "off"
            "hostname" -> "hostname"
            "opportunistic", null -> "opportunistic"
            else -> "unknown"
        }
    }

    fun privateDnsRisk(ctx: Context) = privateDnsMode(ctx) == "hostname"

    fun accessibilityEnabled(ctx: Context): Boolean {
        val enabled = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
        return enabled.contains("${ctx.packageName}/")
    }

    fun batteryOptimizationIgnored(ctx: Context): Boolean {
        val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(ctx.packageName)
    }

    fun notificationsEnabled(ctx: Context) = NotificationManagerCompat.from(ctx).areNotificationsEnabled()

    /** ¿Hay alguna VPN activa? (se usa después de que nos revocan: si hay otra, es "vpn_externa"). */
    @Suppress("DEPRECATION")
    fun anyVpnActive(ctx: Context): Boolean = try {
        val cm = ctx.getSystemService(ConnectivityManager::class.java)
        cm.allNetworks.any { cm.getNetworkCapabilities(it)?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true }
    } catch (_: Exception) { false }
}

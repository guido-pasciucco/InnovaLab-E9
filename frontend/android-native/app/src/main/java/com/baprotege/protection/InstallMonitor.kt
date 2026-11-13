package com.baprotege.protection

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager

/**
 * Detección de instalaciones (Semana 8). Se registra dentro del servicio VPN,
 * así que funciona mientras la protección está activa.
 *
 * Android no permite que una app común IMPIDA instalaciones (eso requiere
 * Device Owner, validado solo como prueba de concepto). Lo que sí hacemos es
 * detectar apps que pueden evadir el filtro o que parecen de apuestas, y
 * registrarlo (`intento_instalacion`) para que Backend alerte al adulto.
 *
 * Privacidad: NO se registran todas las apps instaladas, solo las riesgosas.
 */
class InstallMonitor : BroadcastReceiver() {

    companion object {
        /** Apps conocidas que cambian el DNS, tunelizan tráfico o traen VPN incorporada. */
        private val KNOWN_BYPASS = setOf(
            "com.cloudflare.onedotonedotone",   // 1.1.1.1 + WARP
            "app.intra",                         // DNS cifrado
            "org.torproject.torbrowser",
            "org.torproject.android",
            "com.opera.browser",                 // navegador con VPN incorporada
            "com.psiphon3",
            "com.psiphon3.subscription",
            "free.vpn.unblock.proxy.turbovpn",
            "com.nordvpn.android",
            "com.expressvpn.vpn",
            "ch.protonvpn.android",
            "hotspotshield.android.vpn"
        )
        private val GAMBLING_WORDS = Regex("\\b(bet|bets|casino|apuesta|apuestas|poker|slots?|bingo|ruleta|sportsbook)\\b")
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_PACKAGE_ADDED) return
        if (intent.getBooleanExtra(Intent.EXTRA_REPLACING, false)) return // actualización, no instalación
        val pkg = intent.data?.schemeSpecificPart ?: return
        if (!ProtectionPrefs.isEnabled(context)) return

        val reason = classify(context, pkg) ?: return
        L.i("InstallMonitor", "app riesgosa instalada: $pkg ($reason)")
        EventLog.record(context, "intento_instalacion", "detectado", mapOf("paquete" to pkg))
        Notifier.warning(
            context,
            "Se instaló una app no permitida",
            if (reason == "vpn") "La app instalada puede evadir la protección. El adulto responsable fue avisado."
            else "La app instalada parece de apuestas. El adulto responsable fue avisado."
        )
    }

    /** "vpn", "apuestas" o null si no es riesgosa. */
    private fun classify(ctx: Context, pkg: String): String? {
        if (pkg in KNOWN_BYPASS) return "vpn"
        val pm = ctx.packageManager
        // ¿Declara un servicio de VPN?
        val vpnServices = pm.queryIntentServices(Intent("android.net.VpnService").setPackage(pkg), 0)
        if (vpnServices.isNotEmpty()) return "vpn"
        // ¿Nombre de apuestas? (heurística simple, a mejorar con una lista provista por LOTBA)
        val label = try {
            pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString().lowercase()
        } catch (e: PackageManager.NameNotFoundException) { "" }
        if (GAMBLING_WORDS.containsMatchIn(label) || GAMBLING_WORDS.containsMatchIn(pkg.replace('.', ' '))) return "apuestas"
        return null
    }
}

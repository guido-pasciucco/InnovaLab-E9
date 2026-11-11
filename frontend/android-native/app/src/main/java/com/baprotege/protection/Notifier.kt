package com.baprotege.protection

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Notificaciones locales del dispositivo protegido (Semana 5: "notificaciones básicas").
 *  - Sitio bloqueado: abre nuestra pantalla BlockedSitePage vía deep link.
 *  - Protección caída / advertencias anti-evasión.
 * Las alertas al ADULTO no salen de acá: las genera Backend a partir de los eventos.
 */
object Notifier {
    const val CHANNEL_SERVICE = "ba_protege_protection"
    private const val CHANNEL_BLOCKS = "ba_protege_bloqueos"
    private const val CHANNEL_WARNINGS = "ba_protege_avisos"

    private const val ID_BLOCKED = 2000
    private const val ID_DOWN = 2001
    private const val ID_WARNING = 2002
    /** Semana 9: como máximo un aviso de "sitio bloqueado" cada 15 s (el evento se registra igual). */
    private const val BLOCKED_MIN_INTERVAL_MS = 15_000L
    @Volatile private var lastBlockedShownAt = 0L

    fun ensureChannels(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(NotificationChannel(CHANNEL_SERVICE, "Protección activa", NotificationManager.IMPORTANCE_LOW))
        nm.createNotificationChannel(NotificationChannel(CHANNEL_BLOCKS, "Sitios bloqueados", NotificationManager.IMPORTANCE_DEFAULT))
        nm.createNotificationChannel(NotificationChannel(CHANNEL_WARNINGS, "Avisos de protección", NotificationManager.IMPORTANCE_HIGH))
    }

    private fun pendingIntent(ctx: Context, requestCode: Int, uri: String?): PendingIntent {
        val intent = if (uri != null) {
            Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(ctx.packageName)
        } else {
            ctx.packageManager.getLaunchIntentForPackage(ctx.packageName) ?: Intent()
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        return PendingIntent.getActivity(
            ctx, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun show(ctx: Context, id: Int, channel: String, title: String, text: String, uri: String?) {
        ensureChannels(ctx)
        val nm = NotificationManagerCompat.from(ctx)
        if (!nm.areNotificationsEnabled()) return
        val n = NotificationCompat.Builder(ctx, channel)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent(ctx, id, uri))
            .build()
        try {
            nm.notify(id, n)
        } catch (e: SecurityException) {
            L.w("Notifier", "sin permiso de notificaciones")
        }
    }

    fun blocked(ctx: Context, domain: String) {
        val now = System.currentTimeMillis()
        if (now - lastBlockedShownAt < BLOCKED_MIN_INTERVAL_MS) return
        lastBlockedShownAt = now
        showBlocked(ctx, domain)
    }

    private fun showBlocked(ctx: Context, domain: String) = show(
        ctx, ID_BLOCKED, CHANNEL_BLOCKS,
        "Sitio bloqueado",
        "BA Protege+ bloqueó $domain porque es un sitio de apuestas no autorizado. Tocá para ver más.",
        "baprotege://blocked/$domain"
    )

    fun protectionDown(ctx: Context) = show(
        ctx, ID_DOWN, CHANNEL_WARNINGS,
        "La protección se detuvo",
        "Tocá para volver a activar BA Protege+.",
        null
    )

    fun warning(ctx: Context, title: String, text: String) =
        show(ctx, ID_WARNING, CHANNEL_WARNINGS, title, text, null)
}

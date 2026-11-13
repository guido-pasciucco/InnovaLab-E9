package com.baprotege.protection

import android.content.Context
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors

/**
 * Sube los eventos pendientes a Backend, aunque la app (JS) esté cerrada.
 *
 * Contrato (propuesta #9 de Backend, pendiente de implementar por ellos):
 *   POST {apiBaseUrl}/api/devices/{deviceId}/events
 *   Authorization: Bearer <ID token de la sesión anónima del dispositivo>
 *   body: el evento tal cual lo guarda EventLog
 *
 * El ID token se renueva con el refresh token de Firebase (REST securetoken),
 * el mismo mecanismo que usa la app en JS. Reglas de reintento:
 *   2xx o 409 (ya existía: idempotencia por eventoId) -> se borra de la cola
 *   400/422 (rechazado por formato) -> se descarta y se loguea (no bloquea la cola)
 *   401 -> se renueva el token y se reintenta una vez
 *   404, 5xx, sin red -> se corta y se reintenta más tarde (watchdog o próximo evento)
 */
object EventUploader {
    private const val TAG = "EventUploader"
    private val executor = Executors.newSingleThreadExecutor()

    @Volatile private var idToken: String? = null
    @Volatile private var idTokenExpiresAt = 0L

    /**
     * Semana 9: espera creciente tras un fallo (1, 2, 4, 8, 16, 30 min) para no
     * gastar batería y datos intentando cada vez que se registra un evento sin conexión.
     */
    private const val MIN_BACKOFF_MS = 60_000L
    private const val MAX_BACKOFF_MS = 30 * 60_000L
    @Volatile private var nextAttemptAt = 0L
    @Volatile private var backoffMs = MIN_BACKOFF_MS

    /** Intento "de fondo": respeta la espera tras un fallo. */
    fun flushAsync(ctx: Context) {
        if (System.currentTimeMillis() < nextAttemptAt) return
        val app = ctx.applicationContext
        executor.execute {
            try { flushBlocking(app) } catch (e: Exception) { L.w(TAG, "flush falló: ${e.message}") }
        }
    }

    /** Intento pedido por la app (ej. al abrirla): ignora la espera. Devuelve cuántos quedan pendientes. */
    fun flushOn(ctx: Context, callback: (Int) -> Unit) {
        val app = ctx.applicationContext
        nextAttemptAt = 0L
        executor.execute {
            val left = try { flushBlocking(app) } catch (e: Exception) { EventLog.pendingCount(app) }
            callback(left)
        }
    }

    private fun onFailure() {
        nextAttemptAt = System.currentTimeMillis() + backoffMs
        backoffMs = minOf(backoffMs * 2, MAX_BACKOFF_MS)
    }

    private fun onSuccess() {
        nextAttemptAt = 0L
        backoffMs = MIN_BACKOFF_MS
    }

    fun invalidateToken() { idToken = null; idTokenExpiresAt = 0L }

    private fun flushBlocking(ctx: Context): Int {
        val cfg = ProtectionPrefs.backendConfig(ctx) ?: return EventLog.pendingCount(ctx)
        if (!cfg.uploadEnabled) return EventLog.pendingCount(ctx)

        for (event in EventLog.pending(ctx)) {
            var code = post(ctx, cfg, event)
            if (code == 401) { invalidateToken(); code = post(ctx, cfg, event) }
            val id = event.optString("eventoId")
            when {
                code in 200..299 || code == 409 -> { EventLog.removePending(ctx, id); onSuccess() }
                code == 400 || code == 422 -> {
                    L.w(TAG, "Backend rechazó el evento $id ($code); se descarta: $event")
                    EventLog.removePending(ctx, id)
                }
                else -> {
                    onFailure()
                    L.i(TAG, "Backend no disponible ($code); próximo intento en ${backoffMs / 60000} min")
                    break
                }
            }
        }
        return EventLog.pendingCount(ctx)
    }

    /** Devuelve el código HTTP, o -1 si no hubo red / no se pudo obtener token. */
    private fun post(ctx: Context, cfg: ProtectionPrefs.BackendConfig, event: JSONObject): Int {
        val token = token(ctx, cfg) ?: return -1
        return try {
            val url = URL("${cfg.apiBaseUrl}/api/devices/${URLEncoder.encode(cfg.deviceId, "UTF-8")}/events")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10000
                readTimeout = 10000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $token")
            }
            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(event.toString()) }
            val code = conn.responseCode
            conn.disconnect()
            code
        } catch (e: Exception) {
            L.i(TAG, "sin conexión con Backend: ${e.message}")
            -1
        }
    }

    private fun token(ctx: Context, cfg: ProtectionPrefs.BackendConfig): String? {
        val cached = idToken
        if (cached != null && System.currentTimeMillis() < idTokenExpiresAt - 5 * 60 * 1000) return cached
        return try {
            val url = URL("https://securetoken.googleapis.com/v1/token?key=${cfg.firebaseApiKey}")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10000
                readTimeout = 10000
                doOutput = true
                setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
            }
            val body = "grant_type=refresh_token&refresh_token=${URLEncoder.encode(cfg.refreshToken, "UTF-8")}"
            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(body) }
            if (conn.responseCode !in 200..299) {
                L.w(TAG, "no se pudo renovar el token (${conn.responseCode})")
                conn.disconnect()
                return null
            }
            val json = JSONObject(conn.inputStream.bufferedReader().readText())
            conn.disconnect()
            val newRefresh = json.optString("refresh_token")
            if (newRefresh.isNotEmpty() && newRefresh != cfg.refreshToken) ProtectionPrefs.updateRefreshToken(ctx, newRefresh)
            idToken = json.getString("id_token")
            idTokenExpiresAt = System.currentTimeMillis() + json.optString("expires_in", "3600").toLong() * 1000
            idToken
        } catch (e: Exception) {
            L.i(TAG, "sin conexión para renovar token: ${e.message}")
            null
        }
    }
}

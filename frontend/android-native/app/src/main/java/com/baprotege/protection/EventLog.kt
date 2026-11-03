package com.baprotege.protection

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

/**
 * Registro de eventos del dispositivo (Semanas 5-8), con la forma acordada con
 * Backend + Data Analytics (dispositivos/{id}/eventos/{eventoId}):
 *   eventoId (uuid estable para reintentos), tipoEvento, resultado,
 *   timestampDispositivo, secuencia, versionApp, versionLista + campos propios.
 *
 * Guarda dos archivos:
 *  - historial (últimos 300): lo que se muestra en "Actividad" sin conexión;
 *  - pendientes (hasta 500): lo que todavía no llegó a Backend (cola offline).
 */
object EventLog {
    private const val TAG = "EventLog"
    private const val HISTORY_FILE = "events_history.json"
    private const val PENDING_FILE = "events_pending.json"
    private const val MAX_HISTORY = 300
    private const val MAX_PENDING = 500

    /** Tipos en los que Backend pide versionLista obligatoria. */
    private val NEEDS_LIST_VERSION = setOf("acceso_bloqueado", "sync_lista")

    private fun iso(ms: Long): String {
        val f = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        f.timeZone = TimeZone.getTimeZone("UTC")
        return f.format(Date(ms))
    }

    private fun read(ctx: Context, name: String): JSONArray {
        val f = File(ctx.applicationContext.filesDir, name)
        if (!f.exists()) return JSONArray()
        return try { JSONArray(f.readText()) } catch (e: Exception) {
            Log.w(TAG, "archivo $name dañado, se reinicia", e); JSONArray()
        }
    }

    private fun write(ctx: Context, name: String, arr: JSONArray) {
        val dir = ctx.applicationContext.filesDir
        val tmp = File(dir, "$name.tmp")
        tmp.writeText(arr.toString())
        if (!tmp.renameTo(File(dir, name))) {
            File(dir, name).writeText(arr.toString()); tmp.delete()
        }
    }

    /** Registra un evento, lo encola para Backend y avisa a JS. Devuelve el evento creado. */
    fun record(ctx: Context, tipoEvento: String, resultado: String, extras: Map<String, Any?> = emptyMap()): JSONObject {
        val app = ctx.applicationContext
        val e = JSONObject()
        synchronized(this) {
            e.put("eventoId", UUID.randomUUID().toString())
            e.put("tipoEvento", tipoEvento)
            e.put("resultado", resultado)
            e.put("timestampDispositivo", iso(System.currentTimeMillis()))
            e.put("secuencia", ProtectionPrefs.nextSequence(app))
            e.put("versionApp", ProtectionPrefs.appVersion(app))
            if (tipoEvento in NEEDS_LIST_VERSION) {
                ProtectionPrefs.blocklistVersion(app)?.let { e.put("versionLista", it) }
            }
            for ((k, v) in extras) if (v != null) e.put(k, v)

            // Historial: el más nuevo primero.
            val old = read(app, HISTORY_FILE)
            val history = JSONArray().put(e)
            for (i in 0 until minOf(old.length(), MAX_HISTORY - 1)) history.put(old.get(i))
            write(app, HISTORY_FILE, history)

            // Cola para Backend: al final; si se llena, se descarta lo más viejo.
            val pending = read(app, PENDING_FILE)
            pending.put(e)
            val trimmed = if (pending.length() > MAX_PENDING) {
                JSONArray().also { t -> for (i in pending.length() - MAX_PENDING until pending.length()) t.put(pending.get(i)) }
            } else pending
            write(app, PENDING_FILE, trimmed)
        }
        Log.i(TAG, "evento $tipoEvento/$resultado $extras")
        ProtectionState.notifyEventRecorded(e)
        EventUploader.flushAsync(app)
        return e
    }

    @Synchronized
    fun history(ctx: Context, limit: Int): List<JSONObject> {
        val arr = read(ctx, HISTORY_FILE)
        return (0 until minOf(limit, arr.length())).map { arr.getJSONObject(it) }
    }

    @Synchronized
    fun pending(ctx: Context): List<JSONObject> {
        val arr = read(ctx, PENDING_FILE)
        return (0 until arr.length()).map { arr.getJSONObject(it) }
    }

    @Synchronized
    fun pendingCount(ctx: Context): Int = read(ctx, PENDING_FILE).length()

    @Synchronized
    fun removePending(ctx: Context, eventoId: String) {
        val arr = read(ctx, PENDING_FILE)
        val out = JSONArray()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            if (o.optString("eventoId") != eventoId) out.put(o)
        }
        write(ctx, PENDING_FILE, out)
    }
}

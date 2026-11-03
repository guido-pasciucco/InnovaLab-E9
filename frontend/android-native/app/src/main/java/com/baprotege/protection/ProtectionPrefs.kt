package com.baprotege.protection

import android.content.Context
import android.content.SharedPreferences

/**
 * Todo lo que tiene que sobrevivir a que Android mate la app o se reinicie el
 * celular. Lo leen BootReceiver, el watchdog y el servicio VPN.
 */
object ProtectionPrefs {
    private const val FILE = "ba_protege_protection"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_EVER_ENABLED = "everEnabled"
    private const val KEY_LIST_VERSION = "blocklistVersion"
    private const val KEY_LIST_HASH = "blocklistHash"
    private const val KEY_LIST_COUNT = "blocklistCount"
    private const val KEY_CUSTOM = "customDomains"
    private const val KEY_SEQUENCE = "eventSequence"
    private const val KEY_SHOULD_RUN = "serviceShouldBeRunning"

    // Configuración para subir eventos a Backend (la pasa JS al vincular).
    private const val KEY_API_URL = "apiBaseUrl"
    private const val KEY_API_KEY = "firebaseApiKey"
    private const val KEY_REFRESH = "refreshToken"
    private const val KEY_DEVICE_ID = "deviceId"
    private const val KEY_APP_VERSION = "appVersion"
    private const val KEY_UPLOAD = "uploadEnabled"

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun isEnabled(ctx: Context) = prefs(ctx).getBoolean(KEY_ENABLED, false)
    fun hasEverBeenEnabled(ctx: Context) = prefs(ctx).getBoolean(KEY_EVER_ENABLED, false)

    fun setEnabled(ctx: Context, enabled: Boolean) {
        val e = prefs(ctx).edit().putBoolean(KEY_ENABLED, enabled)
        if (enabled) e.putBoolean(KEY_EVER_ENABLED, true)
        e.commit() // commit (síncrono): el estado tiene que estar en disco antes de seguir
    }

    fun blocklistVersion(ctx: Context): String? = prefs(ctx).getString(KEY_LIST_VERSION, null)
    fun blocklistHash(ctx: Context): String? = prefs(ctx).getString(KEY_LIST_HASH, null)
    fun blocklistCount(ctx: Context) = prefs(ctx).getInt(KEY_LIST_COUNT, 0)

    fun setBlocklistInfo(ctx: Context, version: String, hash: String?, count: Int) {
        prefs(ctx).edit()
            .putString(KEY_LIST_VERSION, version)
            .putString(KEY_LIST_HASH, hash)
            .putInt(KEY_LIST_COUNT, count)
            .apply()
    }

    fun customDomains(ctx: Context): Set<String> =
        prefs(ctx).getStringSet(KEY_CUSTOM, emptySet())?.toSet() ?: emptySet()

    fun setCustomDomains(ctx: Context, domains: Set<String>) {
        prefs(ctx).edit().putStringSet(KEY_CUSTOM, HashSet(domains)).apply()
    }

    /** Correlativo por dispositivo (campo `secuencia` de los eventos). */
    @Synchronized
    fun nextSequence(ctx: Context): Long {
        val next = prefs(ctx).getLong(KEY_SEQUENCE, 0L) + 1
        prefs(ctx).edit().putLong(KEY_SEQUENCE, next).commit()
        return next
    }

    /** true mientras el servicio debería estar corriendo; si el proceso muere sin pasar por stop, queda en true. */
    fun shouldBeRunning(ctx: Context) = prefs(ctx).getBoolean(KEY_SHOULD_RUN, false)
    fun setShouldBeRunning(ctx: Context, value: Boolean) {
        prefs(ctx).edit().putBoolean(KEY_SHOULD_RUN, value).commit()
    }

    fun flag(ctx: Context, name: String, default: Boolean = false) = prefs(ctx).getBoolean("flag_$name", default)
    fun setFlag(ctx: Context, name: String, value: Boolean) {
        prefs(ctx).edit().putBoolean("flag_$name", value).apply()
    }

    // ---- Backend ----

    data class BackendConfig(
        val apiBaseUrl: String,
        val firebaseApiKey: String,
        val refreshToken: String,
        val deviceId: String,
        val appVersion: String,
        val uploadEnabled: Boolean
    )

    fun backendConfig(ctx: Context): BackendConfig? {
        val p = prefs(ctx)
        val url = p.getString(KEY_API_URL, null) ?: return null
        val key = p.getString(KEY_API_KEY, null) ?: return null
        val refresh = p.getString(KEY_REFRESH, null) ?: return null
        val device = p.getString(KEY_DEVICE_ID, null) ?: return null
        return BackendConfig(url, key, refresh, device, appVersion(ctx), p.getBoolean(KEY_UPLOAD, false))
    }

    fun saveBackendConfig(ctx: Context, c: BackendConfig) {
        prefs(ctx).edit()
            .putString(KEY_API_URL, c.apiBaseUrl.trimEnd('/'))
            .putString(KEY_API_KEY, c.firebaseApiKey)
            .putString(KEY_REFRESH, c.refreshToken)
            .putString(KEY_DEVICE_ID, c.deviceId)
            .putString(KEY_APP_VERSION, c.appVersion)
            .putBoolean(KEY_UPLOAD, c.uploadEnabled)
            .apply()
    }

    fun updateRefreshToken(ctx: Context, token: String) {
        prefs(ctx).edit().putString(KEY_REFRESH, token).apply()
    }

    fun clearBackendConfig(ctx: Context) {
        prefs(ctx).edit()
            .remove(KEY_API_URL).remove(KEY_API_KEY).remove(KEY_REFRESH)
            .remove(KEY_DEVICE_ID).remove(KEY_UPLOAD)
            .apply()
    }

    fun appVersion(ctx: Context): String = prefs(ctx).getString(KEY_APP_VERSION, null) ?: "0.8.0"
}

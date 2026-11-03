package com.baprotege.protection

import android.annotation.SuppressLint
import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.net.VpnService
import android.provider.Settings
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject

/**
 * Puente React Native <-> protección nativa. Nombre en JS: "ProtectionModule".
 * Contrato: src/native/ProtectionModule.ts
 */
class ProtectionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener, ProtectionState.Listener {

    companion object {
        private const val REQ_VPN = 7101
        private const val REQ_ADMIN = 7102
        private const val EVENT_STATUS = "ProtectionStatusChanged"
        private const val EVENT_BLOCKED = "ProtectionDomainBlocked"
        private const val EVENT_RECORDED = "ProtectionEventRecorded"
        /** Tiempo en que el guardián de Accesibilidad deja abrir pantallas de permisos que abrió la app. */
        private const val SETTINGS_WINDOW_MS = 90_000L

        /** Campos que JS puede mandar en recordEvent (el resto lo completa EventLog). */
        private val EVENT_FIELDS = listOf("dominio", "origenLista", "permiso", "configuracion", "tipoBypass", "paquete")
    }

    private var pendingVpn: Promise? = null
    private var pendingAdmin: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
        ProtectionState.addListener(this)
    }

    override fun getName() = "ProtectionModule"

    override fun invalidate() {
        reactContext.removeActivityEventListener(this)
        ProtectionState.removeListener(this)
        super.invalidate()
    }

    // ---- Eventos hacia JS ----------------------------------------------------

    private fun emit(event: String, params: WritableMap) {
        if (!reactContext.hasActiveReactInstance()) return
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(event, params)
    }

    override fun onStatusChanged() {
        emit(EVENT_STATUS, Arguments.createMap().apply { putString("status", ProtectionState.status(reactContext)) })
    }

    override fun onDomainBlocked(domain: String, timestamp: Long) {
        emit(EVENT_BLOCKED, Arguments.createMap().apply {
            putString("domain", domain)
            putDouble("timestamp", timestamp.toDouble())
        })
    }

    override fun onEventRecorded(event: JSONObject) = emit(EVENT_RECORDED, jsonToMap(event))

    private fun jsonToMap(o: JSONObject): WritableMap {
        val map = Arguments.createMap()
        val keys = o.keys()
        while (keys.hasNext()) {
            val k = keys.next()
            when (val v = o.get(k)) {
                is String -> map.putString(k, v)
                is Int -> map.putInt(k, v)
                is Long -> map.putDouble(k, v.toDouble())
                is Double -> map.putDouble(k, v)
                is Boolean -> map.putBoolean(k, v)
                else -> map.putString(k, v.toString())
            }
        }
        return map
    }

    // ---- Permisos --------------------------------------------------------------

    @ReactMethod
    fun requestVpnPermission(promise: Promise) {
        val intent = VpnService.prepare(reactContext)
        if (intent == null) { promise.resolve(true); return }
        val activity = reactContext.currentActivity
        if (activity == null) { promise.reject("NO_ACTIVITY", "No hay una Activity en primer plano"); return }
        pendingVpn?.resolve(false)
        pendingVpn = promise
        activity.startActivityForResult(intent, REQ_VPN)
    }

    @ReactMethod
    fun isDeviceAdminActive(promise: Promise) = promise.resolve(ProtectionState.isAdminActive(reactContext))

    @ReactMethod
    fun requestDeviceAdmin(promise: Promise) {
        if (ProtectionState.isAdminActive(reactContext)) { promise.resolve(true); return }
        val activity = reactContext.currentActivity
        if (activity == null) { promise.reject("NO_ACTIVITY", "No hay una Activity en primer plano"); return }
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, ComponentName(reactContext, BaDeviceAdminReceiver::class.java))
            putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "Evita que BA Protege+ se desinstale sin autorización del adulto responsable.")
        }
        ProtectionState.allowSettingsFor(SETTINGS_WINDOW_MS)
        pendingAdmin?.resolve(false)
        pendingAdmin = promise
        activity.startActivityForResult(intent, REQ_ADMIN)
    }

    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) = promise.resolve(SecurityChecks.accessibilityEnabled(reactContext))

    @ReactMethod
    fun openAccessibilitySettings() = openSettings(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))

    @ReactMethod
    fun openVpnSettings() = openSettings(Intent(Settings.ACTION_VPN_SETTINGS))

    @SuppressLint("BatteryLife")
    @ReactMethod
    fun requestIgnoreBatteryOptimizations() {
        if (SecurityChecks.batteryOptimizationIgnored(reactContext)) return
        openSettings(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${reactContext.packageName}")))
    }

    private fun openSettings(intent: Intent) {
        ProtectionState.allowSettingsFor(SETTINGS_WINDOW_MS)
        try {
            reactContext.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (e: Exception) {
            reactContext.startActivity(Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }

    // ---- Protección --------------------------------------------------------------

    @ReactMethod
    fun startProtection(promise: Promise) {
        if (VpnService.prepare(reactContext) != null) {
            promise.reject("VPN_PERMISSION_REQUIRED", "Falta el permiso de VPN")
            return
        }
        val wasEnabled = ProtectionPrefs.isEnabled(reactContext)
        ProtectionPrefs.setEnabled(reactContext, true)   // persistir ANTES de arrancar
        try {
            BlockerVpnService.start(reactContext)
            ProtectionWatchdog.schedule(reactContext)
            if (!wasEnabled) EventLog.record(reactContext, "proteccion_activada", "exitoso")
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("START_FAILED", e)
        }
    }

    @ReactMethod
    fun stopProtection(promise: Promise) {
        val wasEnabled = ProtectionPrefs.isEnabled(reactContext)
        ProtectionPrefs.setEnabled(reactContext, false)  // persistir ANTES de detener
        try {
            BlockerVpnService.stop(reactContext)
            // La UI solo llega acá después del PIN, por eso "exitoso" (desactivación autorizada).
            if (wasEnabled) EventLog.record(reactContext, "proteccion_desactivada", "exitoso")
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STOP_FAILED", e)
        }
        onStatusChanged()
    }

    @ReactMethod
    fun getProtectionStatus(promise: Promise) = promise.resolve(ProtectionState.status(reactContext))

    @ReactMethod
    fun getProtectionDetails(promise: Promise) {
        Blocklist.ensureLoaded(reactContext)
        val ctx = reactContext
        promise.resolve(Arguments.createMap().apply {
            putString("status", ProtectionState.status(ctx))
            putBoolean("enabledByUser", ProtectionPrefs.isEnabled(ctx))
            putBoolean("vpnRunning", ProtectionState.vpnRunning)
            putBoolean("deviceAdminActive", ProtectionState.isAdminActive(ctx))
            putBoolean("accessibilityEnabled", SecurityChecks.accessibilityEnabled(ctx))
            ProtectionPrefs.blocklistVersion(ctx)?.let { putString("blocklistVersion", it) } ?: putNull("blocklistVersion")
            ProtectionPrefs.blocklistHash(ctx)?.let { putString("blocklistHash", it) } ?: putNull("blocklistHash")
            putInt("blocklistCount", ProtectionPrefs.blocklistCount(ctx))
            putInt("customDomainsCount", Blocklist.customCount())
            putInt("pendingEvents", EventLog.pendingCount(ctx))
        })
    }

    @ReactMethod
    fun getSecurityChecks(promise: Promise) {
        val ctx = reactContext
        BypassMonitor.check(ctx)
        promise.resolve(Arguments.createMap().apply {
            val mode = SecurityChecks.privateDnsMode(ctx)
            putString("privateDnsMode", mode)
            putBoolean("privateDnsRisk", mode == "hostname")
            ProtectionState.alwaysOnVpn?.let { putBoolean("alwaysOnVpn", it) } ?: putNull("alwaysOnVpn")
            putBoolean("accessibilityEnabled", SecurityChecks.accessibilityEnabled(ctx))
            putBoolean("deviceAdminActive", ProtectionState.isAdminActive(ctx))
            putBoolean("notificationsEnabled", SecurityChecks.notificationsEnabled(ctx))
            putBoolean("batteryOptimizationIgnored", SecurityChecks.batteryOptimizationIgnored(ctx))
        })
    }

    // ---- Listas ------------------------------------------------------------------

    private fun toList(arr: ReadableArray) = (0 until arr.size()).mapNotNull { arr.getString(it) }

    @ReactMethod
    fun syncBlocklist(domains: ReadableArray, version: String, hash: String?, promise: Promise) {
        try {
            val count = Blocklist.replaceLotba(reactContext, toList(domains), version, hash)
            EventLog.record(reactContext, "sync_lista", "exitoso")
            promise.resolve(count)
            onStatusChanged()
        } catch (e: Exception) {
            promise.reject("SYNC_FAILED", e)
        }
    }

    @ReactMethod
    fun replaceCustomDomains(domains: ReadableArray, promise: Promise) {
        try {
            promise.resolve(Blocklist.replaceCustom(reactContext, toList(domains)))
        } catch (e: Exception) {
            promise.reject("SYNC_FAILED", e)
        }
    }

    @ReactMethod
    fun addCustomBlockedDomain(domain: String, promise: Promise) {
        if (Blocklist.addCustom(reactContext, domain)) promise.resolve(null)
        else promise.reject("INVALID_DOMAIN", "Dominio inválido: $domain")
    }

    @ReactMethod
    fun removeCustomBlockedDomain(domain: String, promise: Promise) {
        Blocklist.removeCustom(reactContext, domain)
        promise.resolve(null)
    }

    // ---- Eventos ------------------------------------------------------------------

    @ReactMethod
    fun recordEvent(input: ReadableMap, promise: Promise) {
        val tipo = input.getString("tipoEvento")
        val resultado = input.getString("resultado")
        if (tipo.isNullOrEmpty() || resultado.isNullOrEmpty()) {
            promise.reject("INVALID_EVENT", "tipoEvento y resultado son obligatorios"); return
        }
        val extras = EVENT_FIELDS.filter { input.hasKey(it) && !input.isNull(it) }.associateWith { input.getString(it) }
        EventLog.record(reactContext, tipo, resultado, extras)
        promise.resolve(null)
    }

    @ReactMethod
    fun getEventHistory(limit: Int, promise: Promise) {
        val arr = Arguments.createArray()
        EventLog.history(reactContext, limit).forEach { arr.pushMap(jsonToMap(it)) }
        promise.resolve(arr)
    }

    @ReactMethod
    fun configureBackend(cfg: ReadableMap, promise: Promise) {
        try {
            ProtectionPrefs.saveBackendConfig(reactContext, ProtectionPrefs.BackendConfig(
                apiBaseUrl = cfg.getString("apiBaseUrl") ?: "",
                firebaseApiKey = cfg.getString("firebaseApiKey") ?: "",
                refreshToken = cfg.getString("refreshToken") ?: "",
                deviceId = cfg.getString("deviceId") ?: "",
                appVersion = cfg.getString("appVersion") ?: "0.8.0",
                uploadEnabled = cfg.hasKey("uploadEnabled") && cfg.getBoolean("uploadEnabled")
            ))
            EventUploader.invalidateToken()
            EventUploader.flushAsync(reactContext)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CONFIG_FAILED", e)
        }
    }

    @ReactMethod
    fun clearBackendConfig(promise: Promise) {
        ProtectionPrefs.clearBackendConfig(reactContext)
        EventUploader.invalidateToken()
        promise.resolve(null)
    }

    @ReactMethod
    fun flushEvents(promise: Promise) {
        EventUploader.flushOn(reactContext) { left -> promise.resolve(left) }
    }

    // Requeridos por NativeEventEmitter (JS usa DeviceEventEmitter).
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    // ---- Resultado de diálogos del sistema ---------------------------------------

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        when (requestCode) {
            REQ_VPN -> { pendingVpn?.resolve(resultCode == Activity.RESULT_OK); pendingVpn = null }
            REQ_ADMIN -> {
                pendingAdmin?.resolve(resultCode == Activity.RESULT_OK && ProtectionState.isAdminActive(reactContext))
                pendingAdmin = null
            }
        }
    }

    override fun onNewIntent(intent: Intent) {}
}

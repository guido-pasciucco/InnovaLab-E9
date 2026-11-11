package com.baprotege.protection

import android.content.Context
import java.io.File

/**
 * Lista de dominios bloqueados: oficial LOTBA (archivo en disco) + personalizada
 * del responsable (SharedPreferences). En memoria como HashSet: consulta O(1).
 *
 * Regla acordada con Backend ("dominio_y_subdominios"): se bloquea el host si es
 * igual a un dominio de la lista o termina en "." + dominio. Así "betmaster.com"
 * bloquea "www.betmaster.com" pero NO "nobetmaster.com".
 */
object Blocklist {
    private const val FILE_NAME = "lotba_blocklist.txt"

    @Volatile private var lotba: Set<String> = emptySet()
    @Volatile private var custom: Set<String> = emptySet()
    @Volatile private var loaded = false

    fun normalize(raw: String): String? {
        var d = raw.trim().lowercase().trimEnd('.')
        if (d.startsWith("www.")) d = d.substring(4)
        if (d.isEmpty() || d.length > 253) return null
        if (!d.all { it.isLetterOrDigit() || it == '-' || it == '.' }) return null
        if (d.startsWith(".") || d.contains("..") || !d.contains('.')) return null
        return d
    }

    @Synchronized
    fun ensureLoaded(ctx: Context) {
        if (loaded) return
        val file = File(ctx.applicationContext.filesDir, FILE_NAME)
        lotba = if (file.exists()) file.readLines().mapNotNull { normalize(it) }.toHashSet() else emptySet()
        custom = ProtectionPrefs.customDomains(ctx).toHashSet()
        loaded = true
    }

    /** Reemplaza la lista LOTBA (escritura atómica) y devuelve cuántos dominios válidos quedaron. */
    @Synchronized
    fun replaceLotba(ctx: Context, domains: List<String>, version: String, hash: String?): Int {
        val clean = domains.mapNotNull { normalize(it) }.toHashSet()
        val app = ctx.applicationContext
        val target = File(app.filesDir, FILE_NAME)
        val tmp = File(app.filesDir, "$FILE_NAME.tmp")
        tmp.writeText(clean.joinToString("\n"))
        if (!tmp.renameTo(target)) {
            target.writeText(clean.joinToString("\n"))
            tmp.delete()
        }
        lotba = clean
        if (!loaded) custom = ProtectionPrefs.customDomains(app).toHashSet()
        loaded = true
        ProtectionPrefs.setBlocklistInfo(app, version, hash, clean.size)
        return clean.size
    }

    @Synchronized
    fun replaceCustom(ctx: Context, domains: List<String>): Int {
        ensureLoaded(ctx)
        custom = domains.mapNotNull { normalize(it) }.toHashSet()
        ProtectionPrefs.setCustomDomains(ctx, custom)
        return custom.size
    }

    @Synchronized
    fun addCustom(ctx: Context, domain: String): Boolean {
        ensureLoaded(ctx)
        val d = normalize(domain) ?: return false
        custom = custom + d
        ProtectionPrefs.setCustomDomains(ctx, custom)
        return true
    }

    @Synchronized
    fun removeCustom(ctx: Context, domain: String) {
        ensureLoaded(ctx)
        val d = normalize(domain) ?: return
        custom = custom - d
        ProtectionPrefs.setCustomDomains(ctx, custom)
    }

    fun customCount(): Int = custom.size

    /** "lotba", "personalizada", "anti_bypass" o null si el host no está bloqueado. */
    fun match(host: String): String? {
        if (AntiBypassList.matches(host)) return "anti_bypass"
        var h = host.lowercase().trimEnd('.')
        val l = lotba
        val c = custom
        while (true) {
            if (h in l) return "lotba"
            if (h in c) return "personalizada"
            val dot = h.indexOf('.')
            if (dot < 0) return null
            h = h.substring(dot + 1)
        }
    }

    fun isBlocked(host: String) = match(host) != null
}

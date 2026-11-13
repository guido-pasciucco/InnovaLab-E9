package com.baprotege.protection

/**
 * Caché corta de respuestas DNS (semana 9: rendimiento). Un navegador consulta
 * los mismos dominios muchas veces seguidas; responder desde memoria evita ir a
 * Internet en cada una. Se guarda 60 s (menos que el TTL típico), máximo 512 entradas.
 *
 * La clave es la pregunta exacta (nombre + tipo + clase). Al responder desde la
 * caché se copia el ID de la consulta nueva, porque el cliente lo usa para
 * emparejar pregunta y respuesta.
 */
object DnsCache {
    private const val TTL_MS = 60_000L
    private const val MAX_ENTRIES = 512

    private class Entry(val response: ByteArray, val expiresAt: Long)

    private val map = object : LinkedHashMap<String, Entry>(64, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Entry>?) = size > MAX_ENTRIES
    }

    private fun key(query: ByteArray): String? {
        val end = DnsPacket.questionEnd(query) ?: return null
        val sb = StringBuilder()
        for (i in 12 until end) {
            val b = query[i].toInt() and 0xFF
            val lower = if (b in 0x41..0x5A) b + 0x20 else b // DNS no distingue mayúsculas
            sb.append(lower.toString(16)).append('.')
        }
        return sb.toString()
    }

    @Synchronized
    fun get(query: ByteArray): ByteArray? {
        val k = key(query) ?: return null
        val e = map[k] ?: return null
        if (System.currentTimeMillis() > e.expiresAt) { map.remove(k); return null }
        val end = DnsPacket.questionEnd(query) ?: return null
        val copy = e.response.copyOf()
        copy[0] = query[0]; copy[1] = query[1] // ID de la consulta actual
        // Copiamos también la pregunta tal cual vino (algunos clientes varían mayúsculas a propósito).
        if (copy.size >= end) System.arraycopy(query, 12, copy, 12, end - 12)
        return copy
    }

    @Synchronized
    fun put(query: ByteArray, response: ByteArray) {
        val rc = DnsPacket.rcode(response)
        if ((rc != 0 && rc != 3) || DnsPacket.isTruncated(response)) return
        val k = key(query) ?: return
        map[k] = Entry(response.copyOf(), System.currentTimeMillis() + TTL_MS)
    }

    @Synchronized
    fun clear() = map.clear()
}

package com.baprotege.protection

/**
 * Utilidades mínimas para leer una consulta DNS y fabricar respuestas.
 * Formato: RFC 1035. Solo se interpreta la primera pregunta.
 */
object DnsPacket {

    /** Devuelve el nombre consultado ("www.ejemplo.com") o null si el paquete no es una consulta válida. */
    fun queryName(dns: ByteArray): String? {
        if (dns.size < 12) return null
        val flags = dns[2].toInt() and 0xFF
        if (flags and 0x80 != 0) return null            // es una respuesta, no una consulta
        val qdCount = ((dns[4].toInt() and 0xFF) shl 8) or (dns[5].toInt() and 0xFF)
        if (qdCount < 1) return null

        var i = 12
        val sb = StringBuilder()
        while (true) {
            if (i >= dns.size) return null
            val len = dns[i].toInt() and 0xFF
            if (len == 0) break
            if (len and 0xC0 != 0) return null          // compresión: no esperable en la pregunta
            i++
            if (i + len > dns.size) return null
            if (sb.isNotEmpty()) sb.append('.')
            sb.append(String(dns, i, len, Charsets.US_ASCII))
            i += len
        }
        return sb.toString().lowercase()
    }

    /** Índice donde termina la primera pregunta (nombre + QTYPE + QCLASS), o null si está malformada. */
    fun questionEnd(dns: ByteArray): Int? {
        if (dns.size < 12) return null
        var i = 12
        while (true) {
            if (i >= dns.size) return null
            val len = dns[i].toInt() and 0xFF
            if (len == 0) break
            if (len and 0xC0 != 0) return null
            i += len + 1
        }
        val end = i + 1 + 4
        return if (end > dns.size) null else end
    }

    /** Código de respuesta (0 = NOERROR, 3 = NXDOMAIN, ...). */
    fun rcode(dns: ByteArray): Int = if (dns.size < 4) -1 else dns[3].toInt() and 0x0F

    /** true si la respuesta vino truncada (TC): el cliente reintentaría por TCP, que no soportamos. */
    fun isTruncated(dns: ByteArray): Boolean = dns.size >= 3 && (dns[2].toInt() and 0x02) != 0

    /** Respuesta NXDOMAIN ("ese dominio no existe") a la consulta recibida. null si la consulta está malformada. */
    fun nxdomain(query: ByteArray): ByteArray? {
        val end = questionEnd(query) ?: return null

        val resp = query.copyOfRange(0, end)
        // byte 2: QR=1 | opcode y RD copiados de la consulta
        resp[2] = (0x80 or (query[2].toInt() and 0x79)).toByte()
        // byte 3: RA=1, RCODE=3 (NXDOMAIN)
        resp[3] = (0x80 or 0x03).toByte()
        // ANCOUNT, NSCOUNT, ARCOUNT = 0 (descartamos registros adicionales como EDNS)
        for (k in 6..11) resp[k] = 0
        return resp
    }
}

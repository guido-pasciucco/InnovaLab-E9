package com.baprotege.protection

/** Armado de paquetes IPv4 + UDP para devolver respuestas DNS por la interfaz TUN. */
object IpUdp {

    fun u16(b: ByteArray, off: Int) = ((b[off].toInt() and 0xFF) shl 8) or (b[off + 1].toInt() and 0xFF)

    fun buildUdpPacket(
        srcIp: ByteArray, dstIp: ByteArray,
        srcPort: Int, dstPort: Int,
        payload: ByteArray
    ): ByteArray {
        val ipHeaderLen = 20
        val udpLen = 8 + payload.size
        val total = ipHeaderLen + udpLen
        val p = ByteArray(total)

        p[0] = 0x45.toByte()                       // IPv4, IHL=5
        p[2] = (total shr 8).toByte(); p[3] = total.toByte()
        p[6] = 0x40.toByte()                       // flag Don't Fragment
        p[8] = 64                                  // TTL
        p[9] = 17                                  // protocolo UDP
        System.arraycopy(srcIp, 0, p, 12, 4)
        System.arraycopy(dstIp, 0, p, 16, 4)
        val csum = checksum(p, 0, ipHeaderLen)
        p[10] = (csum shr 8).toByte(); p[11] = csum.toByte()

        p[20] = (srcPort shr 8).toByte(); p[21] = srcPort.toByte()
        p[22] = (dstPort shr 8).toByte(); p[23] = dstPort.toByte()
        p[24] = (udpLen shr 8).toByte(); p[25] = udpLen.toByte()
        // checksum UDP = 0: válido en IPv4 ("sin checksum")
        System.arraycopy(payload, 0, p, 28, payload.size)
        return p
    }

    fun checksum(b: ByteArray, off: Int, len: Int): Int {
        var sum = 0L
        var i = off
        val end = off + len
        while (i + 1 < end) {
            sum += ((b[i].toInt() and 0xFF) shl 8) or (b[i + 1].toInt() and 0xFF)
            i += 2
        }
        if (i < end) sum += (b[i].toInt() and 0xFF) shl 8
        while (sum shr 16 != 0L) sum = (sum and 0xFFFF) + (sum shr 16)
        return (sum.inv() and 0xFFFF).toInt()
    }
}

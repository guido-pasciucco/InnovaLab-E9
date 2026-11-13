package com.baprotege.protection

import android.app.Notification
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Filtro de sitios por DNS usando VpnService (ver explicación en la Semana 4).
 *
 * Novedades Semanas 5-8:
 *  - Al bloquear: evento `acceso_bloqueado` (con origenLista lotba/personalizada)
 *    + notificación que abre nuestra pantalla de sitio bloqueado. Para no
 *    inundar, un mismo dominio se registra como máximo una vez por minuto
 *    (ventana de deduplicación propuesta por Data Analytics).
 *  - Persistencia: watchdog programado, detección de "proceso terminado" y de
 *    "VPN siempre activa".
 *  - Anti-bypass: chequeo de DNS privado ante cada cambio de red; al ser
 *    revocada, distingue otra VPN (`vpn_externa`) de un permiso quitado.
 *  - Detección de instalaciones riesgosas (InstallMonitor).
 */
class BlockerVpnService : VpnService() {

    companion object {
        private const val TAG = "BlockerVpnService"
        const val ACTION_START = "com.baprotege.protection.START"
        const val ACTION_STOP = "com.baprotege.protection.STOP"
        const val EXTRA_FROM_BOOT = "fromBoot"

        private const val NOTIFICATION_ID = 1001
        private const val DEDUP_WINDOW_MS = 60_000L
        /** Intentos de usar DNS cifrado: se registran como evento como mucho cada 6 h por servidor. */
        private const val BYPASS_DEDUP_MS = 6 * 60 * 60 * 1000L

        private const val VPN_ADDRESS = "10.111.222.1"
        private val FAKE_DNS = byteArrayOf(10, 111, 222.toByte(), 2)
        private const val FAKE_DNS_STR = "10.111.222.2"
        /** Respaldo si no se puede leer el DNS de la red (semana 9: antes eran los únicos). */
        private val FALLBACK_DNS = listOf("8.8.8.8", "1.1.1.1")

        fun startIntent(ctx: Context, fromBoot: Boolean = false) =
            Intent(ctx, BlockerVpnService::class.java).setAction(ACTION_START).putExtra(EXTRA_FROM_BOOT, fromBoot)
        fun stopIntent(ctx: Context) = Intent(ctx, BlockerVpnService::class.java).setAction(ACTION_STOP)

        fun start(ctx: Context, fromBoot: Boolean = false) =
            ContextCompat.startForegroundService(ctx, startIntent(ctx, fromBoot))
        fun stop(ctx: Context) { ctx.startService(stopIntent(ctx)) }
    }

    private var tun: ParcelFileDescriptor? = null
    private var reader: Thread? = null
    @Volatile private var running = false
    private var pool: ExecutorService? = null
    private val lastBlocked = ConcurrentHashMap<String, Long>()
    private var installMonitor: InstallMonitor? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    /** DNS de la red real (Wi-Fi / datos), leído al iniciar y en cada cambio de red. */
    @Volatile private var upstreamDns: List<InetAddress> = emptyList()

    override fun onCreate() {
        super.onCreate()
        Notifier.ensureChannels(this)
        registerMonitors()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopVpn(clean = true)
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        // Con startForegroundService(), Android exige startForeground() en pocos segundos.
        showForegroundNotification()

        if (!ProtectionPrefs.isEnabled(this)) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        val fromBoot = intent?.getBooleanExtra(EXTRA_FROM_BOOT, false) ?: false
        // intent == null: Android nos reinició solo (START_STICKY) tras matar el proceso.
        if (!running) startVpn(processWasKilled = !fromBoot && ProtectionPrefs.shouldBeRunning(this))
        return START_STICKY
    }

    private fun startVpn(processWasKilled: Boolean) {
        Blocklist.ensureLoaded(this)
        val builder = Builder()
            .setSession("BA Protege+")
            .addAddress(VPN_ADDRESS, 32)
            .addDnsServer(FAKE_DNS_STR)
            .addRoute(FAKE_DNS_STR, 32)   // SOLO el DNS falso pasa por la VPN
            .setBlocking(true)

        val fd = try { builder.establish() } catch (e: Exception) {
            L.e(TAG, "establish() falló", e); null
        }
        if (fd == null) {
            ProtectionState.setVpnRunning(false)
            Notifier.protectionDown(this)
            stopSelf()
            return
        }

        tun = fd
        running = true
        pool = Executors.newFixedThreadPool(6)
        reader = Thread({ readLoop(fd) }, "ba-protege-vpn-reader").also { it.start() }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ProtectionState.alwaysOnVpn = isAlwaysOn
        if (processWasKilled) {
            // El servicio debía estar corriendo y el proceso murió sin pasar por stop
            // (típico de fabricantes que matan apps en segundo plano).
            EventLog.record(this, "intento_bypass", "detectado", mapOf("tipoBypass" to "proceso_terminado"))
        }
        ProtectionPrefs.setShouldBeRunning(this, true)
        ProtectionState.setVpnRunning(true)
        ProtectionWatchdog.schedule(this)
        BypassMonitor.check(this)
        L.i(TAG, "VPN iniciada")
    }

    private fun registerMonitors() {
        // Instalaciones (Semana 8).
        installMonitor = InstallMonitor().also { r ->
            val filter = IntentFilter(Intent.ACTION_PACKAGE_ADDED).apply { addDataScheme("package") }
            ContextCompat.registerReceiver(this, r, filter, ContextCompat.RECEIVER_EXPORTED)
        }
        // Cambios de red (Wi-Fi <-> datos, reconexiones): actualizar el DNS real y
        // re-chequear el DNS privado. Semana 9: se escuchan las redes reales (no la VPN).
        try {
            val cm = getSystemService(ConnectivityManager::class.java)
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .addCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN)
                .build()
            val cb = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) = onNetworkChanged()
                override fun onLost(network: Network) = onNetworkChanged()
                override fun onLinkPropertiesChanged(network: Network, lp: LinkProperties) = onNetworkChanged()
            }
            cm.registerNetworkCallback(request, cb)
            networkCallback = cb
        } catch (e: Exception) {
            L.w(TAG, "no se pudo registrar el callback de red: ${e.message}")
        }
        refreshUpstreamDns()
    }

    private fun onNetworkChanged() {
        refreshUpstreamDns()
        DnsCache.clear() // otra red puede resolver distinto (ej. portal cautivo)
        BypassMonitor.check(applicationContext)
        EventUploader.flushAsync(applicationContext) // volvió la red: subir lo pendiente
    }

    /** Lee los servidores DNS de las redes reales, sin incluir el DNS falso de la VPN. */
    @Suppress("DEPRECATION")
    private fun refreshUpstreamDns() {
        try {
            val cm = getSystemService(ConnectivityManager::class.java)
            val servers = mutableListOf<InetAddress>()
            for (n in cm.allNetworks) {
                val caps = cm.getNetworkCapabilities(n) ?: continue
                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) continue
                if (!caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) continue
                cm.getLinkProperties(n)?.dnsServers?.forEach { addr ->
                    if (addr.hostAddress != FAKE_DNS_STR && addr !in servers) servers.add(addr)
                }
            }
            upstreamDns = servers
            L.i(TAG, "DNS de la red: $servers")
        } catch (e: Exception) {
            L.w(TAG, "no se pudo leer el DNS de la red: ${e.message}")
        }
    }

    private fun unregisterMonitors() {
        installMonitor?.let { try { unregisterReceiver(it) } catch (_: Exception) {} }
        installMonitor = null
        networkCallback?.let {
            try { getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(it) } catch (_: Exception) {}
        }
        networkCallback = null
    }

    private fun readLoop(fd: ParcelFileDescriptor) {
        val input = FileInputStream(fd.fileDescriptor)
        val output = FileOutputStream(fd.fileDescriptor)
        val buf = ByteArray(32767)
        try {
            while (running) {
                val n = input.read(buf)
                if (n <= 0) continue
                handlePacket(buf.copyOf(n), output)
            }
        } catch (e: Exception) {
            if (running) L.w(TAG, "readLoop terminó: ${e.message}")
        }
    }

    private fun handlePacket(p: ByteArray, output: FileOutputStream) {
        if (p.size < 28) return
        if ((p[0].toInt() shr 4) and 0xF != 4) return          // solo IPv4
        val ihl = (p[0].toInt() and 0xF) * 4
        if (p[9].toInt() != 17) return                         // solo UDP
        if (p.size < ihl + 8) return
        if (!(p[16] == FAKE_DNS[0] && p[17] == FAKE_DNS[1] && p[18] == FAKE_DNS[2] && p[19] == FAKE_DNS[3])) return

        val srcPort = IpUdp.u16(p, ihl)
        val dstPort = IpUdp.u16(p, ihl + 2)
        if (dstPort != 53) return

        val udpLen = IpUdp.u16(p, ihl + 4)
        val start = ihl + 8
        val len = minOf(udpLen - 8, p.size - start)
        if (len <= 0) return

        val clientIp = p.copyOfRange(12, 16)
        val dns = p.copyOfRange(start, start + len)

        pool?.execute {
            try {
                val name = DnsPacket.queryName(dns)
                val origin = if (name != null) Blocklist.match(name) else null
                val response: ByteArray? =
                    if (name != null && origin != null) {
                        onBlocked(name, origin)
                        DnsPacket.nxdomain(dns)
                    } else {
                        forward(dns)
                    }
                if (response != null) {
                    val packet = IpUdp.buildUdpPacket(FAKE_DNS, clientIp, 53, srcPort, response)
                    synchronized(output) { output.write(packet) }
                }
            } catch (e: Exception) {
                L.w(TAG, "error resolviendo consulta: ${e.message}")
            }
        }
    }

    /** Registra y avisa, como máximo una vez por minuto por dominio. */
    private fun onBlocked(host: String, origin: String) {
        val domain = host.removePrefix("www.")
        val now = System.currentTimeMillis()
        val last = lastBlocked[domain]
        val window = if (origin == "anti_bypass") BYPASS_DEDUP_MS else DEDUP_WINDOW_MS
        if (last != null && now - last < window) return
        lastBlocked[domain] = now

        if (origin == "anti_bypass") {
            // Alguien configuró un DNS cifrado (navegador o "DNS privado"): lo frenamos sin
            // mostrar la pantalla de "sitio bloqueado", y se registra como intento de evasión.
            L.i(TAG, "DNS cifrado frenado: $domain")
            EventLog.record(this, "intento_bypass", "bloqueado", mapOf("tipoBypass" to "dns_privado", "dominio" to domain))
            return
        }
        L.i(TAG, "BLOQUEADO: $domain ($origin)")
        EventLog.record(this, "acceso_bloqueado", "bloqueado", mapOf("dominio" to domain, "origenLista" to origin))
        Notifier.blocked(this, domain)
        ProtectionState.notifyDomainBlocked(domain)
    }

    /**
     * Reenvía la consulta a un DNS real por un socket "protegido" (que NO vuelve a
     * entrar a la VPN). Semana 9: primero la caché, después el DNS de la red real
     * (funciona en redes que bloquean 8.8.8.8, como escuelas u oficinas) y por
     * último los públicos.
     */
    private fun forward(query: ByteArray): ByteArray? {
        DnsCache.get(query)?.let { return it }
        val servers = upstreamDns + FALLBACK_DNS.map { InetAddress.getByName(it) }
        for (addr in servers) {
            try {
                DatagramSocket().use { socket ->
                    protect(socket)
                    socket.soTimeout = 2500
                    socket.send(DatagramPacket(query, query.size, addr, 53))
                    val buf = ByteArray(4096)
                    val resp = DatagramPacket(buf, buf.size)
                    socket.receive(resp)
                    val answer = buf.copyOf(resp.length)
                    DnsCache.put(query, answer)
                    return answer
                }
            } catch (e: Exception) {
                L.w(TAG, "DNS ${addr.hostAddress} no respondió: ${e.message}")
            }
        }
        return null
    }

    private fun stopVpn(clean: Boolean) {
        running = false
        try { tun?.close() } catch (_: Exception) {}
        tun = null
        reader?.interrupt()
        reader = null
        pool?.shutdownNow()
        pool = null
        if (clean) ProtectionPrefs.setShouldBeRunning(this, false)
        ProtectionState.setVpnRunning(false)
    }

    /** Nos quitaron la VPN: desde Ajustes, o porque se activó otra VPN. */
    override fun onRevoke() {
        L.w(TAG, "VPN revocada")
        stopVpn(clean = true)
        val app = applicationContext
        if (ProtectionPrefs.isEnabled(app)) {
            // Esperamos un poco: si aparece otra VPN, fue reemplazada (vpn_externa).
            Thread {
                try { Thread.sleep(3000) } catch (_: InterruptedException) {}
                if (SecurityChecks.anyVpnActive(app)) {
                    EventLog.record(app, "intento_bypass", "detectado", mapOf("tipoBypass" to "vpn_externa"))
                } else {
                    EventLog.record(app, "cambio_permiso", "detectado", mapOf("permiso" to "vpn"))
                }
                Notifier.protectionDown(app)
            }.start()
        }
        // enabled sigue en true: el estado queda "inactive" (caída) y la UI ofrece reactivar.
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        super.onRevoke()
    }

    override fun onDestroy() {
        // Si el sistema nos destruye sin stop explícito, shouldBeRunning queda en true (proceso_terminado).
        stopVpn(clean = false)
        unregisterMonitors()
        super.onDestroy()
    }

    private fun showForegroundNotification() {
        Notifier.ensureChannels(this)
        val notification: Notification = NotificationCompat.Builder(this, Notifier.CHANNEL_SERVICE)
            .setContentTitle("BA Protege+")
            .setContentText("Protección activa")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }
}

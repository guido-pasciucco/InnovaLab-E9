package com.baprotege.protection

/**
 * Anti-bypass por DNS (semana 9).
 *
 * El "DNS seguro" de los navegadores (DoH) y el "DNS privado" de Android (DoT)
 * mandan las consultas cifradas a un servidor externo y esquivan nuestro filtro.
 * Pero para encontrar ese servidor, primero tienen que resolver su NOMBRE
 * (ej. "dns.google") con el DNS normal... que es el nuestro. Si respondemos
 * "no existe", el navegador vuelve al DNS del sistema (o, en el caso del DNS
 * privado estricto, se queda sin Internet hasta que lo desactiven).
 *
 * Además, "use-application-dns.net" es el dominio "canario" oficial de Firefox:
 * si no existe, Firefox desactiva su DNS seguro automático.
 *
 * Límite: no sirve contra DoH configurado por IP (ej. https://1.1.1.1/dns-query)
 * ni contra apps de VPN. Eso se detecta por otros medios (InstallMonitor, onRevoke).
 */
object AntiBypassList {
    private val HOSTS: Set<String> = hashSetOf(
        // Canario de Firefox
        "use-application-dns.net",
        // Google
        "dns.google", "dns.google.com", "dns64.dns.google",
        // Cloudflare
        "cloudflare-dns.com", "one.one.one.one", "1dot1dot1dot1.cloudflare-dns.com",
        "mozilla.cloudflare-dns.com", "chrome.cloudflare-dns.com", "security.cloudflare-dns.com",
        "family.cloudflare-dns.com",
        // Quad9
        "dns.quad9.net", "dns9.quad9.net", "dns10.quad9.net", "dns11.quad9.net", "dns12.quad9.net",
        // Cisco OpenDNS
        "doh.opendns.com", "dns.opendns.com", "doh.familyshield.opendns.com",
        // AdGuard, NextDNS, CleanBrowsing, Mullvad, Control D, otros
        "dns.adguard.com", "dns.adguard-dns.com", "dns-family.adguard.com", "family.adguard-dns.com", "unfiltered.adguard-dns.com",
        "dns.nextdns.io", "chrome.dns.nextdns.io", "firefox.dns.nextdns.io",
        "doh.cleanbrowsing.org", "security-filter-dns.cleanbrowsing.org", "family-filter-dns.cleanbrowsing.org",
        "dns.mullvad.net", "doh.mullvad.net", "adblock.dns.mullvad.net",
        "dns.controld.com", "freedns.controld.com",
        "doh.dns.sb", "dns.alidns.com", "doh.pub", "dot.pub", "dns.twnic.tw"
    )

    /** true si el host es (o es subdominio de) un servidor de DNS cifrado conocido. */
    fun matches(host: String): Boolean {
        var h = host.lowercase().trimEnd('.')
        while (true) {
            if (h in HOSTS) return true
            val dot = h.indexOf('.')
            if (dot < 0) return false
            h = h.substring(dot + 1)
        }
    }
}

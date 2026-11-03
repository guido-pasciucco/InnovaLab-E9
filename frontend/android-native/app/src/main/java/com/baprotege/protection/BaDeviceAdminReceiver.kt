package com.baprotege.protection

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

/**
 * Device Admin: mientras esté activo, Android obliga a desactivarlo (con aviso)
 * antes de poder desinstalar la app. Si lo desactivan con la protección
 * encendida, se registra como intento de evasión (`device_admin_desactivado`).
 *
 * Nota (pregunta de Backend): Google marcó como obsoletas algunas políticas de
 * Device Admin, pero la "barrera para desinstalar" sigue funcionando. Lo
 * mantenemos en el catálogo y lo combinamos con Accesibilidad + foreground service.
 */
class BaDeviceAdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) = ProtectionState.notifyStatusChanged()

    override fun onDisabled(context: Context, intent: Intent) {
        if (ProtectionPrefs.isEnabled(context)) {
            EventLog.record(context, "intento_bypass", "detectado", mapOf("tipoBypass" to "device_admin_desactivado"))
        }
        ProtectionState.notifyStatusChanged()
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence =
        "Si desactivás el administrador, BA Protege+ podría desinstalarse y el adulto responsable va a recibir un aviso."
}

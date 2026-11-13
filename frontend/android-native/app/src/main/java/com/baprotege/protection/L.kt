package com.baprotege.protection

import android.util.Log
import com.baprotege.BuildConfig

/**
 * Logs del módulo nativo (semana 10, seguridad): los mensajes informativos y de
 * advertencia incluyen dominios bloqueados y eventos, que son datos sensibles
 * del menor. Solo se escriben en builds de desarrollo (debug); en el build
 * release solo quedan los errores, sin datos personales.
 */
object L {
    fun i(tag: String, msg: String) {
        if (BuildConfig.DEBUG) Log.i(tag, msg)
    }

    fun w(tag: String, msg: String, tr: Throwable? = null) {
        if (BuildConfig.DEBUG) Log.w(tag, msg, tr)
    }

    fun e(tag: String, msg: String, tr: Throwable? = null) {
        Log.e(tag, msg, tr)
    }
}

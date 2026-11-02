package com.baprotege.protection

import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import android.net.VpnService
import android.util.Log

/**
 * "Perro guardián" (Semana 6: persistencia frente a cierres). Android lo despierta
 * cada ~15 minutos (mínimo permitido), aunque la app esté cerrada, y:
 *  1. si la protección debería estar encendida y no lo está, intenta reactivarla;
 *     si Android no lo permite, avisa con una notificación;
 *  2. corre los chequeos anti-evasión;
 *  3. sube los eventos pendientes a Backend.
 * Sobrevive a reinicios (setPersisted), por eso usa RECEIVE_BOOT_COMPLETED.
 */
class ProtectionWatchdog : JobService() {

    companion object {
        private const val TAG = "ProtectionWatchdog"
        private const val JOB_ID = 4242

        fun schedule(ctx: Context) {
            val js = ctx.getSystemService(JobScheduler::class.java)
            if (js.getPendingJob(JOB_ID) != null) return
            val job = JobInfo.Builder(JOB_ID, ComponentName(ctx, ProtectionWatchdog::class.java))
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(true)
                .build()
            js.schedule(job)
        }

        fun cancel(ctx: Context) {
            ctx.getSystemService(JobScheduler::class.java).cancel(JOB_ID)
        }

        fun runChecks(ctx: Context) {
            if (!ProtectionPrefs.isEnabled(ctx)) return
            if (!ProtectionState.vpnRunning) {
                if (VpnService.prepare(ctx) == null) {
                    try {
                        BlockerVpnService.start(ctx)
                        Log.i(TAG, "protección reactivada por el watchdog")
                    } catch (e: Exception) {
                        // Android 12+ puede prohibir iniciar servicios en primer plano desde segundo plano.
                        Log.w(TAG, "no se pudo reactivar: ${e.message}")
                        Notifier.protectionDown(ctx)
                    }
                } else {
                    Notifier.protectionDown(ctx) // falta el permiso de VPN: hace falta abrir la app
                }
            }
            BypassMonitor.check(ctx)
            EventUploader.flushAsync(ctx)
        }
    }

    override fun onStartJob(params: JobParameters): Boolean {
        Thread {
            try { runChecks(applicationContext) } catch (e: Exception) { Log.w(TAG, "chequeo falló", e) }
            jobFinished(params, false)
        }.start()
        return true
    }

    override fun onStopJob(params: JobParameters) = true
}

package com.baprotege.protection

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Almacenamiento cifrado (semana 10, seguridad).
 *
 * Antes, el refresh token de la sesión anónima del dispositivo (que permite
 * actuar como ese dispositivo frente a Backend) se guardaba en texto plano.
 * Ahora se cifra con AES-256-GCM usando una clave que vive en el Android
 * Keystore: la clave nunca sale del hardware/sistema y no se puede copiar
 * junto con los archivos de la app.
 *
 * Lo usan ProtectionPrefs (refresh token del uploader) y la app JS (sesión de
 * Firebase) a través de ProtectionModule.secureGet/secureSet.
 */
object SecureStore {
    private const val ALIAS = "baprotege_secure_key"
    private const val PREFS = "ba_protege_secure"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"

    @Synchronized
    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generator.generateKey()
    }

    fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val iv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP)
        val data = Base64.encodeToString(cipher.doFinal(plain.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
        return "$iv:$data"
    }

    /** null si el texto no es un valor cifrado válido (o la clave cambió). */
    fun decrypt(stored: String): String? = try {
        val parts = stored.split(":", limit = 2)
        if (parts.size != 2) null else {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)))
            String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8)
        }
    } catch (e: Exception) {
        L.w("SecureStore", "no se pudo descifrar un valor guardado")
        null
    }

    private fun prefs(ctx: Context) = ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun put(ctx: Context, key: String, value: String) {
        prefs(ctx).edit().putString(key, encrypt(value)).apply()
    }

    fun get(ctx: Context, key: String): String? = prefs(ctx).getString(key, null)?.let { decrypt(it) }

    fun remove(ctx: Context, key: String) {
        prefs(ctx).edit().remove(key).apply()
    }
}

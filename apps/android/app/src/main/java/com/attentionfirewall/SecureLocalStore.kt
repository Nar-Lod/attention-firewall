package com.attentionfirewall

import android.content.Context
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecureLocalStore(private val context: Context) {
    companion object {
        private const val STORE = "attention_firewall_secure"
        private const val KEY_ALIAS = "attention_firewall_local_key_v1"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val MAX_VALUE_BYTES = 512_000
    }

    private val preferences by lazy {
        context.getSharedPreferences(STORE, Context.MODE_PRIVATE)
    }

    fun put(key: String, value: String) {
        require(key.length in 1..128)
        val plaintext = value.toByteArray(StandardCharsets.UTF_8)
        require(plaintext.size <= MAX_VALUE_BYTES) { "secure value exceeds size limit" }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val iv = ByteArray(12).also { java.security.SecureRandom().nextBytes(it) }
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
        val ciphertext = cipher.doFinal(plaintext)
        val packed = Base64.encodeToString(iv + ciphertext, Base64.NO_WRAP)
        check(preferences.edit().putString(key, packed).commit()) { "secure local write failed" }
    }

    fun get(key: String): String? {
        require(key.length in 1..128)
        val packed = preferences.getString(key, null) ?: return null
        val bytes = Base64.decode(packed, Base64.NO_WRAP)
        require(bytes.size > 12 && bytes.size <= MAX_VALUE_BYTES + 12 + 32) { "invalid secure local value" }
        val iv = bytes.copyOfRange(0, 12)
        val ciphertext = bytes.copyOfRange(12, bytes.size)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
        return String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8)
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val existing = keyStore.getKey(KEY_ALIAS, null) as? SecretKey
        if (existing != null) return existing

        return KeyGenerator.getInstance("AES", "AndroidKeyStore").apply {
            init(
                android.security.keystore.KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    android.security.keystore.KeyProperties.PURPOSE_ENCRYPT or
                        android.security.keystore.KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE)
                    .build()
            )
        }.generateKey()
    }
}

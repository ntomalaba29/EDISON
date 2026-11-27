package io.github.malaba29.edison.tv

import android.util.Base64
import org.json.JSONObject
import java.io.IOException
import java.net.URI
import java.net.URL
import javax.net.ssl.HttpsURLConnection

data class TvEnrollmentSession(
    val enrollmentId: String,
    val deviceId: String,
    val pairingCode: String,
    val deviceToken: String,
    val pairingExpiresAt: String,
    val approvalUrl: String
)

data class TvEnrollmentStatus(
    val status: String,
    val deviceId: String
)

class TvEnrollmentHttpException(
    val statusCode: Int,
    message: String
) : IOException(message)

class TvEnrollmentClient(
    private val apiBaseUrl: String = BuildConfig.EDISON_API_BASE_URL
) {
    fun rotate(session: TvEnrollmentSession): TvEnrollmentSession {
        val response = request(
            path = "/api/tv/enrollment/${session.enrollmentId}/rotate",
            method = "POST",
            bearerToken = session.deviceToken
        )
        val deviceToken = response.getString("deviceToken")
        if (!deviceToken.matches(Regex("[A-Za-z0-9_-]{40,64}"))) {
            throw IOException("The enrollment service returned an invalid rotated device credential.")
        }
        return session.copy(deviceToken = deviceToken)
    }

    fun start(deviceLabel: String): TvEnrollmentSession {
        val response = request(
            path = "/api/tv/enrollment/start",
            method = "POST",
            body = JSONObject().put("deviceLabel", deviceLabel)
        )
        val approvalUrl = response.getString("approvalUrl")
        validateApprovalUrl(approvalUrl)
        val pairingCode = response.getString("pairingCode")
        if (!pairingCode.matches(Regex("\\d{8}"))) {
            throw IOException("The enrollment service returned an invalid pairing code.")
        }
        val deviceToken = response.getString("deviceToken")
        if (!deviceToken.matches(Regex("[A-Za-z0-9_-]{40,64}"))) {
            throw IOException("The enrollment service returned an invalid device credential.")
        }
        return TvEnrollmentSession(
            enrollmentId = response.getString("enrollmentId"),
            deviceId = response.getString("deviceId"),
            pairingCode = pairingCode,
            deviceToken = deviceToken,
            pairingExpiresAt = response.getString("pairingExpiresAt"),
            approvalUrl = approvalUrl
        )
    }

    fun status(session: TvEnrollmentSession): TvEnrollmentStatus {
        val response = request(
            path = "/api/tv/enrollment/${session.enrollmentId}",
            method = "GET",
            bearerToken = session.deviceToken
        )
        val status = response.getString("status")
        if (status !in setOf("pending", "approved", "expired", "locked", "revoked")) {
            throw IOException("The enrollment service returned an unknown status.")
        }
        return TvEnrollmentStatus(status, response.optString("deviceId", session.deviceId))
    }

    private fun request(
        path: String,
        method: String,
        body: JSONObject? = null,
        bearerToken: String? = null
    ): JSONObject {
        val connection = (URL("$apiBaseUrl$path").openConnection() as? HttpsURLConnection)
            ?: throw IOException("The EDISON API must use HTTPS.")
        try {
            connection.requestMethod = method
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.setRequestProperty("Accept", "application/json")
            bearerToken?.let {
                connection.setRequestProperty("Authorization", "Bearer $it")
            }
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { output ->
                    output.write(body.toString().toByteArray(Charsets.UTF_8))
                }
            }

            val statusCode = connection.responseCode
            val stream = if (statusCode in 200..299) connection.inputStream else connection.errorStream
            val responseText = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val response = try {
                JSONObject(responseText)
            } catch (_: Exception) {
                throw IOException("The EDISON API returned an unreadable response (HTTP $statusCode).")
            }
            if (statusCode !in 200..299) {
                val message = response.optString(
                    "message",
                    response.optString("error", "EDISON request failed (HTTP $statusCode).")
                )
                throw TvEnrollmentHttpException(statusCode, message)
            }
            return response
        } finally {
            connection.disconnect()
        }
    }

    private fun validateApprovalUrl(value: String) {
        val base = URI.create(apiBaseUrl)
        val approval = URI.create(value)
        if (
            approval.scheme != "https" ||
            !approval.host.equals(base.host, ignoreCase = true) ||
            approval.port != base.port ||
            approval.rawUserInfo != null ||
            approval.rawQuery != null ||
            approval.rawPath != "/" ||
            !approval.rawFragment.orEmpty().startsWith("tv-enroll?")
        ) {
            throw IOException("The enrollment service returned an unsafe approval link.")
        }
    }
}

class TvCredentialStore(context: android.content.Context) {
    private val preferences = context.getSharedPreferences(
        PREFERENCES_NAME,
        android.content.Context.MODE_PRIVATE
    )

    fun save(session: TvEnrollmentSession) {
        val cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, encryptionKey())
        val payload = JSONObject()
            .put("enrollmentId", session.enrollmentId)
            .put("deviceId", session.deviceId)
            .put("pairingCode", session.pairingCode)
            .put("deviceToken", session.deviceToken)
            .put("pairingExpiresAt", session.pairingExpiresAt)
            .put("approvalUrl", session.approvalUrl)
            .toString()
            .toByteArray(Charsets.UTF_8)
        val ciphertext = cipher.doFinal(payload)
        val saved = preferences.edit()
            .putString(KEY_IV, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .putString(KEY_CIPHERTEXT, Base64.encodeToString(ciphertext, Base64.NO_WRAP))
            .commit()
        if (!saved) throw IOException("Unable to securely save the TV enrollment session.")
    }

    fun load(): TvEnrollmentSession? {
        val ivValue = preferences.getString(KEY_IV, null)
        val ciphertextValue = preferences.getString(KEY_CIPHERTEXT, null)
        if (ivValue == null && ciphertextValue == null) return null
        if (ivValue == null || ciphertextValue == null) {
            throw IOException("The saved TV enrollment session is incomplete.")
        }
        val cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(
            javax.crypto.Cipher.DECRYPT_MODE,
            encryptionKey(),
            javax.crypto.spec.GCMParameterSpec(
                GCM_TAG_LENGTH_BITS,
                Base64.decode(ivValue, Base64.NO_WRAP)
            )
        )
        val payload = cipher.doFinal(Base64.decode(ciphertextValue, Base64.NO_WRAP))
        val json = JSONObject(String(payload, Charsets.UTF_8))
        return TvEnrollmentSession(
            enrollmentId = json.getString("enrollmentId"),
            deviceId = json.getString("deviceId"),
            pairingCode = json.getString("pairingCode"),
            deviceToken = json.getString("deviceToken"),
            pairingExpiresAt = json.getString("pairingExpiresAt"),
            approvalUrl = json.getString("approvalUrl")
        )
    }

    fun clear() {
        if (!preferences.edit().clear().commit()) {
            throw IOException("Unable to remove the saved TV enrollment session.")
        }
        val keyStore = java.security.KeyStore.getInstance(ANDROID_KEY_STORE)
        keyStore.load(null)
        if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS)
    }

    private fun encryptionKey(): java.security.Key {
        val keyStore = java.security.KeyStore.getInstance(ANDROID_KEY_STORE)
        keyStore.load(null)
        val existingKey = keyStore.getKey(KEY_ALIAS, null)
        if (existingKey != null) return existingKey

        val generator = javax.crypto.KeyGenerator.getInstance(
            android.security.keystore.KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEY_STORE
        )
        generator.init(
            android.security.keystore.KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                android.security.keystore.KeyProperties.PURPOSE_ENCRYPT or
                    android.security.keystore.KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build()
        )
        return generator.generateKey()
    }

    companion object {
        private const val ANDROID_KEY_STORE = "AndroidKeyStore"
        private const val KEY_ALIAS = "edison_tv_enrollment"
        private const val PREFERENCES_NAME = "edison_tv_credentials"
        private const val KEY_IV = "session_iv"
        private const val KEY_CIPHERTEXT = "session_ciphertext"
        private const val GCM_TAG_LENGTH_BITS = 128
    }
}

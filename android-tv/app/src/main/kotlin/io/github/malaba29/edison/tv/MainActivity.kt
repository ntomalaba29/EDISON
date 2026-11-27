package io.github.malaba29.edison.tv

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import java.io.IOException
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private var shellState: TvShellState = TvShellState.SetupRequired
    private var adSessionState: AdSessionState = AdSessionState.Idle
    private var playbackWasStarted = false
    private var enrollmentSession: TvEnrollmentSession? = null
    private var isActive = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private val enrollmentClient by lazy { TvEnrollmentClient() }
    private val credentialStore by lazy { TvCredentialStore(this) }

    private lateinit var statusView: TextView
    private lateinit var messageView: TextView
    private lateinit var playbackStatusView: TextView
    private lateinit var qrImageView: ImageView
    private lateinit var pairingCodeView: TextView
    private lateinit var connectButton: Button
    private var pollRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(48), dp(28), dp(48), dp(28))
            setBackgroundColor(Color.rgb(13, 17, 23))
        }

        val heading = TextView(this).apply {
            text = getString(R.string.app_name)
            textSize = 22f
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(235, 241, 247))
        }
        root.addView(heading, matchWidth())

        statusView = TextView(this).apply {
            textSize = 14f
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(255, 211, 128))
        }
        root.addView(statusView, withTopMargin(dp(8)))

        messageView = TextView(this).apply {
            text = getString(R.string.setup_message)
            textSize = 22f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }
        root.addView(messageView, withTopMargin(dp(10)))

        qrImageView = ImageView(this).apply {
            contentDescription = getString(R.string.enrollment_instructions)
            visibility = View.GONE
            scaleType = ImageView.ScaleType.FIT_CENTER
        }
        root.addView(qrImageView, LinearLayout.LayoutParams(dp(220), dp(220)).apply {
            topMargin = dp(12)
        })

        pairingCodeView = TextView(this).apply {
            textSize = 30f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            visibility = View.GONE
        }
        root.addView(pairingCodeView, withTopMargin(dp(4)))

        playbackStatusView = TextView(this).apply {
            textSize = 16f
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(190, 202, 215))
        }
        root.addView(playbackStatusView, withTopMargin(dp(8)))

        connectButton = createActionButton(getString(R.string.connect_tv))
        connectButton.setOnClickListener {
            val existingSession = enrollmentSession
            if (existingSession != null) {
                showEnrollmentSession(existingSession)
                scheduleStatusPoll(0)
            } else {
                beginEnrollment()
            }
        }
        root.addView(connectButton, withTopMargin(dp(16)))

        val exitButton = createActionButton(getString(R.string.exit_app))
        exitButton.setOnClickListener { finish() }
        root.addView(exitButton, withTopMargin(dp(8)))

        setContentView(root)
        renderShellState(shellState)
        connectButton.post { connectButton.requestFocus() }
        loadSavedSession()
    }

    private fun loadSavedSession() {
        try {
            enrollmentSession = credentialStore.load()
            enrollmentSession?.let(::showEnrollmentSession)
        } catch (error: Exception) {
            showSetupError(
                error.message ?: getString(R.string.enrollment_unavailable)
            )
        }
    }

    private fun beginEnrollment() {
        connectButton.isEnabled = false
        shellState = TvShellState.Loading
        renderShellState(shellState)
        ioExecutor.execute {
            try {
                val session = enrollmentClient.start(deviceLabel())
                credentialStore.save(session)
                runOnUiThread {
                    if (isFinishing || isDestroyed) return@runOnUiThread
                    enrollmentSession = session
                    showEnrollmentSession(session)
                    scheduleStatusPoll(0)
                }
            } catch (error: Exception) {
                runOnUiThread {
                    if (isFinishing || isDestroyed) return@runOnUiThread
                    showSetupError(error.message ?: getString(R.string.enrollment_unavailable))
                }
            }
        }
    }

    private fun showEnrollmentSession(session: TvEnrollmentSession) {
        try {
            qrImageView.setImageBitmap(createQrBitmap(session.approvalUrl))
            qrImageView.visibility = View.VISIBLE
            pairingCodeView.text = session.pairingCode
            pairingCodeView.visibility = View.VISIBLE
            connectButton.text = getString(R.string.resume_tv_setup)
            connectButton.isEnabled = true
            shellState = TvShellState.EnrollmentPending
            renderShellState(shellState)
        } catch (error: Exception) {
            showSetupError(error.message ?: getString(R.string.enrollment_unavailable))
        }
    }

    private fun scheduleStatusPoll(delayMs: Long) {
        if (!isActive || enrollmentSession == null) return
        pollRunnable?.let(mainHandler::removeCallbacks)
        val task = Runnable {
            val session = enrollmentSession ?: return@Runnable
            ioExecutor.execute {
                try {
                    val result = enrollmentClient.status(session)
                    runOnUiThread {
                        if (isFinishing || isDestroyed || enrollmentSession != session) {
                            return@runOnUiThread
                        }
                        when (result.status) {
                            "pending" -> {
                                shellState = TvShellState.EnrollmentPending
                                renderShellState(shellState)
                                scheduleStatusPoll(3_000)
                            }
                            "approved" -> showApprovedState()
                            "expired", "locked", "revoked" -> clearExpiredSession()
                        }
                    }
                } catch (error: Exception) {
                    if (error is TvEnrollmentHttpException && error.statusCode == 401) {
                        recoverCredential(session)
                        return@execute
                    }
                    runOnUiThread {
                        if (isFinishing || isDestroyed || enrollmentSession != session) {
                            return@runOnUiThread
                        }
                        statusView.text = getString(R.string.state_error)
                        messageView.text =
                            error.message ?: getString(R.string.enrollment_unavailable)
                        scheduleStatusPoll(5_000)
                    }
                }
            }
        }
        pollRunnable = task
        mainHandler.postDelayed(task, delayMs)
    }

    private fun showApprovedState() {
        shellState = TvShellState.Enrolled
        qrImageView.visibility = View.GONE
        pairingCodeView.visibility = View.GONE
        connectButton.isEnabled = false
        renderShellState(shellState)
    }

    private fun clearExpiredSession() {
        try {
            credentialStore.clear()
            enrollmentSession = null
            qrImageView.visibility = View.GONE
            pairingCodeView.visibility = View.GONE
            connectButton.text = getString(R.string.connect_tv)
            connectButton.isEnabled = true
            shellState = TvShellState.Error(canRetry = true)
            renderShellState(shellState)
            messageView.text = getString(R.string.enrollment_expired)
        } catch (error: IOException) {
            showSetupError(error.message ?: getString(R.string.enrollment_unavailable))
        }
    }

    private fun recoverCredential(session: TvEnrollmentSession) {
        try {
            val rotated = enrollmentClient.rotate(session)
            credentialStore.save(rotated)
            runOnUiThread {
                if (isFinishing || isDestroyed) return@runOnUiThread
                enrollmentSession = rotated
                showEnrollmentSession(rotated)
                scheduleStatusPoll(0)
            }
        } catch (_: Exception) {
            runOnUiThread {
                if (isFinishing || isDestroyed) return@runOnUiThread
                clearExpiredSession()
            }
        }
    }

    private fun showSetupError(message: String) {
        shellState = TvShellState.Error(canRetry = true)
        qrImageView.visibility = View.GONE
        pairingCodeView.visibility = View.GONE
        connectButton.text = getString(R.string.connect_tv)
        connectButton.isEnabled = true
        renderShellState(shellState)
        messageView.text = message
    }

    private fun renderShellState(state: TvShellState) {
        when (state) {
            TvShellState.Loading -> {
                statusView.text = getString(R.string.state_loading)
                messageView.text = getString(R.string.loading_message)
                playbackStatusView.text = getString(R.string.playback_unavailable)
            }
            TvShellState.SetupRequired -> {
                statusView.text = getString(R.string.setup_required)
                messageView.text = getString(R.string.setup_message)
                playbackStatusView.text = getString(R.string.playback_unavailable)
            }
            TvShellState.EnrollmentPending -> {
                statusView.text = getString(R.string.enrollment_pending)
                messageView.text = getString(R.string.enrollment_instructions)
                playbackStatusView.text = getString(R.string.playback_unavailable)
            }
            TvShellState.Enrolled -> {
                statusView.text = getString(R.string.enrolled)
                messageView.text = getString(R.string.enrolled_message)
                playbackStatusView.text = getString(R.string.playback_unavailable)
            }
            TvShellState.Empty -> {
                statusView.text = getString(R.string.state_empty)
                messageView.text = getString(R.string.empty_message)
                playbackStatusView.text = getString(R.string.playback_unavailable)
            }
            is TvShellState.Error -> {
                statusView.text = getString(R.string.state_error)
                if (messageView.text.isNullOrEmpty()) {
                    messageView.text = getString(R.string.error_message)
                }
                playbackStatusView.text = getString(R.string.playback_unavailable)
            }
            TvShellState.Ready -> {
                statusView.text = getString(R.string.state_ready)
                messageView.text = getString(R.string.ready_message)
                playbackStatusView.text = getString(R.string.playback_not_started)
            }
        }
    }

    private fun createQrBitmap(value: String): Bitmap {
        val matrix = QRCodeWriter().encode(
            value,
            BarcodeFormat.QR_CODE,
            512,
            512,
            mapOf(EncodeHintType.MARGIN to 1)
        )
        return Bitmap.createBitmap(matrix.width, matrix.height, Bitmap.Config.RGB_565).also { bitmap ->
            for (x in 0 until matrix.width) {
                for (y in 0 until matrix.height) {
                    bitmap.setPixel(x, y, if (matrix[x, y]) Color.BLACK else Color.WHITE)
                }
            }
        }
    }

    private fun deviceLabel(): String {
        val model = "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}".trim()
        return model.takeIf { it.length >= 2 }?.take(80) ?: "Android TV"
    }

    private fun createActionButton(label: String) = Button(this).apply {
        text = label
        isAllCaps = false
        textSize = 18f
        setTextColor(Color.WHITE)
        setPadding(dp(28), dp(10), dp(28), dp(10))
        setBackgroundResource(R.drawable.tv_action_background)
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density + 0.5f).toInt()

    private fun matchWidth() = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
    )

    private fun withTopMargin(margin: Int) = matchWidth().apply {
        topMargin = margin
    }

    override fun onResume() {
        super.onResume()
        isActive = true
        if (enrollmentSession != null) scheduleStatusPoll(0)
    }

    override fun onPause() {
        isActive = false
        pollRunnable?.let(mainHandler::removeCallbacks)
        super.onPause()
        if (lifecycleActionFor(shellState, isStopStartLifecycle = true)
            is TvLifecycleAction.StopPlayback
        ) {
            playbackWasStarted = false
        }
    }

    override fun onDestroy() {
        pollRunnable?.let(mainHandler::removeCallbacks)
        ioExecutor.shutdownNow()
        if (playbackWasStarted) {
            playbackWasStarted = false
        }
        super.onDestroy()
    }
}

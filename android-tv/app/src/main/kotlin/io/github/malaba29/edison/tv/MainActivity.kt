package io.github.malaba29.edison.tv

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private var shellState: TvShellState = TvShellState.SetupRequired
    private var playbackWasStarted = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(48), dp(36), dp(48), dp(36))
            setBackgroundColor(Color.rgb(13, 17, 23))
        }

        val heading = TextView(this).apply {
            text = getString(R.string.app_name)
            textSize = 22f
            setTextColor(Color.rgb(235, 241, 247))
        }
        root.addView(heading, matchWidth())

        val status = TextView(this).apply {
            textSize = 14f
            setTextColor(Color.rgb(255, 211, 128))
        }
        root.addView(status, withTopMargin(dp(12)))

        val message = TextView(this).apply {
            text = getString(R.string.setup_message)
            textSize = 28f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER_VERTICAL
        }
        root.addView(message, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1f
        ))

        val playbackStatus = TextView(this).apply {
            textSize = 18f
            setTextColor(Color.rgb(190, 202, 215))
        }
        root.addView(playbackStatus, withBottomMargin(dp(24)))

        val exitButton = Button(this).apply {
            text = getString(R.string.exit_app)
            isAllCaps = false
            textSize = 18f
            setTextColor(Color.WHITE)
            setPadding(dp(28), dp(14), dp(28), dp(14))
            setBackgroundResource(R.drawable.tv_action_background)
            setOnClickListener { finish() }
        }
        root.addView(exitButton, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))

        setContentView(root)
        renderShellState(shellState, status, message, playbackStatus)
        exitButton.post { exitButton.requestFocus() }
    }

    private fun renderShellState(
        state: TvShellState,
        status: TextView,
        message: TextView,
        playbackStatus: TextView
    ) {
        when (state) {
            TvShellState.Loading -> {
                status.text = getString(R.string.state_loading)
                message.text = getString(R.string.loading_message)
                playbackStatus.text = getString(R.string.playback_unavailable)
            }
            TvShellState.SetupRequired -> {
                status.text = getString(R.string.setup_required)
                message.text = getString(R.string.setup_message)
                playbackStatus.text = getString(R.string.playback_unavailable)
            }
            TvShellState.Empty -> {
                status.text = getString(R.string.state_empty)
                message.text = getString(R.string.empty_message)
                playbackStatus.text = getString(R.string.playback_unavailable)
            }
            is TvShellState.Error -> {
                status.text = getString(R.string.state_error)
                message.text = getString(R.string.error_message)
                playbackStatus.text = getString(R.string.playback_unavailable)
            }
            TvShellState.Ready -> {
                status.text = getString(R.string.state_ready)
                message.text = getString(R.string.ready_message)
                playbackStatus.text = getString(R.string.playback_not_started)
            }
        }
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

    private fun withBottomMargin(margin: Int) = matchWidth().apply {
        bottomMargin = margin
    }

    override fun onPause() {
        super.onPause()
        if (lifecycleActionFor(shellState, isStopStartLifecycle = true)
            is TvLifecycleAction.StopPlayback
        ) {
            playbackWasStarted = false
        }
    }

    override fun onDestroy() {
        if (playbackWasStarted) {
            playbackWasStarted = false
        }
        super.onDestroy()
    }
}

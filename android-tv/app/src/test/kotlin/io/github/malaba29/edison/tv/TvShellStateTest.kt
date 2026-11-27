package io.github.malaba29.edison.tv

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class TvShellStateTest {
    @Test
    fun watchdogRestoresOnlyWithVerifiedRestoration() {
        val playing = AdSessionState.Playing("session-watchdog")

        assertEquals(
            AdWatchdogDecision.Retain,
            adWatchdogDecision(playing, elapsedMs = 1000, deadlineMs = 30000,
                restorationVerified = false, interruption = false)
        )
        assertEquals(
            AdWatchdogDecision.RestoreBroadcast("watchdog_deadline"),
            adWatchdogDecision(playing, elapsedMs = 30000, deadlineMs = 30000,
                restorationVerified = true, interruption = false)
        )
        assertEquals(
            AdWatchdogDecision.RestorationFailed("deadline_unverified"),
            adWatchdogDecision(playing, elapsedMs = 30000, deadlineMs = 30000,
                restorationVerified = false, interruption = false)
        )
    }

    @Test
    fun watchdogInterruptionsFailClosedWithoutVerifiedRestoration() {
        val paused = AdSessionState.Paused("session-watchdog")

        assertEquals(
            AdWatchdogDecision.RestoreBroadcast("interruption"),
            adWatchdogDecision(paused, elapsedMs = 100, deadlineMs = 30000,
                restorationVerified = true, interruption = true)
        )
        assertEquals(
            AdWatchdogDecision.RestorationFailed("interruption_unverified"),
            adWatchdogDecision(paused, elapsedMs = 100, deadlineMs = 30000,
                restorationVerified = false, interruption = true)
        )
        assertEquals(
            AdWatchdogDecision.Retain,
            adWatchdogDecision(AdSessionState.Idle, elapsedMs = 100, deadlineMs = 30000,
                restorationVerified = false, interruption = true)
        )
    }

    @Test
    fun lifecycleEventRequiresAnActiveSessionState() {
        assertEquals(
            null,
            lifecycleEventFor(AdSessionState.Idle, AdLifecycleEventType.STARTED)
        )

        val loading = AdSessionState.Loading("session-a")
        assertEquals(
            AdLifecycleEvent("session-a", AdLifecycleEventType.STARTED),
            lifecycleEventFor(loading, AdLifecycleEventType.STARTED)
        )
    }

    @Test
    fun lifecycleEventRejectsInvalidSessionAndReasonIdentifiers() {
        assertThrows(IllegalArgumentException::class.java) {
            AdLifecycleEvent("bad", AdLifecycleEventType.COMPLETED)
        }
        assertThrows(IllegalArgumentException::class.java) {
            AdLifecycleEvent(
                "session-valid",
                AdLifecycleEventType.FAILED,
                "bad reason with spaces"
            )
        }
    }

    @Test
    fun adSessionRejectsStaleAndReplayActions() {
        var state: AdSessionState = AdSessionState.Idle
        state = reduceAdSessionState(state, AdSessionAction.Authorize("session-a"))
        state = reduceAdSessionState(state, AdSessionAction.Load("session-a"))
        state = reduceAdSessionState(state, AdSessionAction.Start("session-a"))

        assertEquals(
            AdSessionState.Playing("session-a"),
            state
        )
        assertEquals(
            AdSessionState.Playing("session-a"),
            reduceAdSessionState(state, AdSessionAction.Start("session-a"))
        )
        assertEquals(
            AdSessionState.Playing("session-a"),
            reduceAdSessionState(state, AdSessionAction.Start("session-b"))
        )
    }

    @Test
    fun adSessionLifecycleEndsOnlyFromActivePlayback() {
        val loading = reduceAdSessionState(
            AdSessionState.AwaitingAuthorization("session-a"),
            AdSessionAction.Load("session-a")
        )
        val playing = reduceAdSessionState(loading, AdSessionAction.Start("session-a"))
        val paused = reduceAdSessionState(playing, AdSessionAction.Pause("session-a"))
        val resumed = reduceAdSessionState(paused, AdSessionAction.Resume("session-a"))
        val completed = reduceAdSessionState(resumed, AdSessionAction.Complete("session-a"))

        assertEquals(AdSessionState.Completed("session-a"), completed)
        assertEquals(
            AdSessionState.Completed("session-a"),
            reduceAdSessionState(completed, AdSessionAction.Fail("session-a", "late_failure"))
        )
    }

    @Test
    fun credentialRecoveryExceptionPreservesHttpStatus() {
        val exception = TvEnrollmentHttpException(
            statusCode = 401,
            message = "TV device credential is invalid."
        )

        assertEquals(401, exception.statusCode)
    }

    @Test
    fun playbackIsNeverStartedFromNonReadyStates() {
        val nonReadyStates = listOf(
            TvShellState.Loading,
            TvShellState.SetupRequired,
            TvShellState.EnrollmentPending,
            TvShellState.Enrolled,
            TvShellState.Empty,
            TvShellState.Error(canRetry = true),
            TvShellState.Error(canRetry = false)
        )

        assertTrue(nonReadyStates.all { it != TvShellState.Ready })
    }

    @Test
    fun readyStateIsTheOnlySuccessfulPlaybackBoundary() {
        assertEquals(TvShellState.Ready, TvShellState.Ready)
        assertNotEquals(TvShellState.SetupRequired, TvShellState.Ready)
    }

    @Test
    fun errorStateRecordsWhetherRetryIsAvailable() {
        assertTrue(TvShellState.Error(canRetry = true).canRetry)
        assertFalse(TvShellState.Error(canRetry = false).canRetry)
    }

    @Test
    fun stopStartLifecycleRetainsPlaybackForNonReadyStates() {
        val nonReadyStates = listOf(
            TvShellState.Loading,
            TvShellState.SetupRequired,
            TvShellState.EnrollmentPending,
            TvShellState.Enrolled,
            TvShellState.Empty,
            TvShellState.Error(canRetry = true)
        )

        assertTrue(nonReadyStates.all {
            lifecycleActionFor(it, isStopStartLifecycle = true) is TvLifecycleAction.Retain
        })
    }

    @Test
    fun stopStartLifecycleStopsOnlyAReadyPlayback() {
        assertEquals(
            TvLifecycleAction.StopPlayback,
            lifecycleActionFor(TvShellState.Ready, isStopStartLifecycle = true)
        )
        assertEquals(
            TvLifecycleAction.Retain,
            lifecycleActionFor(TvShellState.Ready, isStopStartLifecycle = false)
        )
    }
}

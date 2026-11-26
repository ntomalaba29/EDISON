package io.github.malaba29.edison.tv

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TvShellStateTest {
    @Test
    fun playbackIsNeverStartedFromNonReadyStates() {
        val nonReadyStates = listOf(
            TvShellState.Loading,
            TvShellState.SetupRequired,
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

package io.github.malaba29.edison.tv

sealed interface TvShellState {
    data object Loading : TvShellState
    data object SetupRequired : TvShellState
    data object EnrollmentPending : TvShellState
    data object Enrolled : TvShellState
    data object Empty : TvShellState
    data class Error(val canRetry: Boolean) : TvShellState
    data object Ready : TvShellState
}

sealed interface TvLifecycleAction {
    data object Retain : TvLifecycleAction
    data object StopPlayback : TvLifecycleAction
}

fun lifecycleActionFor(state: TvShellState, isStopStartLifecycle: Boolean): TvLifecycleAction =
    if (isStopStartLifecycle && state == TvShellState.Ready) {
        TvLifecycleAction.StopPlayback
    } else {
        TvLifecycleAction.Retain
    }

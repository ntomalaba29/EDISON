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

sealed interface AdSessionState {
    data object Idle : AdSessionState
    data class AwaitingAuthorization(val sessionId: String) : AdSessionState
    data class Loading(val sessionId: String) : AdSessionState
    data class Playing(val sessionId: String) : AdSessionState
    data class Paused(val sessionId: String) : AdSessionState
    data class Completed(val sessionId: String) : AdSessionState
    data class Failed(val sessionId: String, val reasonCode: String) : AdSessionState
    data class Aborted(val sessionId: String, val reasonCode: String) : AdSessionState
}

sealed interface AdSessionAction {
    data class Authorize(val sessionId: String) : AdSessionAction
    data class Load(val sessionId: String) : AdSessionAction
    data class Start(val sessionId: String) : AdSessionAction
    data class Pause(val sessionId: String) : AdSessionAction
    data class Resume(val sessionId: String) : AdSessionAction
    data class Complete(val sessionId: String) : AdSessionAction
    data class Fail(val sessionId: String, val reasonCode: String) : AdSessionAction
    data class Abort(val sessionId: String, val reasonCode: String) : AdSessionAction
    data object Reset : AdSessionAction
}

fun sessionIdFor(state: AdSessionState): String? = when (state) {
    is AdSessionState.AwaitingAuthorization -> state.sessionId
    is AdSessionState.Loading -> state.sessionId
    is AdSessionState.Playing -> state.sessionId
    is AdSessionState.Paused -> state.sessionId
    is AdSessionState.Completed -> state.sessionId
    is AdSessionState.Failed -> state.sessionId
    is AdSessionState.Aborted -> state.sessionId
    AdSessionState.Idle -> null
}

fun reduceAdSessionState(
    state: AdSessionState,
    action: AdSessionAction
): AdSessionState {
    if (action is AdSessionAction.Reset) return AdSessionState.Idle
    val actionSessionId = when (action) {
        is AdSessionAction.Authorize -> action.sessionId
        is AdSessionAction.Load -> action.sessionId
        is AdSessionAction.Start -> action.sessionId
        is AdSessionAction.Pause -> action.sessionId
        is AdSessionAction.Resume -> action.sessionId
        is AdSessionAction.Complete -> action.sessionId
        is AdSessionAction.Fail -> action.sessionId
        is AdSessionAction.Abort -> action.sessionId
        AdSessionAction.Reset -> return AdSessionState.Idle
    }
    if (sessionIdFor(state) != null && sessionIdFor(state) != actionSessionId) return state

    return when (action) {
        is AdSessionAction.Authorize ->
            if (state == AdSessionState.Idle) AdSessionState.AwaitingAuthorization(action.sessionId) else state
        is AdSessionAction.Load ->
            if (state is AdSessionState.AwaitingAuthorization && state.sessionId == action.sessionId)
                AdSessionState.Loading(action.sessionId) else state
        is AdSessionAction.Start ->
            if (state is AdSessionState.Loading && state.sessionId == action.sessionId)
                AdSessionState.Playing(action.sessionId) else state
        is AdSessionAction.Pause ->
            if (state is AdSessionState.Playing && state.sessionId == action.sessionId)
                AdSessionState.Paused(action.sessionId) else state
        is AdSessionAction.Resume ->
            if (state is AdSessionState.Paused && state.sessionId == action.sessionId)
                AdSessionState.Playing(action.sessionId) else state
        is AdSessionAction.Complete ->
            if (state is AdSessionState.Playing && state.sessionId == action.sessionId)
                AdSessionState.Completed(action.sessionId) else state
        is AdSessionAction.Fail ->
            if (state is AdSessionState.Loading ||
                state is AdSessionState.Playing ||
                state is AdSessionState.Paused)
                AdSessionState.Failed(action.sessionId, action.reasonCode) else state
        is AdSessionAction.Abort ->
            if (state is AdSessionState.AwaitingAuthorization ||
                state is AdSessionState.Loading ||
                state is AdSessionState.Playing ||
                state is AdSessionState.Paused)
                AdSessionState.Aborted(action.sessionId, action.reasonCode) else state
        AdSessionAction.Reset -> AdSessionState.Idle
    }
}

enum class AdLifecycleEventType {
    READY,
    STARTED,
    PAUSED,
    RESUMED,
    COMPLETED,
    FAILED,
    ABORTED,
    TIMEOUT
}

data class AdLifecycleEvent(
    val sessionId: String,
    val eventType: AdLifecycleEventType,
    val reasonCode: String? = null
) {
    init {
        require(sessionId.matches(Regex("[A-Za-z0-9._-]{8,128}"))) {
            "Ad lifecycle session ID is invalid."
        }
        if (reasonCode != null) {
            require(reasonCode.matches(Regex("[A-Za-z0-9._-]{1,64}"))) {
                "Ad lifecycle reason code is invalid."
            }
        }
    }
}

fun lifecycleEventFor(
    state: AdSessionState,
    eventType: AdLifecycleEventType,
    reasonCode: String? = null
): AdLifecycleEvent? {
    val sessionId = sessionIdFor(state) ?: return null
    val allowed = when (eventType) {
        AdLifecycleEventType.READY ->
            state is AdSessionState.AwaitingAuthorization
        AdLifecycleEventType.STARTED ->
            state is AdSessionState.Loading
        AdLifecycleEventType.PAUSED ->
            state is AdSessionState.Playing
        AdLifecycleEventType.RESUMED ->
            state is AdSessionState.Paused
        AdLifecycleEventType.COMPLETED ->
            state is AdSessionState.Playing
        AdLifecycleEventType.FAILED,
        AdLifecycleEventType.ABORTED,
        AdLifecycleEventType.TIMEOUT ->
            state is AdSessionState.Loading ||
                state is AdSessionState.Playing ||
                state is AdSessionState.Paused ||
                state is AdSessionState.AwaitingAuthorization
    }
    return if (allowed) AdLifecycleEvent(sessionId, eventType, reasonCode) else null
}

sealed interface AdWatchdogDecision {
    data object Retain : AdWatchdogDecision
    data class RestoreBroadcast(val reasonCode: String) : AdWatchdogDecision
    data class RestorationFailed(val reasonCode: String) : AdWatchdogDecision
}

fun adWatchdogDecision(
    state: AdSessionState,
    elapsedMs: Long,
    deadlineMs: Long,
    restorationVerified: Boolean,
    interruption: Boolean
): AdWatchdogDecision {
    require(elapsedMs >= 0 && deadlineMs > 0) {
        "Watchdog timing values are invalid."
    }
    val active = state is AdSessionState.Loading ||
        state is AdSessionState.Playing ||
        state is AdSessionState.Paused
    if (!active) return AdWatchdogDecision.Retain
    if (interruption) {
        return if (restorationVerified) {
            AdWatchdogDecision.RestoreBroadcast("interruption")
        } else {
            AdWatchdogDecision.RestorationFailed("interruption_unverified")
        }
    }
    if (elapsedMs >= deadlineMs) {
        return if (restorationVerified) {
            AdWatchdogDecision.RestoreBroadcast("watchdog_deadline")
        } else {
            AdWatchdogDecision.RestorationFailed("deadline_unverified")
        }
    }
    return AdWatchdogDecision.Retain
}

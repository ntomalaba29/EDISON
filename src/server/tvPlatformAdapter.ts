import crypto from 'node:crypto';
import type {
  SimulatedTvDeviceState,
  TvFaultSimulationMode,
  TvInputSource,
  TvPlatformCapabilityProfile,
  TvPlatformId,
  TvRemoteCommand,
  TvRemoteDispatchResult,
} from '../types/edison.ts';

export const ALL_TV_PLATFORM_IDS: readonly TvPlatformId[] = [
  'simulation_tv',
  'android_tv_tif',
  'samsung_tizen',
  'lg_webos',
] as const;

export const ALL_TV_REMOTE_COMMANDS: readonly TvRemoteCommand[] = [
  'power_toggle',
  'volume_up',
  'volume_down',
  'mute_toggle',
  'channel_up',
  'channel_down',
  'input_source_select',
  'dpad_up',
  'dpad_down',
  'dpad_left',
  'dpad_right',
  'dpad_ok',
  'back',
  'home',
] as const;

export const ALL_TV_FAULT_MODES: readonly TvFaultSimulationMode[] = [
  'none',
  'adapter_timeout',
  'hdcp_blocked',
  'decoder_crash',
  'network_drop',
] as const;

export interface TvPlatformAdapter {
  getCapabilityProfile(): TvPlatformCapabilityProfile;
  executeNormalRemoteCommand(
    state: SimulatedTvDeviceState,
    command: TvRemoteCommand,
    options?: {
      targetInput?: TvInputSource;
      faultMode?: TvFaultSimulationMode;
    }
  ): {
    ok: boolean;
    watchdogTriggered: boolean;
    restorationOutcome: 'not_needed' | 'restored_to_ordinary_tv' | 'command_rejected_safely';
    nextState: SimulatedTvDeviceState;
    detail: string;
  };
}

function cloneTvState(state: SimulatedTvDeviceState): SimulatedTvDeviceState {
  return { ...state };
}

function applyWatchdogRestoration(
  state: SimulatedTvDeviceState,
  faultMode: TvFaultSimulationMode,
  nowIso: string
): {
  nextState: SimulatedTvDeviceState;
  detail: string;
} {
  const next = cloneTvState(state);
  const targetOrdinaryInput = next.previousOrdinaryInput || 'LIVE_TUNER';
  next.adBreakOverlayActive = false;
  next.activeInput = targetOrdinaryInput;
  next.ordinaryTvIntact = true;
  next.lastRestoredAt = nowIso;

  const reasonMap: Record<Exclude<TvFaultSimulationMode, 'none'>, string> = {
    adapter_timeout: 'Adapter execution timed out — watchdog safely exited ad overlay and restored ordinary TV.',
    hdcp_blocked: 'HDCP/DRM protected surface detected — EDISON refused frame interception and preserved ordinary TV.',
    decoder_crash: 'Ad decoder fault injected — watchdog isolated crash and restored ordinary live TV input.',
    network_drop: 'Network outage injected — EDISON aborted break overlay without interrupting ordinary TV viewing.',
  };

  return {
    nextState: next,
    detail:
      faultMode === 'none'
        ? `Restored ordinary TV input (${targetOrdinaryInput}) cleanly.`
        : reasonMap[faultMode],
  };
}

function executeStandardRemoteMutation(
  profile: TvPlatformCapabilityProfile,
  prev: SimulatedTvDeviceState,
  command: TvRemoteCommand,
  options?: {
    targetInput?: TvInputSource;
    faultMode?: TvFaultSimulationMode;
  }
): {
  ok: boolean;
  watchdogTriggered: boolean;
  restorationOutcome: 'not_needed' | 'restored_to_ordinary_tv' | 'command_rejected_safely';
  nextState: SimulatedTvDeviceState;
  detail: string;
} {
  const nowIso = new Date().toISOString();
  const faultMode = options?.faultMode ?? 'none';

  if (faultMode !== 'none') {
    const restored = applyWatchdogRestoration(prev, faultMode, nowIso);
    return {
      ok: false,
      watchdogTriggered: true,
      restorationOutcome: 'restored_to_ordinary_tv',
      nextState: restored.nextState,
      detail: `[${profile.displayName}] ${restored.detail}`,
    };
  }

  if (!profile.supportedRemoteCommands.includes(command)) {
    return {
      ok: false,
      watchdogTriggered: false,
      restorationOutcome: 'command_rejected_safely',
      nextState: cloneTvState(prev),
      detail: `[${profile.displayName}] Command "${command}" is not permitted by this platform's capability profile.`,
    };
  }

  if (!prev.powerOn && command !== 'power_toggle') {
    return {
      ok: false,
      watchdogTriggered: false,
      restorationOutcome: 'command_rejected_safely',
      nextState: cloneTvState(prev),
      detail: `[${profile.displayName}] TV is in standby; ignored "${command}" safely without altering tuner state.`,
    };
  }

  const next = cloneTvState(prev);
  next.ordinaryTvIntact = true;

  switch (command) {
    case 'power_toggle': {
      next.powerOn = !prev.powerOn;
      if (!next.powerOn) {
        next.adBreakOverlayActive = false;
      }
      return {
        ok: true,
        watchdogTriggered: false,
        restorationOutcome: 'not_needed',
        nextState: next,
        detail: `[${profile.displayName}] Power toggled ${next.powerOn ? 'ON' : 'STANDBY'}.`,
      };
    }
    case 'volume_up': {
      next.volume = Math.min(100, prev.volume + 4);
      next.muted = false;
      return {
        ok: true,
        watchdogTriggered: false,
        restorationOutcome: 'not_needed',
        nextState: next,
        detail: `[${profile.displayName}] Volume increased to ${next.volume}.`,
      };
    }
    case 'volume_down': {
      next.volume = Math.max(0, prev.volume - 4);
      return {
        ok: true,
        watchdogTriggered: false,
        restorationOutcome: 'not_needed',
        nextState: next,
        detail: `[${profile.displayName}] Volume decreased to ${next.volume}.`,
      };
    }
    case 'mute_toggle': {
      next.muted = !prev.muted;
      return {
        ok: true,
        watchdogTriggered: false,
        restorationOutcome: 'not_needed',
        nextState: next,
        detail: `[${profile.displayName}] Audio ${next.muted ? 'muted' : 'unmuted'}.`,
      };
    }
    case 'channel_up': {
      next.channelNumber = Math.min(999, prev.channelNumber + 1);
      if (prev.adBreakOverlayActive) {
        next.adBreakOverlayActive = false;
        next.activeInput = next.previousOrdinaryInput;
        next.lastRestoredAt = nowIso;
        return {
          ok: true,
          watchdogTriggered: true,
          restorationOutcome: 'restored_to_ordinary_tv',
          nextState: next,
          detail: `[${profile.displayName}] Viewer pressed CH+; EDISON immediately yielded ad overlay and tuned channel ${next.channelNumber}.`,
        };
      }
      return {
        ok: true,
        watchdogTriggered: false,
        restorationOutcome: 'not_needed',
        nextState: next,
        detail: `[${profile.displayName}] Tuned to channel ${next.channelNumber}.`,
      };
    }
    case 'channel_down': {
      next.channelNumber = Math.max(1, prev.channelNumber - 1);
      if (prev.adBreakOverlayActive) {
        next.adBreakOverlayActive = false;
        next.activeInput = next.previousOrdinaryInput;
        next.lastRestoredAt = nowIso;
        return {
          ok: true,
          watchdogTriggered: true,
          restorationOutcome: 'restored_to_ordinary_tv',
          nextState: next,
          detail: `[${profile.displayName}] Viewer pressed CH-; EDISON immediately yielded ad overlay and tuned channel ${next.channelNumber}.`,
        };
      }
      return {
        ok: true,
        watchdogTriggered: false,
        restorationOutcome: 'not_needed',
        nextState: next,
        detail: `[${profile.displayName}] Tuned to channel ${next.channelNumber}.`,
      };
    }
    case 'input_source_select': {
      const target = options?.targetInput ?? 'HDMI_1';
      if (target !== 'EDISON_APP') {
        next.previousOrdinaryInput = target;
        next.adBreakOverlayActive = false;
      }
      next.activeInput = target;
      return {
        ok: true,
        watchdogTriggered: prev.adBreakOverlayActive && target !== 'EDISON_APP',
        restorationOutcome:
          prev.adBreakOverlayActive && target !== 'EDISON_APP'
            ? 'restored_to_ordinary_tv'
            : 'not_needed',
        nextState: next,
        detail: `[${profile.displayName}] Input switched cleanly to ${target}.`,
      };
    }
    case 'back': {
      if (prev.adBreakOverlayActive || prev.activeInput === 'EDISON_APP') {
        next.adBreakOverlayActive = false;
        next.activeInput = prev.previousOrdinaryInput;
        next.lastRestoredAt = nowIso;
        return {
          ok: true,
          watchdogTriggered: false,
          restorationOutcome: 'restored_to_ordinary_tv',
          nextState: next,
          detail: `[${profile.displayName}] Viewer pressed BACK; returned immediately to ordinary TV (${next.activeInput}).`,
        };
      }
      next.lastDpadAction = 'back';
      return {
        ok: true,
        watchdogTriggered: false,
        restorationOutcome: 'not_needed',
        nextState: next,
        detail: `[${profile.displayName}] Dispatched conventional BACK command.`,
      };
    }
    case 'home': {
      next.adBreakOverlayActive = false;
      next.activeInput = prev.previousOrdinaryInput;
      next.lastDpadAction = 'home';
      next.lastRestoredAt = nowIso;
      return {
        ok: true,
        watchdogTriggered: false,
        restorationOutcome: prev.adBreakOverlayActive ? 'restored_to_ordinary_tv' : 'not_needed',
        nextState: next,
        detail: `[${profile.displayName}] Dispatched HOME navigation (ad overlay exited safely).`,
      };
    }
    case 'dpad_up':
    case 'dpad_down':
    case 'dpad_left':
    case 'dpad_right':
    case 'dpad_ok': {
      next.lastDpadAction = command;
      return {
        ok: true,
        watchdogTriggered: false,
        restorationOutcome: 'not_needed',
        nextState: next,
        detail: `[${profile.displayName}] Dispatched conventional navigation key "${command}".`,
      };
    }
  }
}

function buildAdapter(profile: TvPlatformCapabilityProfile): TvPlatformAdapter {
  return {
    getCapabilityProfile: () => ({
      ...profile,
      supportedRemoteCommands: [...profile.supportedRemoteCommands],
    }),
    executeNormalRemoteCommand: (state, command, options) =>
      executeStandardRemoteMutation(profile, state, command, options),
  };
}

const CAPABILITY_PROFILES: Record<TvPlatformId, TvPlatformCapabilityProfile> = {
  simulation_tv: {
    platformId: 'simulation_tv',
    displayName: 'SimulationTvAdapter (Software Contract)',
    isSimulated: true,
    hardwareTested: false,
    officiallyDocumentedPath:
      'In-memory deterministic software adapter for Phases 2–5 CI, emulator & fault-injection verification.',
    requiresPartnerPrivilegeForGlobalTuner: false,
    supportsOwnSessionOverlay: true,
    supportedRemoteCommands: [...ALL_TV_REMOTE_COMMANDS],
    restorationGuaranteeMode: 'Deterministic state-machine watchdog fallback to previousOrdinaryInput',
    stageP6Note: 'Software-only reference simulator; physical Smart TV test deferred strictly to Stage P6.',
  },
  android_tv_tif: {
    platformId: 'android_tv_tif',
    displayName: 'Android TV / Google TV (TIF Mock Adapter)',
    isSimulated: true,
    hardwareTested: false,
    officiallyDocumentedPath:
      'TvInputService.Session.onCreateOverlayView() + Android TV Remote pairing / HDMI-CEC (no READ_EPG_DATA or 3P hijack).',
    requiresPartnerPrivilegeForGlobalTuner: true,
    supportsOwnSessionOverlay: true,
    supportedRemoteCommands: [...ALL_TV_REMOTE_COMMANDS],
    restorationGuaranteeMode: 'Session teardown + TIF channel restoration with 2s watchdog',
    stageP6Note: 'Target #1 for Stage P6 single integrated physical test; NOT YET TESTED ON HARDWARE.',
  },
  samsung_tizen: {
    platformId: 'samsung_tizen',
    displayName: 'Samsung Tizen TV (Mock Adapter)',
    isSimulated: true,
    hardwareTested: false,
    officiallyDocumentedPath:
      'tizen.tvwindow.show() foreground window + LAN remote key injection + org.tizen.tv-viewer launch return.',
    requiresPartnerPrivilegeForGlobalTuner: true,
    supportsOwnSessionOverlay: true,
    supportedRemoteCommands: [
      'power_toggle',
      'volume_up',
      'volume_down',
      'mute_toggle',
      'channel_up',
      'channel_down',
      'input_source_select',
      'dpad_up',
      'dpad_down',
      'dpad_left',
      'dpad_right',
      'dpad_ok',
      'back',
      'home',
    ],
    restorationGuaranteeMode: 'Foreground app yield back to org.tizen.tv-viewer',
    stageP6Note: 'Secondary modular adapter contract only; zero Samsung Tizen hardware tested.',
  },
  lg_webos: {
    platformId: 'lg_webos',
    displayName: 'LG webOS TV (Mock Adapter)',
    isSimulated: true,
    hardwareTested: false,
    officiallyDocumentedPath:
      'webOS SSAP/WebSocket LAN remote command contract + partner-gated Luna com.webos.service.eim switching.',
    requiresPartnerPrivilegeForGlobalTuner: true,
    supportsOwnSessionOverlay: false,
    supportedRemoteCommands: [
      'power_toggle',
      'volume_up',
      'volume_down',
      'mute_toggle',
      'channel_up',
      'channel_down',
      'dpad_up',
      'dpad_down',
      'dpad_left',
      'dpad_right',
      'dpad_ok',
      'back',
      'home',
    ],
    restorationGuaranteeMode: 'Luna/SSAP previous input restoration; restricted bus operations fail closed',
    stageP6Note: 'Secondary modular adapter contract only; zero LG webOS hardware tested.',
  },
};

export class EdisonTvControlEngine {
  private readonly adapters: Record<TvPlatformId, TvPlatformAdapter>;

  constructor() {
    this.adapters = {
      simulation_tv: buildAdapter(CAPABILITY_PROFILES.simulation_tv),
      android_tv_tif: buildAdapter(CAPABILITY_PROFILES.android_tv_tif),
      samsung_tizen: buildAdapter(CAPABILITY_PROFILES.samsung_tizen),
      lg_webos: buildAdapter(CAPABILITY_PROFILES.lg_webos),
    };
  }

  listCapabilityProfiles(): TvPlatformCapabilityProfile[] {
    return ALL_TV_PLATFORM_IDS.map((id) => this.adapters[id].getCapabilityProfile());
  }

  getAdapter(platformId: TvPlatformId): TvPlatformAdapter {
    return this.adapters[platformId];
  }

  createDefaultTvState(platformId: TvPlatformId = 'android_tv_tif'): SimulatedTvDeviceState {
    return {
      platformId,
      powerOn: true,
      volume: 24,
      muted: false,
      activeInput: 'LIVE_TUNER',
      previousOrdinaryInput: 'LIVE_TUNER',
      channelNumber: 101,
      adBreakOverlayActive: false,
      lastDpadAction: null,
      lastRestoredAt: null,
      ordinaryTvIntact: true,
    };
  }

  dispatchRemoteCommand(params: {
    platformId: TvPlatformId;
    intentSource: 'AURA' | 'EDISON_UI';
    command: TvRemoteCommand;
    targetInput?: TvInputSource;
    faultMode?: TvFaultSimulationMode;
    simulateActiveAdSession?: boolean;
    currentState?: SimulatedTvDeviceState;
  }): TvRemoteDispatchResult {
    const adapter = this.getAdapter(params.platformId);
    const baseState = params.currentState
      ? { ...params.currentState, platformId: params.platformId }
      : this.createDefaultTvState(params.platformId);

    const previousState: SimulatedTvDeviceState = params.simulateActiveAdSession
      ? {
          ...baseState,
          powerOn: true,
          activeInput: 'EDISON_APP',
          adBreakOverlayActive: true,
        }
      : baseState;

    const faultInjected: TvFaultSimulationMode = params.faultMode ?? 'none';
    const outcome = adapter.executeNormalRemoteCommand(previousState, params.command, {
      targetInput: params.targetInput,
      faultMode: faultInjected,
    });

    return {
      ok: outcome.ok,
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      platformId: params.platformId,
      intentSource: params.intentSource,
      command: params.command,
      faultInjected,
      watchdogTriggered: outcome.watchdogTriggered,
      restorationOutcome: outcome.restorationOutcome,
      previousState,
      nextState: outcome.nextState,
      detail: `${params.intentSource} → EDISON Control Engine → ${outcome.detail}`,
      auditTraceId: `tvsim_${crypto.randomBytes(6).toString('hex')}`,
      executedAt: new Date().toISOString(),
    };
  }
}

export const edisonTvControlEngine = new EdisonTvControlEngine();

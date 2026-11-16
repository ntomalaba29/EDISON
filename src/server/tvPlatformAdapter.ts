import crypto from 'node:crypto';
import { localOfflineIntelCache } from './offlineIntelCache.ts';
import { DEFAULT_SHARED_INTEL_SCOPES } from './sharedIntelligencePreview.ts';
import type {
  SimulatedTvDeviceState,
  TvAdapterHarnessPhase,
  TvBreakLifecycleResult,
  TvCadenceSimulationResult,
  TvChannelProfileBinding,
  TvEmulatorConformanceReport,
  TvEmulatorConformanceVector,
  TvFaultSimulationMode,
  TvFaultSuiteCaseResult,
  TvFaultSuiteReport,
  TvInputSource,
  TvPlatformCapabilityProfile,
  TvPlatformHarnessTelemetry,
  TvPlatformId,
  TvRemoteCommand,
  TvRemoteDispatchResult,
} from '../types/edison.ts';

export const DEFAULT_TV_CHANNEL_BINDINGS: readonly TvChannelProfileBinding[] = [
  {
    channelNumber: 101,
    channelName: 'BBC One HD (Sim DVB-T2)',
    broadcaster: DEFAULT_SHARED_INTEL_SCOPES[0].broadcaster,
    scopeId: DEFAULT_SHARED_INTEL_SCOPES[0].scopeId,
    defaultInput: 'LIVE_TUNER',
    signalStandard: 'SCTE-35',
  },
  {
    channelNumber: 103,
    channelName: 'Sky Sports Main (Sim IP-HLS)',
    broadcaster: DEFAULT_SHARED_INTEL_SCOPES[1].broadcaster,
    scopeId: DEFAULT_SHARED_INTEL_SCOPES[1].scopeId,
    defaultInput: 'LIVE_TUNER',
    signalStandard: 'SCTE-35',
  },
  {
    channelNumber: 201,
    channelName: 'Das Erste HD (Sim HbbTV)',
    broadcaster: DEFAULT_SHARED_INTEL_SCOPES[2].broadcaster,
    scopeId: DEFAULT_SHARED_INTEL_SCOPES[2].scopeId,
    defaultInput: 'HDMI_1',
    signalStandard: 'HbbTV-AIT',
  },
] as const;

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

export const ALL_ACTIVE_FAULT_MODES: readonly Exclude<TvFaultSimulationMode, 'none'>[] = [
  'adapter_timeout',
  'hdcp_blocked',
  'decoder_crash',
  'network_drop',
] as const;

export interface TvPlatformAdapter {
  getCapabilityProfile(): TvPlatformCapabilityProfile;
  getHarnessTelemetry(phase: TvAdapterHarnessPhase): TvPlatformHarnessTelemetry;
  enterAdBreakSession(
    state: SimulatedTvDeviceState,
    options?: {
      faultMode?: TvFaultSimulationMode;
    }
  ): {
    ok: boolean;
    watchdogTriggered: boolean;
    simulatedLatencyMs: number;
    harnessPhase: TvAdapterHarnessPhase;
    nextState: SimulatedTvDeviceState;
    detail: string;
  };
  exitToOrdinaryTv(
    state: SimulatedTvDeviceState,
    options?: {
      faultMode?: TvFaultSimulationMode;
    }
  ): {
    ok: boolean;
    watchdogTriggered: boolean;
    simulatedLatencyMs: number;
    harnessPhase: TvAdapterHarnessPhase;
    nextState: SimulatedTvDeviceState;
    detail: string;
  };
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
    adapter_timeout:
      'Adapter execution timed out — watchdog safely exited ad overlay and restored ordinary TV.',
    hdcp_blocked:
      'HDCP/DRM protected surface detected — EDISON refused frame interception and preserved ordinary TV.',
    decoder_crash:
      'Ad decoder fault injected — watchdog isolated crash and restored ordinary live TV input.',
    network_drop:
      'Network outage injected — EDISON aborted break overlay without interrupting ordinary TV viewing.',
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
      detail: `[${profile.displayName}] Command "${command}" is blocked by this platform's consumer capability profile (fails closed cleanly).`,
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

interface HarnessConfig {
  profile: TvPlatformCapabilityProfile;
  harnessName: string;
  nativeSurfaceId: string;
  enterLatencyMs: number;
  exitLatencyMs: number;
  enterDetail: string;
  exitDetail: string;
}

function buildPlatformHarness(cfg: HarnessConfig): TvPlatformAdapter {
  const { profile } = cfg;

  const getHarnessTelemetry = (phase: TvAdapterHarnessPhase): TvPlatformHarnessTelemetry => ({
    platformId: profile.platformId,
    harnessName: cfg.harnessName,
    harnessPhase: phase,
    nativeSurfaceId: cfg.nativeSurfaceId,
    lifecycleNotes: profile.officiallyDocumentedPath,
    privilegeBoundaryEnforced: true,
    isSimulated: true,
    hardwareTested: false,
  });

  const enterAdBreakSession: TvPlatformAdapter['enterAdBreakSession'] = (prev, options) => {
    const nowIso = new Date().toISOString();
    const faultMode = options?.faultMode ?? 'none';

    if (faultMode !== 'none') {
      const restored = applyWatchdogRestoration(prev, faultMode, nowIso);
      return {
        ok: false,
        watchdogTriggered: true,
        simulatedLatencyMs: cfg.exitLatencyMs,
        harnessPhase: 'fault_recovered',
        nextState: restored.nextState,
        detail: `[${cfg.harnessName}] Fault during ad-break entry (${faultMode}) -> ${restored.detail}`,
      };
    }

    if (!prev.powerOn) {
      return {
        ok: false,
        watchdogTriggered: false,
        simulatedLatencyMs: 25,
        harnessPhase: 'idle',
        nextState: cloneTvState(prev),
        detail: `[${cfg.harnessName}] TV is in standby; declined ad-break overlay safely.`,
      };
    }

    // Fail-closed capability boundary (e.g. LG webOS without partner Luna privilege)
    if (!profile.supportsOwnSessionOverlay) {
      return {
        ok: false,
        watchdogTriggered: false,
        simulatedLatencyMs: 60,
        harnessPhase: 'tuned_ordinary',
        nextState: {
          ...cloneTvState(prev),
          adBreakOverlayActive: false,
          activeInput: prev.previousOrdinaryInput || 'LIVE_TUNER',
          ordinaryTvIntact: true,
        },
        detail: `[${cfg.harnessName}] Own-session overlay blocked without partner privilege (fail-closed): ordinary TV kept undisturbed.`,
      };
    }

    const next = cloneTvState(prev);
    if (prev.activeInput !== 'EDISON_APP') {
      next.previousOrdinaryInput = prev.activeInput;
    }
    next.activeInput = 'EDISON_APP';
    next.adBreakOverlayActive = true;
    next.ordinaryTvIntact = true;

    return {
      ok: true,
      watchdogTriggered: false,
      simulatedLatencyMs: cfg.enterLatencyMs,
      harnessPhase: 'ad_overlay_active',
      nextState: next,
      detail: `[${cfg.harnessName}] ${cfg.enterDetail}`,
    };
  };

  const exitToOrdinaryTv: TvPlatformAdapter['exitToOrdinaryTv'] = (prev, options) => {
    const nowIso = new Date().toISOString();
    const faultMode = options?.faultMode ?? 'none';

    if (faultMode !== 'none') {
      const restored = applyWatchdogRestoration(prev, faultMode, nowIso);
      return {
        ok: false,
        watchdogTriggered: true,
        simulatedLatencyMs: cfg.exitLatencyMs,
        harnessPhase: 'fault_recovered',
        nextState: restored.nextState,
        detail: `[${cfg.harnessName}] Watchdog forced safe recovery -> ${restored.detail}`,
      };
    }

    const restored = applyWatchdogRestoration(prev, 'none', nowIso);
    return {
      ok: true,
      watchdogTriggered: false,
      simulatedLatencyMs: cfg.exitLatencyMs,
      harnessPhase: 'yielded_to_ordinary',
      nextState: restored.nextState,
      detail: `[${cfg.harnessName}] ${cfg.exitDetail} (${restored.nextState.activeInput}).`,
    };
  };

  return {
    getCapabilityProfile: () => ({
      ...profile,
      supportedRemoteCommands: [...profile.supportedRemoteCommands],
    }),
    getHarnessTelemetry,
    enterAdBreakSession,
    exitToOrdinaryTv,
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
    supportedRemoteCommands: [...ALL_TV_REMOTE_COMMANDS],
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

const HARNESS_CONFIGS: Record<TvPlatformId, HarnessConfig> = {
  simulation_tv: {
    profile: CAPABILITY_PROFILES.simulation_tv,
    harnessName: 'SimulationTvHarness',
    nativeSurfaceId: 'sim://tv-stage/16x9',
    enterLatencyMs: 120,
    exitLatencyMs: 95,
    enterDetail: 'Entered deterministic 16:9 simulation ad-break slot.',
    exitDetail: 'Exited simulation ad-break slot cleanly to ordinary TV',
  },
  android_tv_tif: {
    profile: CAPABILITY_PROFILES.android_tv_tif,
    harnessName: 'AndroidTvTifHarness',
    nativeSurfaceId: 'tif://TvInputService.Session/overlay-view',
    enterLatencyMs: 360,
    exitLatencyMs: 280,
    enterDetail: 'Attached EDISON TvInputService.Session.onCreateOverlayView() without intercepting global tuner.',
    exitDetail: 'Detached TIF Session overlay & restored ordinary TV channel via TIF Session.onRelease()',
  },
  samsung_tizen: {
    profile: CAPABILITY_PROFILES.samsung_tizen,
    harnessName: 'SamsungTizenHarness',
    nativeSurfaceId: 'tizen://tvwindow/foreground-ad-rect',
    enterLatencyMs: 410,
    exitLatencyMs: 320,
    enterDetail: 'Activated bounded foreground window via tizen.tvwindow.show() software contract.',
    exitDetail: 'Hid tizen.tvwindow overlay and yielded foreground cleanly to org.tizen.tv-viewer',
  },
  lg_webos: {
    profile: CAPABILITY_PROFILES.lg_webos,
    harnessName: 'LgWebOsHarness',
    nativeSurfaceId: 'webos://ssap-lan/partner-luna-gated',
    enterLatencyMs: 460,
    exitLatencyMs: 350,
    enterDetail: 'Activated partner-authorised webOS surface.',
    exitDetail: 'Restored ordinary TV via SSAP/Luna fail-safe exit handler',
  },
};

export class EdisonTvControlEngine {
  private readonly adapters: Record<TvPlatformId, TvPlatformAdapter>;

  constructor() {
    this.adapters = {
      simulation_tv: buildPlatformHarness(HARNESS_CONFIGS.simulation_tv),
      android_tv_tif: buildPlatformHarness(HARNESS_CONFIGS.android_tv_tif),
      samsung_tizen: buildPlatformHarness(HARNESS_CONFIGS.samsung_tizen),
      lg_webos: buildPlatformHarness(HARNESS_CONFIGS.lg_webos),
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

  runBreakLifecycle(params: {
    platformId: TvPlatformId;
    action: 'enter_ad_session' | 'exit_to_ordinary_tv';
    faultMode?: TvFaultSimulationMode;
    currentState?: SimulatedTvDeviceState;
  }): TvBreakLifecycleResult {
    const adapter = this.getAdapter(params.platformId);
    const previousState = params.currentState
      ? { ...params.currentState, platformId: params.platformId }
      : this.createDefaultTvState(params.platformId);
    const faultInjected: TvFaultSimulationMode = params.faultMode ?? 'none';

    const outcome =
      params.action === 'enter_ad_session'
        ? adapter.enterAdBreakSession(previousState, { faultMode: faultInjected })
        : adapter.exitToOrdinaryTv(previousState, { faultMode: faultInjected });

    return {
      ok: outcome.ok,
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      platformId: params.platformId,
      action: params.action,
      faultInjected,
      watchdogTriggered: outcome.watchdogTriggered,
      simulatedLatencyMs: outcome.simulatedLatencyMs,
      harnessTelemetry: adapter.getHarnessTelemetry(outcome.harnessPhase),
      previousState,
      nextState: outcome.nextState,
      detail: outcome.detail,
      auditTraceId: `tvlife_${crypto.randomBytes(6).toString('hex')}`,
      executedAt: new Date().toISOString(),
    };
  }

  runDeterministicFaultSuite(targetPlatformId?: TvPlatformId): TvFaultSuiteReport {
    const platforms: readonly TvPlatformId[] = targetPlatformId
      ? [targetPlatformId]
      : ALL_TV_PLATFORM_IDS;
    const cases: TvFaultSuiteCaseResult[] = [];

    for (const platformId of platforms) {
      const adapter = this.getAdapter(platformId);
      for (const faultMode of ALL_ACTIVE_FAULT_MODES) {
        const activeAdState: SimulatedTvDeviceState = {
          ...this.createDefaultTvState(platformId),
          activeInput: 'EDISON_APP',
          previousOrdinaryInput: 'LIVE_TUNER',
          adBreakOverlayActive: true,
        };

        const recovery = adapter.exitToOrdinaryTv(activeAdState, { faultMode });
        const ordinaryTvIntact = recovery.nextState.ordinaryTvIntact === true;
        const adOverlayCleared = recovery.nextState.adBreakOverlayActive === false;
        const restoredToOrdinary = recovery.nextState.activeInput === 'LIVE_TUNER';
        const passed =
          recovery.watchdogTriggered && ordinaryTvIntact && adOverlayCleared && restoredToOrdinary;

        cases.push({
          platformId,
          faultMode,
          watchdogTriggered: recovery.watchdogTriggered,
          ordinaryTvIntact,
          adOverlayCleared,
          restoredInput: recovery.nextState.activeInput,
          passed,
          detail: recovery.detail,
        });
      }
    }

    const passedCases = cases.filter((c) => c.passed).length;
    return {
      generatedAt: new Date().toISOString(),
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      totalCases: cases.length,
      passedCases,
      allPassed: passedCases === cases.length,
      cases,
    };
  }

  listChannelBindings(): TvChannelProfileBinding[] {
    return DEFAULT_TV_CHANNEL_BINDINGS.map((c) => ({ ...c }));
  }

  resolveChannelBinding(channelNumber: number): TvChannelProfileBinding {
    return (
      DEFAULT_TV_CHANNEL_BINDINGS.find((c) => c.channelNumber === channelNumber) ?? {
        ...DEFAULT_TV_CHANNEL_BINDINGS[0],
      }
    );
  }

  runBroadcastCadenceSimulation(params: {
    platformId: TvPlatformId;
    channelNumber: number;
    signalType: 'scte35_cue' | 'hbbtv_ait' | 'av_cadence';
    observedBreakDurationSec: number;
    adDurationSeconds: number;
    safetyBufferSeconds?: number;
    networkOnline?: boolean;
    faultMode?: TvFaultSimulationMode;
    idempotencyKey?: string;
    recordToQueue?: boolean;
    currentState?: SimulatedTvDeviceState;
  }): TvCadenceSimulationResult {
    const channelBinding = this.resolveChannelBinding(params.channelNumber);
    const safetyBufferSeconds = params.safetyBufferSeconds ?? 5;
    const networkOnline = params.networkOnline ?? true;
    const faultMode = params.faultMode ?? 'none';

    const baseState: SimulatedTvDeviceState = params.currentState
      ? {
          ...params.currentState,
          platformId: params.platformId,
          channelNumber: channelBinding.channelNumber,
          previousOrdinaryInput: channelBinding.defaultInput,
          activeInput: channelBinding.defaultInput,
        }
      : {
          ...this.createDefaultTvState(params.platformId),
          channelNumber: channelBinding.channelNumber,
          previousOrdinaryInput: channelBinding.defaultInput,
          activeInput: channelBinding.defaultInput,
        };

    const cacheEligibility = localOfflineIntelCache.evaluateOfflineBreakEligibility({
      scopeId: channelBinding.scopeId,
      adDurationSeconds: params.adDurationSeconds,
      safetyBufferSeconds,
    });

    const idemKey =
      params.idempotencyKey?.trim() ||
      `cad_${params.platformId}_ch${channelBinding.channelNumber}_${params.signalType}_d${params.adDurationSeconds}_b${params.observedBreakDurationSec}`;

    // Skip safely if cached P10 OR live cadence estimate cannot safely cover ad + buffer
    const switchingSec = 2;
    const cadenceRequiredSec = params.adDurationSeconds + switchingSec + safetyBufferSeconds;
    const safeToEnter =
      cacheEligibility.eligible && params.observedBreakDurationSec >= cadenceRequiredSec;

    if (!safeToEnter) {
      const queueRes =
        params.recordToQueue === false
          ? { queued: false, deduplicatedReplay: false }
          : localOfflineIntelCache.enqueueOfflineObservation({
              idempotencyKey: idemKey,
              scopeId: channelBinding.scopeId,
              channelNumber: channelBinding.channelNumber,
              signalType: params.signalType,
              observedBreakDurationSec: params.observedBreakDurationSec,
              switchingLatencyMs: 380,
            });

      return {
        ok: true,
        isSoftwareSimulationOnly: true,
        hardwareTested: false,
        platformId: params.platformId,
        channelBinding,
        signalType: params.signalType,
        networkOnline,
        cacheEligibility,
        breakExecuted: false,
        adDisplayedDuringBreak: false,
        watchdogRecovered: false,
        observationQueued: queueRes.queued,
        deduplicatedReplay: queueRes.deduplicatedReplay,
        finalTvState: { ...baseState, adBreakOverlayActive: false, ordinaryTvIntact: true },
        detail: `Cadence skipped on CH ${channelBinding.channelNumber} (${channelBinding.channelName}): break window insufficient (${params.observedBreakDurationSec}s / cached P10=${cacheEligibility.availableP10Sec}s < ${cadenceRequiredSec}s). Ordinary TV undisturbed.`,
        auditTraceId: `tvcad_${crypto.randomBytes(6).toString('hex')}`,
        executedAt: new Date().toISOString(),
      };
    }

    const adapter = this.getAdapter(params.platformId);
    const enterOutcome = adapter.enterAdBreakSession(baseState, { faultMode });

    let finalTvState = enterOutcome.nextState;
    let watchdogRecovered = enterOutcome.watchdogTriggered;
    let adDisplayedDuringBreak = enterOutcome.ok;

    if (enterOutcome.ok) {
      const exitOutcome = adapter.exitToOrdinaryTv(enterOutcome.nextState, { faultMode: 'none' });
      finalTvState = exitOutcome.nextState;
      watchdogRecovered = watchdogRecovered || exitOutcome.watchdogTriggered;
    } else if (!finalTvState.ordinaryTvIntact || finalTvState.adBreakOverlayActive) {
      const forcedExit = adapter.exitToOrdinaryTv(finalTvState, { faultMode });
      finalTvState = forcedExit.nextState;
      watchdogRecovered = true;
      adDisplayedDuringBreak = false;
    }

    const queueRes =
      params.recordToQueue === false
        ? { queued: false, deduplicatedReplay: false }
        : localOfflineIntelCache.enqueueOfflineObservation({
            idempotencyKey: idemKey,
            scopeId: channelBinding.scopeId,
            channelNumber: channelBinding.channelNumber,
            signalType: params.signalType,
            observedBreakDurationSec: params.observedBreakDurationSec,
            switchingLatencyMs: enterOutcome.simulatedLatencyMs,
          });

    return {
      ok: enterOutcome.ok || finalTvState.ordinaryTvIntact,
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      platformId: params.platformId,
      channelBinding,
      signalType: params.signalType,
      networkOnline,
      cacheEligibility,
      breakExecuted: enterOutcome.ok,
      adDisplayedDuringBreak,
      watchdogRecovered,
      observationQueued: queueRes.queued,
      deduplicatedReplay: queueRes.deduplicatedReplay,
      finalTvState,
      detail: enterOutcome.ok
        ? `Cadence simulation completed CH ${channelBinding.channelNumber} (${params.signalType}) -> ad slot played (${enterOutcome.simulatedLatencyMs}ms switch) -> restored ${finalTvState.activeInput}.`
        : `Cadence guarded CH ${channelBinding.channelNumber} (${params.signalType}) -> ${enterOutcome.detail}`,
      auditTraceId: `tvcad_${crypto.randomBytes(6).toString('hex')}`,
      executedAt: new Date().toISOString(),
    };
  }

  runEmulatorConformanceVectors(): TvEmulatorConformanceReport {
    const vectors: TvEmulatorConformanceVector[] = [];

    // Vector 1: Android TV TIF enter & clean exit
    const androidEnter = this.runBreakLifecycle({
      platformId: 'android_tv_tif',
      action: 'enter_ad_session',
    });
    const androidExit = this.runBreakLifecycle({
      platformId: 'android_tv_tif',
      action: 'exit_to_ordinary_tv',
      currentState: androidEnter.nextState,
    });
    vectors.push({
      vectorId: 'VEC-ANDROID-TIF-LIFECYCLE',
      platformId: 'android_tv_tif',
      scenario: 'TIF Session.onCreateOverlayView() -> return to LIVE_TUNER',
      expectedOutcome: 'ad_overlay_active -> yielded_to_ordinary (ordinaryTvIntact=true)',
      actualOutcome: `${androidEnter.harnessTelemetry.harnessPhase} -> ${androidExit.harnessTelemetry.harnessPhase}`,
      ordinaryTvPreserved: androidExit.nextState.ordinaryTvIntact && !androidExit.nextState.adBreakOverlayActive,
      passed:
        androidEnter.ok &&
        androidEnter.harnessTelemetry.harnessPhase === 'ad_overlay_active' &&
        androidExit.ok &&
        androidExit.nextState.activeInput === 'LIVE_TUNER',
    });

    // Vector 2: Samsung Tizen foreground yield
    const tizenEnter = this.runBreakLifecycle({
      platformId: 'samsung_tizen',
      action: 'enter_ad_session',
    });
    const tizenYield = this.dispatchRemoteCommand({
      platformId: 'samsung_tizen',
      intentSource: 'AURA',
      command: 'channel_up',
      currentState: tizenEnter.nextState,
    });
    vectors.push({
      vectorId: 'VEC-TIZEN-CH-YIELD',
      platformId: 'samsung_tizen',
      scenario: 'User presses CH+ during foreground tizen.tvwindow ad',
      expectedOutcome: 'restored_to_ordinary_tv & CH incremented immediately',
      actualOutcome: `${tizenYield.restorationOutcome} (CH ${tizenYield.nextState.channelNumber})`,
      ordinaryTvPreserved: tizenYield.nextState.ordinaryTvIntact && !tizenYield.nextState.adBreakOverlayActive,
      passed:
        tizenYield.ok &&
        tizenYield.watchdogTriggered &&
        tizenYield.restorationOutcome === 'restored_to_ordinary_tv' &&
        tizenYield.nextState.channelNumber === 102,
    });

    // Vector 3: LG webOS fail-closed unprivileged guard
    const webosEnter = this.runBreakLifecycle({
      platformId: 'lg_webos',
      action: 'enter_ad_session',
    });
    const webosInputCmd = this.dispatchRemoteCommand({
      platformId: 'lg_webos',
      intentSource: 'AURA',
      command: 'input_source_select',
      targetInput: 'HDMI_1',
    });
    vectors.push({
      vectorId: 'VEC-WEBOS-FAIL-CLOSED',
      platformId: 'lg_webos',
      scenario: 'Unprivileged webOS blocks own-session overlay & restricted bus switching',
      expectedOutcome: 'ok=false & ordinaryTvIntact=true for both',
      actualOutcome: `overlay.ok=${webosEnter.ok}, input.outcome=${webosInputCmd.restorationOutcome}`,
      ordinaryTvPreserved: webosEnter.nextState.ordinaryTvIntact && webosInputCmd.nextState.ordinaryTvIntact,
      passed:
        !webosEnter.ok &&
        webosEnter.nextState.ordinaryTvIntact &&
        !webosInputCmd.ok &&
        webosInputCmd.restorationOutcome === 'command_rejected_safely',
    });

    // Vector 4: Standby TV declines ad-break entry safely
    const standbyState: SimulatedTvDeviceState = {
      ...this.createDefaultTvState('simulation_tv'),
      powerOn: false,
    };
    const standbyAttempt = this.runBreakLifecycle({
      platformId: 'simulation_tv',
      action: 'enter_ad_session',
      currentState: standbyState,
    });
    vectors.push({
      vectorId: 'VEC-STANDBY-REJECT',
      platformId: 'simulation_tv',
      scenario: 'Standby TV refuses ad-break overlay activation',
      expectedOutcome: 'ok=false, powerOn=false, adBreakOverlayActive=false',
      actualOutcome: `ok=${standbyAttempt.ok}, power=${standbyAttempt.nextState.powerOn}`,
      ordinaryTvPreserved: !standbyAttempt.nextState.adBreakOverlayActive,
      passed: !standbyAttempt.ok && !standbyAttempt.nextState.powerOn && !standbyAttempt.nextState.adBreakOverlayActive,
    });

    // Vector 5: HDCP protected surface preservation
    const hdcpAttempt = this.runBreakLifecycle({
      platformId: 'android_tv_tif',
      action: 'enter_ad_session',
      faultMode: 'hdcp_blocked',
    });
    vectors.push({
      vectorId: 'VEC-HDCP-PROTECTED',
      platformId: 'android_tv_tif',
      scenario: 'HDCP/DRM content blocks overlay and keeps ordinary TV live',
      expectedOutcome: 'watchdogTriggered=true, harnessPhase=fault_recovered, ordinaryTvIntact=true',
      actualOutcome: `phase=${hdcpAttempt.harnessTelemetry.harnessPhase}, intact=${hdcpAttempt.nextState.ordinaryTvIntact}`,
      ordinaryTvPreserved: hdcpAttempt.nextState.ordinaryTvIntact,
      passed:
        !hdcpAttempt.ok &&
        hdcpAttempt.watchdogTriggered &&
        hdcpAttempt.harnessTelemetry.harnessPhase === 'fault_recovered' &&
        hdcpAttempt.nextState.ordinaryTvIntact,
    });

    // Vector 6: Offline cache short break skip (fail-safe)
    const shortSkip = this.runBroadcastCadenceSimulation({
      platformId: 'android_tv_tif',
      channelNumber: 101,
      signalType: 'scte35_cue',
      observedBreakDurationSec: 20,
      adDurationSeconds: 30,
      safetyBufferSeconds: 5,
      networkOnline: false,
      idempotencyKey: 'vec_conformance_short_skip',
      recordToQueue: false,
    });
    vectors.push({
      vectorId: 'VEC-OFFLINE-SHORT-BREAK-SKIP',
      platformId: 'android_tv_tif',
      scenario: '20s break < 30s ad + safety skips without disturbing TV',
      expectedOutcome: 'breakExecuted=false, ordinaryTvIntact=true',
      actualOutcome: `breakExecuted=${shortSkip.breakExecuted}, input=${shortSkip.finalTvState.activeInput}`,
      ordinaryTvPreserved: shortSkip.finalTvState.ordinaryTvIntact,
      passed: !shortSkip.breakExecuted && shortSkip.finalTvState.ordinaryTvIntact,
    });

    // Vector 7: SimulationTv healthy multi-channel cadence roundtrip
    const healthyCadence = this.runBroadcastCadenceSimulation({
      platformId: 'simulation_tv',
      channelNumber: 103,
      signalType: 'scte35_cue',
      observedBreakDurationSec: 95,
      adDurationSeconds: 20,
      safetyBufferSeconds: 5,
      networkOnline: true,
      idempotencyKey: 'vec_conformance_healthy_ch103',
      recordToQueue: false,
    });
    vectors.push({
      vectorId: 'VEC-MULTICHANNEL-CADENCE-103',
      platformId: 'simulation_tv',
      scenario: 'CH 103 ITV1 95s SCTE-35 break plays 20s slot and restores LIVE_TUNER',
      expectedOutcome: 'breakExecuted=true, finalInput=LIVE_TUNER, adOverlay=false',
      actualOutcome: `exec=${healthyCadence.breakExecuted}, input=${healthyCadence.finalTvState.activeInput}`,
      ordinaryTvPreserved: healthyCadence.finalTvState.ordinaryTvIntact && !healthyCadence.finalTvState.adBreakOverlayActive,
      passed:
        healthyCadence.breakExecuted &&
        healthyCadence.adDisplayedDuringBreak &&
        healthyCadence.finalTvState.activeInput === 'LIVE_TUNER' &&
        !healthyCadence.finalTvState.adBreakOverlayActive,
    });

    // Vector 8: SimulationTv AURA BACK restores ordinary HDMI_1 input
    const hdmiAdState: SimulatedTvDeviceState = {
      ...this.createDefaultTvState('simulation_tv'),
      activeInput: 'EDISON_APP',
      previousOrdinaryInput: 'HDMI_1',
      adBreakOverlayActive: true,
    };
    const backExit = this.dispatchRemoteCommand({
      platformId: 'simulation_tv',
      intentSource: 'AURA',
      command: 'back',
      currentState: hdmiAdState,
    });
    vectors.push({
      vectorId: 'VEC-AURA-BACK-RESTORE-HDMI',
      platformId: 'simulation_tv',
      scenario: 'AURA BACK key during ad returns cleanly to HDMI_1',
      expectedOutcome: 'restored_to_ordinary_tv -> HDMI_1',
      actualOutcome: `${backExit.restorationOutcome} -> ${backExit.nextState.activeInput}`,
      ordinaryTvPreserved: backExit.nextState.ordinaryTvIntact && !backExit.nextState.adBreakOverlayActive,
      passed:
        backExit.ok &&
        backExit.restorationOutcome === 'restored_to_ordinary_tv' &&
        backExit.nextState.activeInput === 'HDMI_1',
    });

    const passedVectors = vectors.filter((v) => v.passed).length;
    return {
      generatedAt: new Date().toISOString(),
      isSoftwareSimulationOnly: true,
      hardwareTested: false,
      stageP6Deferred: true,
      totalVectors: vectors.length,
      passedVectors,
      allPassed: passedVectors === vectors.length,
      vectors,
    };
  }
}

export const edisonTvControlEngine = new EdisonTvControlEngine();



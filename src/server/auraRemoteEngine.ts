import crypto from 'node:crypto';
import { edisonTvControlEngine } from './tvPlatformAdapter.ts';
import type {
  SimulatedTvDeviceState,
  TvInputSource,
  TvPlatformId,
  TvRemoteCommand,
} from '../types/edison.ts';

export type AuraAdapterPlatformId = TvPlatformId | 'hdmi_cec_stb';
export type AuraPairingStatus = 'pending_pin' | 'paired' | 'reconnecting' | 'disconnected';
export type AuraConnectionState = 'online' | 'offline_queued' | 'disconnected';

export interface AuraQueuedCommand {
  commandId: string;
  command: TvRemoteCommand;
  targetInput?: TvInputSource;
  queuedAt: string;
}

export interface AuraPairedDeviceRecord {
  deviceId: string;
  ownerUserId: string;
  householdId: string | null;
  tvLabel: string;
  platformId: AuraAdapterPlatformId;
  pairingCode: string;
  qrPairingPayload: string;
  pairingStatus: AuraPairingStatus;
  connectionState: AuraConnectionState;
  activeProfileId: string | null;
  capabilities: string[];
  reconnectAttemptCount: number;
  nextReconnectBackoffMs: number;
  offlineQueue: AuraQueuedCommand[];
  tvState: SimulatedTvDeviceState;
  lastHeartbeatAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OemNativeAdapterContract {
  platformId: AuraAdapterPlatformId;
  nativeSdkName: string;
  requiredPrivileges: string[];
  allowedOverlayMechanism: string;
  inputControlBoundary: string;
  hdcpDrmBypassProhibited: true;
  ordinaryTvPreservedOnFailure: true;
  hardwareTested: false;
  stageP6Deferred: true;
}

export interface HdmiCecEvaluationResult {
  actionRequested: string;
  sourceAddress: string;
  targetInput: TvInputSource;
  permitted: boolean;
  reason: string;
  ordinaryTvPreserved: true;
  hdcpRespected: true;
  hardwareTested: false;
}

const OEM_NATIVE_CONTRACTS: Record<AuraAdapterPlatformId, OemNativeAdapterContract> = {
  simulation_tv: {
    platformId: 'simulation_tv',
    nativeSdkName: 'EDISON Web 16:9 Sandbox Harness',
    requiredPrivileges: ['browser_viewport_only'],
    allowedOverlayMechanism: 'In-page HTML5 Canvas / Video 16:9 container',
    inputControlBoundary: 'Simulated TV state machine only; never drives physical HDMI hardware.',
    hdcpDrmBypassProhibited: true,
    ordinaryTvPreservedOnFailure: true,
    hardwareTested: false,
    stageP6Deferred: true,
  },
  android_tv_tif: {
    platformId: 'android_tv_tif',
    nativeSdkName: 'Android TV Input Framework (TvInputService) + Jetpack Media3 ExoPlayer',
    requiredPrivileges: [
      'com.android.providers.tv.permission.READ_EPG_DATA',
      'android.permission.INTERNET',
    ],
    allowedOverlayMechanism: 'TvInputService.Session.onSetMain / OverlayView when EDISON owns active session',
    inputControlBoundary: 'Never hijacks unrelated broadcast tuner inputs without OEM partner entitlement or explicit viewer switch.',
    hdcpDrmBypassProhibited: true,
    ordinaryTvPreservedOnFailure: true,
    hardwareTested: false,
    stageP6Deferred: true,
  },
  samsung_tizen: {
    platformId: 'samsung_tizen',
    nativeSdkName: 'Samsung Tizen TV WebAPI (webapis.avplay + tizen.tvwindow + tvinputdevice)',
    requiredPrivileges: [
      'http://developer.samsung.com/privilege/avplay',
      'http://tizen.org/privilege/tv.window',
      'http://tizen.org/privilege/tv.inputdevice',
    ],
    allowedOverlayMechanism: 'Partner-signed H.264 High@L4.1 MP4 playback in tizen.tvwindow (WebM excluded)',
    inputControlBoundary: 'Immediate return-to-TV on CH+/CH-/EXIT/BACK key yield via tvinputdevice.',
    hdcpDrmBypassProhibited: true,
    ordinaryTvPreservedOnFailure: true,
    hardwareTested: false,
    stageP6Deferred: true,
  },
  lg_webos: {
    platformId: 'lg_webos',
    nativeSdkName: 'LG webOS LS2 Luna Service Bus + Magic Remote Key Listener',
    requiredPrivileges: ['luna://com.webos.service.tv.display', 'luna://com.webos.applicationManager'],
    allowedOverlayMechanism: 'Explicit companion app session or LG partner-signed Luna display permission only',
    inputControlBoundary: 'Fails closed on unprivileged third-party builds; never alters protected HDMI/tuner buffers.',
    hdcpDrmBypassProhibited: true,
    ordinaryTvPreservedOnFailure: true,
    hardwareTested: false,
    stageP6Deferred: true,
  },
  hdmi_cec_stb: {
    platformId: 'hdmi_cec_stb',
    nativeSdkName: 'HDMI-CEC 1.4/2.0 Logical Playback Device (One Touch Play / Inactive Source)',
    requiredPrivileges: ['cec_logical_playback_device_4_or_8'],
    allowedOverlayMechanism: 'External HDMI dongle / set-top box yielding via <Inactive Source> [0x9D] back to TV tuner',
    inputControlBoundary: 'Cannot override HDCP handshake or lock TV away from viewer remote; yields immediately on <Routing Change>.',
    hdcpDrmBypassProhibited: true,
    ordinaryTvPreservedOnFailure: true,
    hardwareTested: false,
    stageP6Deferred: true,
  },
};

export class AuraRemoteEngine {
  private readonly devices = new Map<string, AuraPairedDeviceRecord>();

  listOemContracts(): OemNativeAdapterContract[] {
    return Object.values(OEM_NATIVE_CONTRACTS);
  }

  evaluateHdmiCecAction(params: {
    action: 'active_source_claim' | 'inactive_source_release' | 'standby_yield' | 'hdcp_probe';
    targetInput: TvInputSource;
    viewerPressedRemoteKey?: boolean;
    hdcpProtectedSurface?: boolean;
    breakWindowActive?: boolean;
  }): HdmiCecEvaluationResult {
    if (params.hdcpProtectedSurface) {
      return {
        actionRequested: params.action,
        sourceAddress: 'Playback_1 (0x04)',
        targetInput: params.targetInput,
        permitted: false,
        reason: 'HDCP/DRM protected surface active — CEC active source claim blocked cleanly; ordinary TV preserved.',
        ordinaryTvPreserved: true,
        hdcpRespected: true,
        hardwareTested: false,
      };
    }

    if (params.viewerPressedRemoteKey || params.action === 'inactive_source_release' || params.action === 'standby_yield') {
      return {
        actionRequested: params.action,
        sourceAddress: 'Playback_1 (0x04)',
        targetInput: 'LIVE_TUNER',
        permitted: true,
        reason: 'Issued CEC <Inactive Source> [0x9D] to restore viewer ordinary TV input cleanly.',
        ordinaryTvPreserved: true,
        hdcpRespected: true,
        hardwareTested: false,
      };
    }

    if (params.action === 'active_source_claim' && !params.breakWindowActive) {
      return {
        actionRequested: params.action,
        sourceAddress: 'Playback_1 (0x04)',
        targetInput: params.targetInput,
        permitted: false,
        reason: 'Rejected unsolicited HDMI-CEC Active Source hijack outside verified break or viewer command.',
        ordinaryTvPreserved: true,
        hdcpRespected: true,
        hardwareTested: false,
      };
    }

    return {
      actionRequested: params.action,
      sourceAddress: 'Playback_1 (0x04)',
      targetInput: params.targetInput,
      permitted: true,
      reason: 'Permitted HDMI-CEC Active Source transition inside verified break window with instant <Inactive Source> watchdog.',
      ordinaryTvPreserved: true,
      hdcpRespected: true,
      hardwareTested: false,
    };
  }

  discoverNearbyDevices(): Array<{
    discoveryProtocol: 'mDNS/_edison-aura._tcp' | 'DIAL/SSDP';
    tvLabel: string;
    platformId: AuraAdapterPlatformId;
    capabilities: string[];
    hardwareTested: false;
  }> {
    return [
      {
        discoveryProtocol: 'DIAL/SSDP',
        tvLabel: 'Living Room Android TV (Sim Discovery)',
        platformId: 'android_tv_tif',
        capabilities: ['power', 'volume', 'channel', 'dpad', 'multi_profile', 'scte35_cue'],
        hardwareTested: false,
      },
      {
        discoveryProtocol: 'mDNS/_edison-aura._tcp',
        tvLabel: 'Samsung Smart TV (Sim Discovery)',
        platformId: 'samsung_tizen',
        capabilities: ['power', 'volume', 'channel', 'dpad', 'avplay_h264'],
        hardwareTested: false,
      },
      {
        discoveryProtocol: 'mDNS/_edison-aura._tcp',
        tvLabel: 'HDMI-CEC Set-Top Companion (Sim Discovery)',
        platformId: 'hdmi_cec_stb',
        capabilities: ['power', 'volume', 'inactive_source_yield', 'dpad'],
        hardwareTested: false,
      },
    ];
  }

  initiatePairing(params: {
    ownerUserId: string;
    householdId?: string | null;
    tvLabel: string;
    platformId: AuraAdapterPlatformId;
  }): AuraPairedDeviceRecord {
    const deviceId = `aura_${crypto.randomBytes(5).toString('hex')}`;
    const pairingCode = String(crypto.randomInt(100_000, 999_999));
    const now = new Date().toISOString();
    const tvPlatform: TvPlatformId =
      params.platformId === 'hdmi_cec_stb' ? 'simulation_tv' : params.platformId;

    const record: AuraPairedDeviceRecord = {
      deviceId,
      ownerUserId: params.ownerUserId,
      householdId: params.householdId ?? null,
      tvLabel: params.tvLabel.trim(),
      platformId: params.platformId,
      pairingCode,
      qrPairingPayload: `edison://aura/pair?device=${deviceId}&pin=${pairingCode}`,
      pairingStatus: 'pending_pin',
      connectionState: 'disconnected',
      activeProfileId: null,
      capabilities: [...(OEM_NATIVE_CONTRACTS[params.platformId].requiredPrivileges), 'aura_dpad', 'ordinary_tv_yield'],
      reconnectAttemptCount: 0,
      nextReconnectBackoffMs: 1000,
      offlineQueue: [],
      tvState: edisonTvControlEngine.createDefaultTvState(tvPlatform),
      lastHeartbeatAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.devices.set(deviceId, record);
    return record;
  }

  confirmPairing(params: {
    deviceId: string;
    ownerUserId: string;
    pairingCode: string;
    activeProfileId?: string | null;
  }): AuraPairedDeviceRecord {
    const device = this.devices.get(params.deviceId);
    if (!device || device.ownerUserId !== params.ownerUserId) {
      throw new Error('AURA_DEVICE_NOT_FOUND');
    }
    if (device.pairingCode !== params.pairingCode.trim()) {
      throw new Error('AURA_PAIRING_PIN_INVALID');
    }
    const now = new Date().toISOString();
    device.pairingStatus = 'paired';
    device.connectionState = 'online';
    device.activeProfileId = params.activeProfileId ?? device.activeProfileId;
    device.reconnectAttemptCount = 0;
    device.nextReconnectBackoffMs = 1000;
    device.lastHeartbeatAt = now;
    device.updatedAt = now;
    return device;
  }

  bindActiveProfile(params: {
    deviceId: string;
    ownerUserId: string;
    profileId: string | null;
  }): AuraPairedDeviceRecord {
    const device = this.devices.get(params.deviceId);
    if (!device || device.ownerUserId !== params.ownerUserId) {
      throw new Error('AURA_DEVICE_NOT_FOUND');
    }
    device.activeProfileId = params.profileId;
    device.updatedAt = new Date().toISOString();
    return device;
  }

  recordHeartbeat(params: {
    deviceId: string;
    ownerUserId: string;
    networkOnline: boolean;
  }): AuraPairedDeviceRecord {
    const device = this.devices.get(params.deviceId);
    if (!device || device.ownerUserId !== params.ownerUserId) {
      throw new Error('AURA_DEVICE_NOT_FOUND');
    }
    const now = new Date().toISOString();
    if (!params.networkOnline) {
      device.pairingStatus = 'reconnecting';
      device.connectionState = 'offline_queued';
      device.reconnectAttemptCount += 1;
      device.nextReconnectBackoffMs = Math.min(30_000, 1000 * 2 ** (device.reconnectAttemptCount - 1));
    } else {
      device.pairingStatus = 'paired';
      device.connectionState = 'online';
      device.reconnectAttemptCount = 0;
      device.nextReconnectBackoffMs = 1000;
      // Flush offline queued remote commands upon reconnection
      while (device.offlineQueue.length > 0) {
        const queued = device.offlineQueue.shift()!;
        const tvPlatform: TvPlatformId =
          device.platformId === 'hdmi_cec_stb' ? 'simulation_tv' : device.platformId;
        const dispatch = edisonTvControlEngine.dispatchRemoteCommand({
          platformId: tvPlatform,
          intentSource: 'AURA',
          command: queued.command,
          targetInput: queued.targetInput,
          currentState: device.tvState,
        });
        device.tvState = dispatch.nextState;
      }
    }
    device.lastHeartbeatAt = now;
    device.updatedAt = now;
    return device;
  }

  dispatchAuraCommand(params: {
    deviceId: string;
    ownerUserId: string;
    command: TvRemoteCommand;
    targetInput?: TvInputSource;
  }): {
    device: AuraPairedDeviceRecord;
    queuedWhileOffline: boolean;
    executedImmediately: boolean;
    restorationOutcome: string;
    detail: string;
  } {
    const device = this.devices.get(params.deviceId);
    if (!device || device.ownerUserId !== params.ownerUserId) {
      throw new Error('AURA_DEVICE_NOT_FOUND');
    }
    if (device.pairingStatus === 'disconnected' || device.pairingStatus === 'pending_pin') {
      throw new Error('AURA_DEVICE_NOT_PAIRED: Confirm pairing PIN before dispatching commands.');
    }

    if (device.connectionState === 'offline_queued') {
      device.offlineQueue.push({
        commandId: `acmd_${crypto.randomBytes(4).toString('hex')}`,
        command: params.command,
        targetInput: params.targetInput,
        queuedAt: new Date().toISOString(),
      });
      device.updatedAt = new Date().toISOString();
      return {
        device,
        queuedWhileOffline: true,
        executedImmediately: false,
        restorationOutcome: 'queued_until_reconnect',
        detail: `Device reconnecting (backoff ${device.nextReconnectBackoffMs}ms); queued "${params.command}" safely without disturbing ordinary TV.`,
      };
    }

    const tvPlatform: TvPlatformId =
      device.platformId === 'hdmi_cec_stb' ? 'simulation_tv' : device.platformId;
    const result = edisonTvControlEngine.dispatchRemoteCommand({
      platformId: tvPlatform,
      intentSource: 'AURA',
      command: params.command,
      targetInput: params.targetInput,
      currentState: device.tvState,
    });
    device.tvState = result.nextState;
    device.updatedAt = new Date().toISOString();

    return {
      device,
      queuedWhileOffline: false,
      executedImmediately: true,
      restorationOutcome: result.restorationOutcome,
      detail: result.detail,
    };
  }

  disconnectDevice(params: { deviceId: string; ownerUserId: string }): AuraPairedDeviceRecord {
    const device = this.devices.get(params.deviceId);
    if (!device || device.ownerUserId !== params.ownerUserId) {
      throw new Error('AURA_DEVICE_NOT_FOUND');
    }
    // Always leave ordinary TV intact on AURA disconnect
    device.tvState = {
      ...device.tvState,
      adBreakOverlayActive: false,
      ordinaryTvIntact: true,
      activeInput: device.tvState.previousOrdinaryInput || 'LIVE_TUNER',
    };
    device.pairingStatus = 'disconnected';
    device.connectionState = 'disconnected';
    device.offlineQueue = [];
    device.updatedAt = new Date().toISOString();
    return device;
  }

  listUserDevices(ownerUserId: string): AuraPairedDeviceRecord[] {
    return Array.from(this.devices.values())
      .filter((d) => d.ownerUserId === ownerUserId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export const auraRemoteEngine = new AuraRemoteEngine();

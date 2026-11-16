import { describe, expect, it } from 'vitest';
import { EdisonTvControlEngine } from '../src/server/tvPlatformAdapter.ts';

describe('EDISON Block P3-C — Software-Only Modular TvPlatformAdapter & AURA Normal TV Remote', () => {
  it('exposes all 4 modular adapters strictly marked simulated and hardwareTested=false', () => {
    const engine = new EdisonTvControlEngine();
    const profiles = engine.listCapabilityProfiles();

    expect(profiles.map((p) => p.platformId)).toEqual([
      'simulation_tv',
      'android_tv_tif',
      'samsung_tizen',
      'lg_webos',
    ]);
    for (const profile of profiles) {
      expect(profile.isSimulated).toBe(true);
      expect(profile.hardwareTested).toBe(false);
      expect(profile.supportedRemoteCommands.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('executes conventional AURA normal remote commands without altering ordinary TV integrity', () => {
    const engine = new EdisonTvControlEngine();
    const initial = engine.createDefaultTvState('android_tv_tif');

    const volUp = engine.dispatchRemoteCommand({
      platformId: 'android_tv_tif',
      intentSource: 'AURA',
      command: 'volume_up',
      currentState: initial,
    });
    expect(volUp.ok).toBe(true);
    expect(volUp.isSoftwareSimulationOnly).toBe(true);
    expect(volUp.hardwareTested).toBe(false);
    expect(volUp.nextState.volume).toBe(28);
    expect(volUp.nextState.ordinaryTvIntact).toBe(true);
    expect(volUp.detail).toContain('AURA → EDISON Control Engine');

    const chUp = engine.dispatchRemoteCommand({
      platformId: 'android_tv_tif',
      intentSource: 'AURA',
      command: 'channel_up',
      currentState: volUp.nextState,
    });
    expect(chUp.ok).toBe(true);
    expect(chUp.nextState.channelNumber).toBe(102);

    const hdmiSwitch = engine.dispatchRemoteCommand({
      platformId: 'android_tv_tif',
      intentSource: 'AURA',
      command: 'input_source_select',
      targetInput: 'HDMI_1',
      currentState: chUp.nextState,
    });
    expect(hdmiSwitch.ok).toBe(true);
    expect(hdmiSwitch.nextState.activeInput).toBe('HDMI_1');
    expect(hdmiSwitch.nextState.previousOrdinaryInput).toBe('HDMI_1');
  });

  it('enforces standby safety and platform capability boundaries (e.g. LG webOS input_source_select)', () => {
    const engine = new EdisonTvControlEngine();
    const standbyState = {
      ...engine.createDefaultTvState('simulation_tv'),
      powerOn: false,
    };

    const ignored = engine.dispatchRemoteCommand({
      platformId: 'simulation_tv',
      intentSource: 'AURA',
      command: 'channel_up',
      currentState: standbyState,
    });
    expect(ignored.ok).toBe(false);
    expect(ignored.restorationOutcome).toBe('command_rejected_safely');
    expect(ignored.nextState.channelNumber).toBe(101);

    const webOsInput = engine.dispatchRemoteCommand({
      platformId: 'lg_webos',
      intentSource: 'AURA',
      command: 'input_source_select',
      targetInput: 'HDMI_2',
    });
    expect(webOsInput.ok).toBe(false);
    expect(webOsInput.restorationOutcome).toBe('command_rejected_safely');
    expect(webOsInput.nextState.activeInput).toBe('LIVE_TUNER');
  });

  it('triggers deterministic watchdog restoration to ordinary TV under all 4 injected fault modes', () => {
    const engine = new EdisonTvControlEngine();
    const faultModes = [
      'adapter_timeout',
      'hdcp_blocked',
      'decoder_crash',
      'network_drop',
    ] as const;

    for (const faultMode of faultModes) {
      const res = engine.dispatchRemoteCommand({
        platformId: 'android_tv_tif',
        intentSource: 'AURA',
        command: 'dpad_ok',
        faultMode,
        simulateActiveAdSession: true,
        currentState: {
          ...engine.createDefaultTvState('android_tv_tif'),
          previousOrdinaryInput: 'HDMI_2',
        },
      });
      expect(res.ok).toBe(false);
      expect(res.watchdogTriggered).toBe(true);
      expect(res.restorationOutcome).toBe('restored_to_ordinary_tv');
      expect(res.nextState.adBreakOverlayActive).toBe(false);
      expect(res.nextState.activeInput).toBe('HDMI_2');
      expect(res.nextState.ordinaryTvIntact).toBe(true);
      expect(res.nextState.lastRestoredAt).toBeTruthy();
    }
  });
});

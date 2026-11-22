import { describe, expect, it } from 'vitest';
import { parseHlsBreakCues } from '../src/server/hlsCueParser.ts';

describe('parseHlsBreakCues', () => {
  it('anchors cue start and end to the HLS program clock across segment durations', () => {
    const result = parseHlsBreakCues(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-PROGRAM-DATE-TIME:2026-11-22T10:00:00Z
#EXTINF:6.0,
segment-1.ts
#EXT-X-CUE-OUT:30
#EXTINF:10.0,
segment-2.ts
#EXTINF:10.0,
segment-3.ts
#EXT-X-CUE-IN
#EXTINF:4.0,
segment-4.ts`);

    expect(result.validPlaylist).toBe(true);
    expect(result.clockAnchored).toBe(true);
    expect(result.events).toEqual([
      {
        eventId: 'cue-20261122T100006000Z',
        type: 'break_start',
        source: 'hls_cue_tag',
        programDateTime: '2026-11-22T10:00:06.000Z',
        durationSeconds: 30,
      },
      {
        eventId: 'cue-20261122T100006000Z',
        type: 'break_end',
        source: 'hls_cue_tag',
        programDateTime: '2026-11-22T10:00:26.000Z',
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('recovers a break already in progress from CUE-OUT-CONT and an absolute clock', () => {
    const result = parseHlsBreakCues(`#EXTM3U
#EXT-X-PROGRAM-DATE-TIME:2026-11-22T10:00:20Z
#EXT-X-CUE-OUT-CONT:ElapsedTime=20.0,Duration=30.0
#EXTINF:6.0,
segment-20.ts`);

    expect(result.events).toEqual([
      {
        eventId: 'cue-20261122T100000000Z',
        type: 'break_start',
        source: 'hls_cue_tag',
        programDateTime: '2026-11-22T10:00:00.000Z',
        durationSeconds: 30,
        elapsedSeconds: 20,
        recoveredFromContinuation: true,
      },
      {
        eventId: 'cue-20261122T100000000Z',
        type: 'break_progress',
        source: 'hls_cue_tag',
        programDateTime: '2026-11-22T10:00:20.000Z',
        durationSeconds: 30,
        elapsedSeconds: 20,
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('accepts zero elapsed time and restores a start timestamp after an unanchored cue', () => {
    const result = parseHlsBreakCues(`#EXTM3U
#EXT-X-CUE-OUT:30
#EXTINF:10,
segment-unanchored.ts
#EXT-X-PROGRAM-DATE-TIME:2026-11-22T10:00:20Z
#EXT-X-CUE-OUT-CONT:ElapsedTime=20.0,Duration=30.0
#EXTINF:6,
segment-anchored.ts`);

    expect(result.events).toContainEqual({
      eventId: 'cue-20261122T100000000Z',
      type: 'break_start',
      source: 'hls_cue_tag',
      programDateTime: '2026-11-22T10:00:00.000Z',
      durationSeconds: 30,
      elapsedSeconds: 20,
      recoveredFromContinuation: true,
    });

    const zeroElapsed = parseHlsBreakCues(`#EXTM3U
#EXT-X-PROGRAM-DATE-TIME:2026-11-22T10:00:00Z
#EXT-X-CUE-OUT-CONT:ElapsedTime=0,Duration=30`);
    expect(zeroElapsed.events[0]).toMatchObject({
      type: 'break_start',
      programDateTime: '2026-11-22T10:00:00.000Z',
      elapsedSeconds: 0,
    });
  });

  it('parses SCTE-35 DATERANGE hex signaling and computes its end clock', () => {
    const result = parseHlsBreakCues(`#EXTM3U
#EXT-X-DATERANGE:ID="break-7",CLASS="com.apple.scte35",START-DATE="2026-11-22T10:00:00Z",DURATION=30.0,SCTE35-OUT=0xFC302000000000000000FFF0000000000000000000000000000000`);

    expect(result.events).toEqual([
      {
        eventId: 'daterange:break-7',
        type: 'break_start',
        source: 'scte35_daterange',
        programDateTime: '2026-11-22T10:00:00.000Z',
        durationSeconds: 30,
      },
      {
        eventId: 'daterange:break-7',
        type: 'break_end',
        source: 'scte35_daterange',
        programDateTime: '2026-11-22T10:00:30.000Z',
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('deduplicates equivalent SCTE-35 DATERANGE and cue-tag boundaries', () => {
    const result = parseHlsBreakCues(`#EXTM3U
#EXT-X-PROGRAM-DATE-TIME:2026-11-22T10:00:00Z
#EXT-X-DATERANGE:ID="break-9",START-DATE="2026-11-22T10:00:00Z",DURATION=30,SCTE35-OUT=0xFC302000000000000000FFF0000000000000000000000000000000
#EXT-X-CUE-OUT:30
#EXTINF:30,
segment.ts
#EXT-X-CUE-IN`);

    expect(result.events).toHaveLength(2);
    expect(result.events.map((event) => event.source)).toEqual([
      'scte35_daterange',
      'scte35_daterange',
    ]);
  });

  it('does not invent absolute times when the playlist clock is unanchored or discontinuous', () => {
    const result = parseHlsBreakCues(`#EXTM3U
#EXT-X-CUE-OUT:30
#EXTINF:10,
segment-1.ts
#EXT-X-DISCONTINUITY
#EXT-X-CUE-IN`);

    expect(result.events).toEqual([
      {
        eventId: 'cue-line-2',
        type: 'break_start',
        source: 'hls_cue_tag',
        programDateTime: null,
        durationSeconds: 30,
      },
      {
        eventId: 'cue-line-2',
        type: 'break_end',
        source: 'hls_cue_tag',
        programDateTime: null,
      },
    ]);
    expect(result.clockAnchored).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it('drops the absolute clock after a segment has no valid duration', () => {
    const result = parseHlsBreakCues(`#EXTM3U
#EXT-X-PROGRAM-DATE-TIME:2026-11-22T10:00:00Z
#EXTINF:6,
segment-1.ts
#EXTINF:invalid,
segment-2.ts
#EXT-X-CUE-OUT:30`);

    expect(result.events[0].programDateTime).toBeNull();
    expect(result.warnings.map((warning) => warning.code)).toContain('invalid_segment_duration');
    expect(result.warnings.map((warning) => warning.code)).toContain('missing_segment_duration');
  });

  it('rejects invalid playlists and malformed SCTE-35 payloads without emitting cues', () => {
    const notHls = parseHlsBreakCues('not an HLS playlist');
    expect(notHls.validPlaylist).toBe(false);
    expect(notHls.events).toEqual([]);

    const malformedScte = parseHlsBreakCues(`#EXTM3U
#EXT-X-DATERANGE:ID="break-8",START-DATE="2026-11-22T10:00:00Z",SCTE35-OUT="not-hex"`);
    expect(malformedScte.events).toEqual([]);
    expect(malformedScte.warnings.map((warning) => warning.code)).toContain('invalid_scte35_daterange');
  });
});

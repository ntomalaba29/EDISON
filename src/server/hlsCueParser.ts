export type HlsBreakCueEventType = 'break_start' | 'break_progress' | 'break_end';
export type HlsBreakCueSource = 'hls_cue_tag' | 'scte35_daterange';

export interface HlsBreakCueEvent {
  eventId: string;
  type: HlsBreakCueEventType;
  source: HlsBreakCueSource;
  programDateTime: string | null;
  durationSeconds?: number;
  elapsedSeconds?: number;
  recoveredFromContinuation?: boolean;
  spliceEventId?: number;
  autoReturn?: boolean;
}

export interface HlsCueParseWarning {
  line: number;
  code: string;
  message: string;
}

export interface HlsCueParseResult {
  validPlaylist: boolean;
  clockAnchored: boolean;
  events: HlsBreakCueEvent[];
  warnings: HlsCueParseWarning[];
}

interface ActiveCue {
  eventId: string;
  startMs: number | null;
  durationSeconds?: number;
}

const MAX_PLAYLIST_CHARS = 1_000_000;
const MAX_LINE_CHARS = 8_192;
const MAX_DURATION_SECONDS = 7 * 24 * 60 * 60;
const ISO_DATE_TIME_WITH_ZONE = /T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;
const SCTE35_HEX = /^0x(?:[a-f0-9]{2}){3,}$/i;
const SCTE35_SPLICE_INSERT = 0x05;

interface DecodedSpliceInsert {
  spliceEventId: number;
  outOfNetwork: boolean;
  autoReturn?: boolean;
  breakDurationSeconds?: number;
}

function crc32Mpeg2(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte << 24;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x80000000) !== 0 ? ((crc << 1) ^ 0x04c11db7) >>> 0 : (crc << 1) >>> 0;
    }
  }
  return crc >>> 0;
}

function decode33BitValue(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] & 1) * 0x1_0000_0000 +
    bytes[offset + 1] * 0x1_0000_00 +
    bytes[offset + 2] * 0x1_0000 +
    bytes[offset + 3] * 0x100 +
    bytes[offset + 4];
}

function readSpliceTime(bytes: Uint8Array, offset: number, end: number): number | null {
  if (offset >= end) return null;
  const first = bytes[offset];
  if ((first & 0x80) === 0) return offset + 1;
  return offset + 5 <= end ? offset + 5 : null;
}

function decodeScte35SpliceInsert(hexPayload: string): DecodedSpliceInsert | null {
  const payload = hexPayload.slice(2);
  if (!SCTE35_HEX.test(hexPayload) || payload.length % 2 !== 0) return null;
  const bytes = Uint8Array.from(
    payload.match(/.{2}/g) ?? [],
    (byte) => Number.parseInt(byte, 16)
  );
  if (bytes.length < 20 || bytes[0] !== 0xfc) return null;

  const sectionLength = ((bytes[1] & 0x0f) << 8) | bytes[2];
  if (
    (bytes[1] & 0xf0) !== 0x30 ||
    sectionLength < 17 ||
    sectionLength > 4093 ||
    bytes.length !== sectionLength + 3 ||
    crc32Mpeg2(bytes) !== 0
  ) {
    return null;
  }

  if (bytes[3] !== 0 || (bytes[4] & 0x80) !== 0) return null;
  const commandLength = ((bytes[11] & 0x0f) << 8) | bytes[12];
  const commandType = bytes[13];
  const commandStart = 14;
  const commandEnd = commandStart + commandLength;
  const descriptorLengthOffset = bytes.length - 6;
  const descriptorLoopLength =
    descriptorLengthOffset >= 0
      ? bytes[descriptorLengthOffset] * 0x100 + bytes[descriptorLengthOffset + 1]
      : -1;
  if (
    commandLength === 0x0fff ||
    commandEnd > descriptorLengthOffset ||
    commandEnd + 2 + descriptorLoopLength !== bytes.length - 4 ||
    commandType !== SCTE35_SPLICE_INSERT
  ) {
    return null;
  }

  const command = bytes.subarray(commandStart, commandEnd);
  if (command.length < 5) return null;
  const spliceEventId =
    command[0] * 0x1_000000 +
    command[1] * 0x1_0000 +
    command[2] * 0x100 +
    command[3];
  const cancel = (command[4] & 0x80) !== 0;
  if (cancel) return null;
  if (command.length < 6) return null;

  const flags = command[5];
  const outOfNetwork = (flags & 0x80) !== 0;
  const programSplice = (flags & 0x40) !== 0;
  const durationFlag = (flags & 0x20) !== 0;
  const immediate = (flags & 0x10) !== 0;
  let cursor = 6;

  if (programSplice && !immediate) {
    const next = readSpliceTime(command, cursor, command.length);
    if (next === null) return null;
    cursor = next;
  } else if (!programSplice) {
    if (cursor >= command.length) return null;
    const componentCount = command[cursor];
    cursor += 1;
    for (let component = 0; component < componentCount; component += 1) {
      if (cursor >= command.length) return null;
      cursor += 1;
      if (!immediate) {
        const next = readSpliceTime(command, cursor, command.length);
        if (next === null) return null;
        cursor = next;
      }
    }
  }

  let autoReturn: boolean | undefined;
  let breakDurationSeconds: number | undefined;
  if (durationFlag) {
    if (cursor + 5 > command.length) return null;
    autoReturn = (command[cursor] & 0x80) !== 0;
    breakDurationSeconds = decode33BitValue(command, cursor) / 90_000;
    cursor += 5;
  }

  if (cursor + 4 !== command.length) return null;
  return { spliceEventId, outOfNetwork, autoReturn, breakDurationSeconds };
}

function parseIsoDateTime(value: string): number | null {
  if (!ISO_DATE_TIME_WITH_ZONE.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDuration(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_DURATION_SECONDS
    ? parsed
    : null;
}

function parseElapsedTime(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_DURATION_SECONDS
    ? parsed
    : null;
}

function parseAttributeList(input: string): Record<string, string> | null {
  const attributes: Record<string, string> = {};
  let index = 0;

  while (index < input.length) {
    while (input[index] === ' ' || input[index] === '\t') index += 1;
    const keyStart = index;
    while (/[A-Za-z0-9-]/.test(input[index] ?? '')) index += 1;
    if (index === keyStart || input[index] !== '=') return null;

    const key = input.slice(keyStart, index).toUpperCase();
    if (Object.prototype.hasOwnProperty.call(attributes, key)) return null;
    index += 1;

    let value = '';
    if (input[index] === '"') {
      index += 1;
      const valueStart = index;
      while (index < input.length && input[index] !== '"') index += 1;
      if (index >= input.length) return null;
      value = input.slice(valueStart, index);
      index += 1;
    } else {
      const valueStart = index;
      while (index < input.length && input[index] !== ',') index += 1;
      value = input.slice(valueStart, index).trim();
      if (value === '') return null;
    }

    attributes[key] = value;
    while (input[index] === ' ' || input[index] === '\t') index += 1;
    if (index === input.length) break;
    if (input[index] !== ',') return null;
    index += 1;
    if (index === input.length) return null;
  }

  return attributes;
}

function toIsoDateTime(milliseconds: number | null): string | null {
  return milliseconds === null ? null : new Date(milliseconds).toISOString();
}

function makeCueEventId(startMs: number | null, line: number): string {
  return startMs === null
    ? `cue-line-${line}`
    : `cue-${new Date(startMs).toISOString().replace(/[-:.]/g, '')}`;
}

function makeWarning(line: number, code: string, message: string): HlsCueParseWarning {
  return { line, code, message };
}

function deduplicateAnchoredEvents(events: HlsBreakCueEvent[]): HlsBreakCueEvent[] {
  const uniqueEvents: HlsBreakCueEvent[] = [];
  for (const event of events) {
    const duplicateIndex =
      event.programDateTime === null
        ? -1
        : uniqueEvents.findIndex(
            (existing) =>
              existing.type === event.type &&
              existing.programDateTime === event.programDateTime
          );
    if (duplicateIndex === -1) {
      uniqueEvents.push(event);
    } else if (
      event.source === 'scte35_daterange' &&
      uniqueEvents[duplicateIndex].source !== 'scte35_daterange'
    ) {
      uniqueEvents[duplicateIndex] = event;
    }
  }
  return uniqueEvents;
}

function parseDaterange(
  value: string,
  line: number,
  events: HlsBreakCueEvent[],
  warnings: HlsCueParseWarning[]
): void {
  const attributes = parseAttributeList(value);
  const eventId = attributes?.ID;
  const startValue = attributes?.['START-DATE'];
  const outPayload = attributes?.['SCTE35-OUT'];
  const inPayload = attributes?.['SCTE35-IN'];

  if (!attributes || !eventId || !startValue || (!!outPayload === !!inPayload)) {
    warnings.push(
      makeWarning(
        line,
        'invalid_daterange',
        'SCTE-35 DATERANGE must have a valid ID, START-DATE, and exactly one of SCTE35-OUT or SCTE35-IN.'
      )
    );
    return;
  }

  const startMs = parseIsoDateTime(startValue);
  const payload = outPayload ?? inPayload;
  const decoded = payload ? decodeScte35SpliceInsert(payload) : null;
  if (startMs === null || !decoded) {
    warnings.push(
      makeWarning(
        line,
        'invalid_scte35_daterange',
        'Invalid DATERANGE clock or SCTE-35 splice_insert payload (unsupported, encrypted, or invalid section/CRC).'
      )
    );
    return;
  }

  const isOut = outPayload !== undefined && decoded.outOfNetwork;
  if ((outPayload !== undefined) !== decoded.outOfNetwork) {
    warnings.push(
      makeWarning(
        line,
        'scte35_direction_mismatch',
        'DATERANGE SCTE35-OUT/IN attribute conflicts with the decoded splice_insert direction.'
      )
    );
    return;
  }
  const safeEventId = eventId.replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 100);
  const event: HlsBreakCueEvent = {
    eventId: `daterange-${safeEventId}`,
    type: isOut ? 'break_start' : 'break_end',
    source: 'scte35_daterange',
    programDateTime: toIsoDateTime(startMs),
    spliceEventId: decoded.spliceEventId,
    autoReturn: decoded.autoReturn,
  };

  if (isOut) {
    const durationValue = attributes.DURATION;
    const endValue = attributes['END-DATE'];
    let duration =
      decoded.breakDurationSeconds !== undefined && decoded.breakDurationSeconds > 0
        ? decoded.breakDurationSeconds
        : undefined;
    let endMs: number | undefined;
    if (durationValue !== undefined) {
      const parsedDuration = parseDuration(durationValue);
      if (parsedDuration === null) {
        warnings.push(
          makeWarning(line, 'invalid_daterange_clock', 'DATERANGE has an invalid or conflicting duration/end date.')
        );
        return;
      }
      if (
        duration !== undefined &&
        Math.abs(parsedDuration - duration) > 1
      ) {
        warnings.push(
          makeWarning(
            line,
            'scte35_duration_mismatch',
            'DATERANGE duration conflicts with the decoded SCTE-35 break duration.'
          )
        );
        return;
      }
      duration = parsedDuration;
    }
    if (endValue !== undefined) {
      const parsedEndMs = parseIsoDateTime(endValue);
      if (parsedEndMs === null) {
        warnings.push(
          makeWarning(line, 'invalid_daterange_clock', 'DATERANGE has an invalid or conflicting duration/end date.')
        );
        return;
      }
      endMs = parsedEndMs;
    }

    if (
      (endMs !== undefined && endMs <= startMs) ||
      (duration !== undefined &&
        endMs !== undefined &&
        Math.abs(endMs - startMs - duration * 1_000) > 1_000)
    ) {
      warnings.push(
        makeWarning(line, 'invalid_daterange_clock', 'DATERANGE has an invalid or conflicting duration/end date.')
      );
      return;
    }

    if (duration !== undefined) event.durationSeconds = duration;
    events.push(event);
    if (
      endMs !== undefined ||
      (duration !== undefined &&
        (durationValue !== undefined || decoded.autoReturn === true))
    ) {
      const endDateMs = endMs ?? startMs + (duration ?? 0) * 1_000;
      events.push({
        eventId: event.eventId,
        type: 'break_end',
        source: 'scte35_daterange',
        programDateTime: toIsoDateTime(endDateMs),
      });
    }
    return;
  }

  events.push(event);
}

export function parseHlsBreakCues(playlist: string): HlsCueParseResult {
  const events: HlsBreakCueEvent[] = [];
  const warnings: HlsCueParseWarning[] = [];
  const emptyResult = (validPlaylist: boolean): HlsCueParseResult => ({
    validPlaylist,
    clockAnchored: false,
    events,
    warnings,
  });

  if (playlist.length > MAX_PLAYLIST_CHARS) {
    warnings.push(makeWarning(0, 'playlist_too_large', 'Playlist exceeds the 1 MB parsing limit.'));
    return emptyResult(false);
  }

  const lines = playlist.replace(/^\uFEFF/, '').split(/\r?\n/);
  const firstLine = lines.find((line) => line.trim() !== '')?.trim();
  if (firstLine !== '#EXTM3U') {
    warnings.push(makeWarning(0, 'invalid_playlist', 'Input is not an HLS playlist beginning with #EXTM3U.'));
    return emptyResult(false);
  }

  let clockAnchored = false;
  let programDateTimeMs: number | null = null;
  let pendingSegmentDuration: number | null = null;
  const cueState: { current: ActiveCue | null } = { current: null };

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index].trim();
    if (line.length === 0 || line === '#EXTM3U') continue;
    if (line.length > MAX_LINE_CHARS) {
      warnings.push(makeWarning(lineNumber, 'line_too_large', 'Playlist line exceeds the 8 KB parsing limit.'));
      continue;
    }

    if (line.startsWith('#EXT-X-PROGRAM-DATE-TIME:')) {
      const value = line.slice('#EXT-X-PROGRAM-DATE-TIME:'.length);
      programDateTimeMs = parseIsoDateTime(value);
      if (programDateTimeMs === null) {
        warnings.push(
          makeWarning(lineNumber, 'invalid_program_date_time', 'PROGRAM-DATE-TIME must be an ISO timestamp with a timezone.')
        );
      } else {
        clockAnchored = true;
      }
      continue;
    }

    if (line === '#EXT-X-DISCONTINUITY') {
      programDateTimeMs = null;
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      const rawDuration = line.slice('#EXTINF:'.length).split(',', 1)[0].trim();
      pendingSegmentDuration = parseDuration(rawDuration);
      if (pendingSegmentDuration === null) {
        warnings.push(makeWarning(lineNumber, 'invalid_segment_duration', 'EXTINF duration must be finite and positive.'));
      }
      continue;
    }

    if (line.startsWith('#EXT-X-DATERANGE:')) {
      const eventCount = events.length;
      parseDaterange(line.slice('#EXT-X-DATERANGE:'.length), lineNumber, events, warnings);
      if (events.length > eventCount) clockAnchored = true;
      continue;
    }

    if (line.startsWith('#EXT-X-CUE-OUT:')) {
      if (cueState.current) {
        warnings.push(makeWarning(lineNumber, 'nested_cue_out', 'A new CUE-OUT arrived before the active cue ended.'));
        continue;
      }

      const rawValue = line.slice('#EXT-X-CUE-OUT:'.length);
      const attributes = rawValue.includes('=') ? parseAttributeList(rawValue) : null;
      const duration = attributes
        ? parseDuration(attributes.DURATION ?? attributes.DURATIONSEC)
        : parseDuration(rawValue);
      if (duration === null) {
        warnings.push(makeWarning(lineNumber, 'invalid_cue_out', 'CUE-OUT must provide a positive finite duration.'));
        continue;
      }

      const eventId = makeCueEventId(programDateTimeMs, lineNumber);
      cueState.current = { eventId, startMs: programDateTimeMs, durationSeconds: duration };
      events.push({
        eventId,
        type: 'break_start',
        source: 'hls_cue_tag',
        programDateTime: toIsoDateTime(programDateTimeMs),
        durationSeconds: duration,
      });
      continue;
    }

    if (line.startsWith('#EXT-X-CUE-OUT-CONT:')) {
      const attributes = parseAttributeList(line.slice('#EXT-X-CUE-OUT-CONT:'.length));
      const elapsed = parseElapsedTime(attributes?.ELAPSEDTIME);
      const duration = parseDuration(attributes?.DURATION);
      if (elapsed === null || duration === null || elapsed > duration) {
        warnings.push(
          makeWarning(lineNumber, 'invalid_cue_continuation', 'CUE-OUT-CONT requires valid ElapsedTime and Duration values.')
        );
        continue;
      }

      const recoveredStartMs: number | null =
        cueState.current?.startMs ??
        (programDateTimeMs === null ? null : programDateTimeMs - elapsed * 1_000);
      if (!cueState.current) {
        if (recoveredStartMs === null) {
          warnings.push(
            makeWarning(lineNumber, 'unanchored_cue_continuation', 'Cannot recover a break start without PROGRAM-DATE-TIME.')
          );
          continue;
        }
        const eventId = makeCueEventId(recoveredStartMs, lineNumber);
        cueState.current = { eventId, startMs: recoveredStartMs, durationSeconds: duration };
        events.push({
          eventId,
          type: 'break_start',
          source: 'hls_cue_tag',
          programDateTime: toIsoDateTime(recoveredStartMs),
          durationSeconds: duration,
          elapsedSeconds: elapsed,
          recoveredFromContinuation: true,
        });
      } else {
        if (
          cueState.current.durationSeconds !== undefined &&
          Math.abs(cueState.current.durationSeconds - duration) > 1
        ) {
          warnings.push(
            makeWarning(lineNumber, 'cue_duration_changed', 'CUE-OUT-CONT duration conflicts with the active cue duration.')
          );
          continue;
        }
        if (cueState.current.startMs === null && recoveredStartMs !== null) {
          cueState.current.eventId = makeCueEventId(recoveredStartMs, lineNumber);
          cueState.current.startMs = recoveredStartMs;
          events.push({
            eventId: cueState.current.eventId,
            type: 'break_start',
            source: 'hls_cue_tag',
            programDateTime: toIsoDateTime(recoveredStartMs),
            durationSeconds: duration,
            elapsedSeconds: elapsed,
            recoveredFromContinuation: true,
          });
        }
      }

      events.push({
        eventId: cueState.current.eventId,
        type: 'break_progress',
        source: 'hls_cue_tag',
        programDateTime: toIsoDateTime(programDateTimeMs),
        durationSeconds: duration,
        elapsedSeconds: elapsed,
      });
      continue;
    }

    if (line === '#EXT-X-CUE-IN') {
      if (!cueState.current) {
        warnings.push(makeWarning(lineNumber, 'cue_in_without_out', 'CUE-IN arrived without an active CUE-OUT.'));
        continue;
      }
      events.push({
        eventId: cueState.current.eventId,
        type: 'break_end',
        source: 'hls_cue_tag',
        programDateTime: toIsoDateTime(programDateTimeMs),
      });
      cueState.current = null;
      continue;
    }

    if (!line.startsWith('#')) {
      if (pendingSegmentDuration === null) {
        warnings.push(makeWarning(lineNumber, 'missing_segment_duration', 'Media URI has no valid preceding EXTINF duration.'));
        programDateTimeMs = null;
      } else if (programDateTimeMs !== null) {
        programDateTimeMs += pendingSegmentDuration * 1_000;
      }
      pendingSegmentDuration = null;
    }
  }

  return {
    validPlaylist: true,
    clockAnchored,
    events: deduplicateAnchoredEvents(events),
    warnings,
  };
}

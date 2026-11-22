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
    ? `cue:line:${line}`
    : `cue:${new Date(startMs).toISOString()}`;
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
  if (startMs === null || !payload || !SCTE35_HEX.test(payload)) {
    warnings.push(
      makeWarning(line, 'invalid_scte35_daterange', 'Invalid DATERANGE clock or SCTE-35 hexadecimal payload.')
    );
    return;
  }

  const isOut = outPayload !== undefined;
  const event: HlsBreakCueEvent = {
    eventId: `daterange:${eventId}`,
    type: isOut ? 'break_start' : 'break_end',
    source: 'scte35_daterange',
    programDateTime: toIsoDateTime(startMs),
  };

  if (isOut) {
    const durationValue = attributes.DURATION;
    const endValue = attributes['END-DATE'];
    let duration: number | undefined;
    let endMs: number | undefined;
    if (durationValue !== undefined) {
      const parsedDuration = parseDuration(durationValue);
      if (parsedDuration === null) {
        warnings.push(
          makeWarning(line, 'invalid_daterange_clock', 'DATERANGE has an invalid or conflicting duration/end date.')
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
    if (endMs !== undefined || duration !== undefined) {
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
      parseDaterange(line.slice('#EXT-X-DATERANGE:'.length), lineNumber, events, warnings);
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

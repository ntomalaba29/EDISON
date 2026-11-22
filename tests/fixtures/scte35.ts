function crc32Mpeg2(bytes: number[]): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte << 24;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x80000000) !== 0 ? ((crc << 1) ^ 0x04c11db7) >>> 0 : (crc << 1) >>> 0;
    }
  }
  return crc >>> 0;
}

export function makeSpliceInsertPayload(options: {
  outOfNetwork?: boolean;
  commandType?: number;
  durationTicks?: number;
  autoReturn?: boolean;
} = {}): string {
  const eventId = 0x01020304;
  const durationTicks = BigInt(options.durationTicks ?? 30 * 90_000);
  const command = [
    (eventId >>> 24) & 0xff,
    (eventId >>> 16) & 0xff,
    (eventId >>> 8) & 0xff,
    eventId & 0xff,
    0x7f,
    (options.outOfNetwork === false ? 0 : 0x80) | 0x40 | 0x20 | 0x10,
    (options.autoReturn === false ? 0 : 0x80) | Number((durationTicks >> 32n) & 1n),
    Number((durationTicks >> 24n) & 0xffn),
    Number((durationTicks >> 16n) & 0xffn),
    Number((durationTicks >> 8n) & 0xffn),
    Number(durationTicks & 0xffn),
    0x00,
    0x01,
    0x00,
    0x00,
  ];
  const sectionLength = 1 + 5 + 1 + 3 + 1 + command.length + 2 + 4;
  const section = [
    0xfc,
    0x30 | ((sectionLength >> 8) & 0x0f),
    sectionLength & 0xff,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0xff,
    0xf0 | ((command.length >> 8) & 0x0f),
    command.length & 0xff,
    options.commandType ?? 0x05,
    ...command,
    0x00,
    0x00,
  ];
  const crc = crc32Mpeg2(section);
  section.push((crc >>> 24) & 0xff, (crc >>> 16) & 0xff, (crc >>> 8) & 0xff, crc & 0xff);
  return `0x${section.map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

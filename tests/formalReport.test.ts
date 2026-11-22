import { describe, expect, it } from 'vitest';
import { generateFormalReport, type ReportCommandType } from '../src/data/phase1Data';

describe('formal report subphase progress', () => {
  it.each<ReportCommandType>(['PHASE_1_COMPLETION', 'STATUS', 'CHECK', 'NEXT', 'COMMIT'])(
    'includes the completed/total subphase fraction in %s reports',
    (command) => {
      const report = generateFormalReport(command, null);

      expect(report.body).toContain('EXECUTABLE SUBPHASE PROGRESS: 48 / 69 complete (69.6%)');
    }
  );
});

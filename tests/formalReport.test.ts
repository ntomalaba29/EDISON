import { describe, expect, it } from 'vitest';
import { generateFormalReport, type ReportCommandType } from '../src/data/phase1Data';

describe('formal report subphase progress', () => {
  it.each<ReportCommandType>(['PHASE_1_COMPLETION', 'STATUS', 'CHECK', 'NEXT', 'COMMIT'])(
    'includes the completed/total subphase fraction in %s reports',
    (command) => {
      const report = generateFormalReport(command, null);

      expect(report.body).toContain('EXECUTABLE SUBPHASE PROGRESS: 77 / 99 complete (77.8%)');
      expect(report.body).not.toContain('85.0%');
      expect(report.body).not.toContain('87.1%');
      expect(report.body).not.toContain('No Legal Counsel Dependency');
    }
  );
});

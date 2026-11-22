import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

describe('cross-platform clean script', () => {
  let tempRoot: string | undefined;

  afterEach(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
    tempRoot = undefined;
  });

  it('removes only the build outputs from its working directory', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'edison-clean-test-'));
    fs.mkdirSync(path.join(tempRoot, 'dist', 'assets'), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, 'dist', 'assets', 'app.js'), 'generated');
    fs.writeFileSync(path.join(tempRoot, 'server.js'), 'generated');
    fs.writeFileSync(path.join(tempRoot, 'keep.txt'), 'preserve');

    const scriptPath = path.resolve(process.cwd(), 'scripts', 'clean.mjs');
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: tempRoot,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(tempRoot, 'dist'))).toBe(false);
    expect(fs.existsSync(path.join(tempRoot, 'server.js'))).toBe(false);
    expect(fs.readFileSync(path.join(tempRoot, 'keep.txt'), 'utf8')).toBe('preserve');
  });
});

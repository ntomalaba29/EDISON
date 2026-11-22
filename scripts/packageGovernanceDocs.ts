import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GOVERNANCE_DOCS_ALLOWLIST } from '../src/server/docsRegistry.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destinationRoot = path.join(rootDir, 'dist', 'governance-docs');

for (const doc of GOVERNANCE_DOCS_ALLOWLIST) {
  const sourcePath = path.resolve(rootDir, doc.filename);
  const destinationPath = path.resolve(destinationRoot, doc.filename);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

console.info(`Packaged ${GOVERNANCE_DOCS_ALLOWLIST.length} allowlisted governance documents.`);

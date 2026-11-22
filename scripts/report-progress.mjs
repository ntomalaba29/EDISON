import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ledgerPath = path.join(root, 'execution-ledger.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

if (!Number.isInteger(ledger.completed) || !Number.isInteger(ledger.total)) {
  throw new Error('Execution ledger counts must be integers.');
}
if (ledger.completed < 0 || ledger.total < 1 || ledger.completed > ledger.total) {
  throw new Error('Execution ledger counts are outside the valid 0..total range.');
}
if (!ledger.nextTask || !ledger.currentPhase) {
  throw new Error('Execution ledger must identify the current phase and next task.');
}

const percentage = ((ledger.completed / ledger.total) * 100).toFixed(1);
console.log(
  `EDISON progress: ${ledger.completed}/${ledger.total} (${percentage}%); current phase: ${ledger.currentPhase}; next task: ${ledger.nextTask}`,
);

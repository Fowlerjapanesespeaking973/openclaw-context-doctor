import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

export function runTsxEvalJson(code) {
  const tempFile = path.join(
    REPO_ROOT,
    `.tmp-tsx-eval-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`,
  );
  fs.writeFileSync(tempFile, code, 'utf8');

  let stdout = '';

  try {
    stdout = execFileSync('pnpm', ['exec', 'tsx', tempFile], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
  } finally {
    fs.rmSync(tempFile, { force: true });
  }

  return JSON.parse(stdout);
}

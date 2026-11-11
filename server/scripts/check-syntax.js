// Runs `node --check` on every .js file under src/ and scripts/.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.js')) yield full;
  }
}

let failed = 0;
let count = 0;
for (const dir of ['src', 'scripts']) {
  for (const file of walk(join(root, dir))) {
    count += 1;
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      failed += 1;
      console.error(`✗ ${relative(root, file)}\n${result.stderr}`);
    }
  }
}
console.log(`${count - failed}/${count} files passed node --check`);
process.exit(failed ? 1 : 0);

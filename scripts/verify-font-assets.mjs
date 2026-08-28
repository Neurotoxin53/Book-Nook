import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const lock = JSON.parse(await readFile(path.join(root, 'config/google-fonts.lock.json'), 'utf8'));
let checked = 0;

for (const family of lock.families) {
  for (const file of family.files) {
    const bytes = await readFile(path.join(root, 'public/fonts', file.filename));
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== file.sha256) throw new Error(`Font checksum mismatch: ${file.filename}`);
    checked += 1;
  }
}

if (lock.families.length !== 36) throw new Error(`Expected 36 font families; found ${lock.families.length}.`);
console.log(`Verified ${checked} pinned font files across ${lock.families.length} families.`);


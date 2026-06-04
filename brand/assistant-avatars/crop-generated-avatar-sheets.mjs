import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_DIR = '/Users/wangtonglin/.codex/generated_images/019e6035-eeae-7a51-92bf-f6f7cb9cc516';
const APP_DIR = join(ROOT, 'apps/mp-client/miniprogram/assets/assistants');
const DEMO_DIR = join(ROOT, 'demo/mp-preview/assets/assistants');

const sheets = [
  ['business', 'ig_0d15098d2fe2d012016a192c55d3308193b4e05746cb1ab8c4.png'],
  ['tea', 'ig_0d15098d2fe2d012016a192c99690081938e84eb6fb518c2de.png'],
  ['wine', 'ig_0d15098d2fe2d012016a192d5f2a688193b6c50bc06ded0d90.png'],
  ['golf', 'ig_0d15098d2fe2d012016a192daf027c8193b86add77c1f1a312.png'],
  ['city', 'ig_0d15098d2fe2d012016a192e7d25a08193b0bc409b9d92c642.png']
];

const cells = [
  [24, 24],
  [24, 529],
  [24, 1034],
  [526, 24],
  [526, 529],
  [526, 1034]
];

mkdirSync(APP_DIR, { recursive: true });
mkdirSync(DEMO_DIR, { recursive: true });

for (const [scene, filename] of sheets) {
  const source = join(SOURCE_DIR, filename);
  cells.forEach(([offsetY, offsetX], index) => {
    const seq = String(index + 1).padStart(2, '0');
    const out = join(APP_DIR, `${scene}-${seq}.jpg`);
    execFileSync('sips', [
      '-c', '478', '478',
      '--cropOffset', String(offsetY), String(offsetX),
      '-s', 'format', 'jpeg',
      '-s', 'formatOptions', '86',
      source,
      '--out', out
    ], { stdio: 'ignore' });
    copyFileSync(out, join(DEMO_DIR, `${scene}-${seq}.jpg`));
  });
}

console.log('Cropped 30 assistant avatars.');

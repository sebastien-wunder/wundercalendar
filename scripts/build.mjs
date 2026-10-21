// Copies public/ to dist/ and checks that the output is self-contained.
import { cpSync, rmSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const src = join(root, 'public');
const out = join(root, 'dist');

rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });

const required = [
  'index.html', 'styles.css', 'app.js',
  'assets/scene-desktop.avif', 'assets/scene-mobile.avif',
  'assets/elf-top.avif', 'assets/elf-feet.avif',
  'assets/fonts/BovineMVB.otf',
  'assets/fonts/SourceSans3-latin.woff2', 'assets/fonts/SourceSans3-latin-ext.woff2'
];
const missing = required.filter((f) => !existsSync(join(out, f)));
if (missing.length) { console.error('Missing files:', missing.join(', ')); process.exit(1); }

// No runtime resource may come from the original site, localhost or Google Fonts.
const banned = [/wundercalendar\.netlify\.app/i, /localhost/i, /fonts\.googleapis\.com/i, /fonts\.gstatic\.com/i];
const bad = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(html|css|js)$/.test(name)) {
      const text = readFileSync(p, 'utf8');
      banned.forEach((re) => { if (re.test(text)) bad.push(`${p}: ${re}`); });
    }
  }
})(out);
if (bad.length) { console.error('External/local references found:\n' + bad.join('\n')); process.exit(1); }

console.log('Build OK -> dist/ (' + required.length + ' required files present, no external references)');

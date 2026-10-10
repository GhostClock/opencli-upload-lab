import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
if (!process.argv[2]) throw new Error('Usage: node scripts/build.mjs <upstream-extension-directory>');
const source = fs.realpathSync(process.argv[2]);
const output = path.join(root, 'dist/extension');
if (source === root || source.startsWith(root + path.sep)) throw new Error('Use an upstream directory outside this repository');
if (fs.existsSync(output)) throw new Error('Output already exists; move dist/extension aside before rebuilding');
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'));
if (manifest.version !== '1.0.24') throw new Error('Only upstream 1.0.24 is supported');
const original = fs.readFileSync(path.join(source, 'dist/background.js'), 'utf8');
const begin = original.indexOf('async function setFileInputFiles(');
const end = original.indexOf('\nfunction matchesDownloadPattern(', begin);
if (begin < 0 || end < begin) throw new Error('Unexpected upstream function boundaries');
const baseline = fs.readFileSync(path.join(root, 'tests/fixtures/upstream-upload-1.0.24.js'), 'utf8');
const normalize = value => value.replace(/\r\n/g, '\n').trim();
if (normalize(original.slice(begin, end)) !== normalize(baseline)) throw new Error('Upstream function differs from tested baseline');
const replacement = '// Modified by OpenCLI Upload Lab; see NOTICE.\n' + fs.readFileSync(path.join(root, 'scripts/opencli-upload-function.js'), 'utf8');
const patched = original.slice(0, begin) + replacement + original.slice(end);
fs.mkdirSync(output, { recursive: true });
for (const name of ['dist', 'icons', 'popup.html', 'popup.js']) fs.cpSync(path.join(source, name), path.join(output, name), { recursive: true });
for (const name of ['LICENSE', 'NOTICE']) {
  fs.copyFileSync(path.join(root, name), path.join(output, name));
  if (fs.existsSync(path.join(source, name))) fs.copyFileSync(path.join(source, name), path.join(output, 'UPSTREAM-' + name));
}
delete manifest.key;
delete manifest.update_url;
manifest.name = 'OpenCLI Upload Lab';
manifest.version = '1.0.24.1';
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(output, 'dist/background.js'), patched);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
fs.writeFileSync(path.join(root, 'dist/patch-record.json'), JSON.stringify({
  upstream_version: '1.0.24', extension_version: '1.0.24.1',
  original_sha256: sha(original), patched_sha256: sha(patched),
  scope: 'setFileInputFiles only; permissions unchanged'
}, null, 2) + '\n');
console.log('Built dist/extension; source installation was not modified.');

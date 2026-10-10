"""Create and verify a portable Chrome extension ZIP using Python stdlib."""
import hashlib
import json
from pathlib import Path
import sys
import zipfile

root = Path(__file__).resolve().parent.parent
extension = root / 'dist/package-extension'
upstream = Path(sys.argv[1]).resolve()
manifest = json.loads((extension / 'manifest.json').read_text(encoding='utf-8'))
baseline = json.loads((upstream / 'manifest.json').read_text(encoding='utf-8'))
assert manifest['name'] == 'OpenCLI Upload Lab' and manifest['version'] == '1.0.24.1'
assert 'key' not in manifest and 'update_url' not in manifest
for key in ('permissions', 'host_permissions'):
    assert manifest.get(key) == baseline.get(key), f'{key} changed'
allowed = {'LICENSE', 'NOTICE', 'UPSTREAM-LICENSE', 'UPSTREAM-NOTICE', 'manifest.json', 'popup.html', 'popup.js'}
files = sorted(p for p in extension.rglob('*') if p.is_file())
for file in files:
    relative = file.relative_to(extension)
    assert relative.as_posix() in allowed or relative.parts[0] in ('dist', 'icons'), f'Unexpected package file: {relative}'
    assert not file.is_symlink(), 'Symlinks are not allowed'
    if file.suffix in ('.js', '.json', '.html'):
        content = file.read_text(encoding='utf-8')
        assert '-----BEGIN PRIVATE KEY-----' not in content
        assert ':\\Users\\' not in content and ':/Users/' not in content
name = f"opencli-upload-lab-{manifest['version']}.zip"
archive = root / 'dist' / name
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as output:
    for file in files:
        info = zipfile.ZipInfo(file.relative_to(extension).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        output.writestr(info, file.read_bytes())
    for name_in_zip in ('INSTALL.md', 'LICENSE', 'NOTICE'):
        info = zipfile.ZipInfo(name_in_zip, date_time=(2026, 1, 1, 0, 0, 0))
        # LICENSE and NOTICE already present above.
        if name_in_zip == 'INSTALL.md':
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            output.writestr(info, (root / name_in_zip).read_bytes())
with zipfile.ZipFile(archive) as check:
    assert check.testzip() is None
    assert {'manifest.json', 'dist/background.js', 'LICENSE', 'NOTICE', 'INSTALL.md'} <= set(check.namelist())
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(root / 'dist' / 'SHA256SUMS.txt').write_text(f'{digest}  {name}\n', encoding='utf-8')
print(json.dumps({'archive': name, 'sha256': digest, 'files': len(files) + 1, 'permissions_unchanged': True}))

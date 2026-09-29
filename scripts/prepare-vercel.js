const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of ['index.html', '404.html']) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dist, file));
}

for (const dir of ['css', 'js']) {
  fs.cpSync(path.join(root, dir), path.join(dist, dir), {
    recursive: true,
    filter: (src) => path.basename(src) !== 'verify-db.js',
  });
}

const sounds = path.join(root, 'public', 'assets', 'sound');
if (fs.existsSync(sounds)) {
  fs.cpSync(sounds, path.join(dist, 'assets', 'sound'), { recursive: true });
}

console.log('Saída estática pronta em dist/');

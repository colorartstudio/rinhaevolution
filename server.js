const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8081;
const ROOT = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
};

function safePath(base, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const rel = path.normalize(decoded).replace(/^(\.\.(?:[/\\]|$))+/, '').replace(/^[/\\]+/, '');
  const full = path.resolve(base, rel);
  const root = path.resolve(base);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

function resolveRequest(url) {
  const pathname = decodeURIComponent((url || '/').split('?')[0]);
  const rel = pathname === '/' ? '/index.html' : pathname;
  const candidates = [
    safePath(ROOT, rel),
    safePath(path.join(ROOT, 'public'), rel),
  ].filter(Boolean);

  for (const file of candidates) {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  const filePath = resolveRequest(req.url || '/');

  if (!filePath) {
    const missing = path.join(ROOT, '404.html');
    fs.readFile(missing, (error, content) => {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(error ? '404' : content, 'utf-8');
    });
    return;
  }

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500);
      res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

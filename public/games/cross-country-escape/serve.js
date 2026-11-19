#!/usr/bin/env node
/* Zero-dependency local preview server (Node 18+).
   Serves this folder under a sub-path to prove the game works when hosted at e.g. /games/cross-country-escape/.
   Usage:  node serve.js [port] [mount-path]
   Default: node serve.js 8080 /games/cross-country-escape/   ->  http://localhost:8080/games/cross-country-escape/  */
const http = require('http'), fs = require('fs'), path = require('path');
const port = +process.argv[2] || 8080;
let mount = process.argv[3] || '/games/cross-country-escape/';
if (!mount.startsWith('/')) mount = '/' + mount;
if (!mount.endsWith('/')) mount += '/';
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain'};
http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === mount.slice(0, -1)) { res.writeHead(301, {Location: mount}); return res.end(); }
  if (!url.startsWith(mount)) { res.writeHead(404); return res.end('Not found (outside ' + mount + ')'); }
  let rel = url.slice(mount.length) || 'index.html';
  let file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end(); }
  fs.stat(file, (e, st) => {
    if (!e && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, {'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream'});
      res.end(buf);
    });
  });
}).listen(port, () => console.log('Serving http://localhost:' + port + mount));

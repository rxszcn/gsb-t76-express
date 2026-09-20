'use strict';
// usage: node p4_multi_parent_mount.js <express-root>
const express = require(process.argv[2] || "../");
const http = require('node:http');

const pA = express();
const pB = express();
const child = express();

pA.set('theme', 'A');
pB.set('theme', 'B');
pA.response.helperA = function () { return 'helperA-visible'; };

child.get('/who', (req, res) => {
  res.json({
    themeViaApp: req.app.get('theme') || null,
    mountpath: req.app.mountpath,
    appPath: req.app.path(),
    parentHelper: typeof res.helperA === 'function' ? res.helperA() : 'LOST'
  });
});
pA.get('/direct', (req, res) => { res.json({ theme: req.app.get('theme') }); });

pA.use('/a', child);
pB.use('/b', child); // second mount rebinds child.request/response/engines/settings prototypes

function probe(srvApp, path, label, done) {
  const srv = http.createServer(srvApp).listen(0, '127.0.0.1', () => {
    const port = srv.address().port;
    http.get({ port, path }, r => {
      let b = ''; r.on('data', d => { b += d; }); r.on('end', () => { console.log(label, b); srv.close(); done(); });
    });
  });
}

probe(pA, '/a/who', 'VIA-pA(/a/who):', () => probe(pB, '/b/who', 'VIA-pB(/b/who):', () => probe(pA, '/direct', 'VIA-pA-own :', () => {})));

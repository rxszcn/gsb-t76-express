// 在仓库根目录跑：node repro/cookie-maxage.js
const express = require('../')
const http = require('http')

const app = express()
app.get('/c', (req, res) => {
  const raw = req.query.v
  const maxAge = raw === 'true' ? true : Number(raw)
  res.cookie('t', 'v', { maxAge })
  res.end('ok')
})

const server = http.createServer(app)

function get (qs) {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:' + server.address().port + '/c?' + qs, (res) => {
      res.resume()
      resolve(res.headers['set-cookie'] || [])
    })
    req.on('error', reject)
  })
}

const CASES = ['500', '999', '1000', '1500', '2500', '90000', 'true']

server.listen(0, '127.0.0.1', async () => {
  for (const v of CASES) {
    let sc = []
    const t0 = Date.now()
    try {
      sc = await get('v=' + v)
    } catch (e) {
      console.log('maxAge=' + v.padEnd(8) + ' 抛错: ' + e.message)
      continue
    }
    const head = String(sc[0] || '')
    const ma = /Max-Age=(-?\d+)/.exec(head)
    const ex = /Expires=([^;]+)$/.exec(head)
    const left = ex ? (new Date(ex[1]).getTime() - t0) / 1000 : NaN
    console.log('maxAge=' + v.padEnd(8) + ' ' + head)
    console.log('  Max-Age 写的: ' + (ma ? ma[1] : '（没有）') +
      '   Expires 距发请求: ' + (isFinite(left) ? left.toFixed(2) + ' 秒' : '（没有）') +
      '   两个头相差: ' + (isFinite(left) && ma ? (left - Number(ma[1])).toFixed(2) + ' 秒' : '-'))
  }
  server.close()
})

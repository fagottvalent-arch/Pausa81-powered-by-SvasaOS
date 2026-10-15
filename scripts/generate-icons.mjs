import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'icons')

const PALETTE = [
  [255, 75, 75],
  [255, 149, 0],
  [255, 204, 0],
  [52, 199, 89],
  [0, 199, 190],
  [0, 122, 255],
  [88, 86, 214],
  [175, 82, 222]
]

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(size, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function sample(px, py, size, R, hub) {
  const c = size / 2
  const dx = px - c
  const dy = py - c
  const d = Math.hypot(dx, dy)
  if (d > R) return [255, 255, 255]
  if (d < hub) return [255, 255, 255]
  const ang = Math.atan2(dy, dx)
  let color = [255, 255, 255]
  const b = R * 0.34
  for (let i = 0; i < 8; i++) {
    const theta = (i / 8) * 2 * Math.PI
    const rel = ang - theta
    const xr = Math.cos(rel) * d
    const yr = Math.sin(rel) * d
    if ((xr * xr) / (R * R) + (yr * yr) / (b * b) <= 1) {
      color = PALETTE[i]
    }
  }
  return color
}

function render(size, rRatio, hubRatio) {
  const rgba = Buffer.alloc(size * size * 4, 255)
  const R = size * rRatio
  const hub = size * hubRatio
  const SS = 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [cr, cg, cb] = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, size, R, hub)
          r += cr
          g += cg
          b += cb
        }
      }
      const n = SS * SS
      const idx = (y * size + x) * 4
      rgba[idx] = Math.round(r / n)
      rgba[idx + 1] = Math.round(g / n)
      rgba[idx + 2] = Math.round(b / n)
      rgba[idx + 3] = 255
    }
  }
  return rgba
}

mkdirSync(OUT_DIR, { recursive: true })

const icons = [
  { name: 'icon-192.png', size: 192, rRatio: 0.4, hubRatio: 0.12 },
  { name: 'icon-512.png', size: 512, rRatio: 0.4, hubRatio: 0.12 },
  { name: 'maskable-icon-512.png', size: 512, rRatio: 0.34, hubRatio: 0.1 }
]

for (const icon of icons) {
  const png = encodePng(icon.size, render(icon.size, icon.rRatio, icon.hubRatio))
  const file = join(OUT_DIR, icon.name)
  writeFileSync(file, png)
  console.log('Wrote', file, `(${icon.size}x${icon.size}, ${png.length} bytes)`)
}

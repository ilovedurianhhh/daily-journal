import { writeFileSync } from 'fs'
import { deflateSync } from 'zlib'

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBytes, data])
  const crcVal = Buffer.alloc(4)
  crcVal.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([len, typeBytes, data, crcVal])
}

function generatePNG(size) {
  // Create raw RGBA pixel data — indigo (#6366f1) rounded-rect on dark bg (#0f172a)
  const raw = Buffer.alloc(size * size * 4)
  const cx = size / 2, cy = size / 2
  const outerR = size * 0.44
  const innerR = size * 0.34
  const cornerR = size * 0.15

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      // Distance from center
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy)
      const inSquare = dx < cx - cornerR || dy < cy - cornerR
      const cornerDist = Math.sqrt((dx - (cx - cornerR)) ** 2 + (dy - (cy - cornerR)) ** 2)
      const inCorner = cornerDist < cornerR

      if ((inSquare || inCorner) && Math.sqrt(dx ** 2 + dy ** 2) < outerR) {
        // Indigo fill
        raw[idx] = 99
        raw[idx + 1] = 102
        raw[idx + 2] = 241
        raw[idx + 3] = 255
      } else if (Math.sqrt(dx ** 2 + dy ** 2) < outerR + 2) {
        // Anti-alias edge
        raw[idx] = 99
        raw[idx + 1] = 102
        raw[idx + 2] = 241
        raw[idx + 3] = 128
      } else if (Math.sqrt(dx ** 2 + dy ** 2) < innerR + 3 && Math.sqrt(dx ** 2 + dy ** 2) > innerR - 3) {
        // White circle in middle (journal dot)
        raw[idx] = 255
        raw[idx + 1] = 255
        raw[idx + 2] = 255
        raw[idx + 3] = 200
      } else if (Math.sqrt(dx ** 2 + dy ** 2) <= innerR) {
        raw[idx] = 255
        raw[idx + 1] = 255
        raw[idx + 2] = 255
        raw[idx + 3] = 220
      } else {
        // Transparent
        raw[idx] = 15
        raw[idx + 1] = 23
        raw[idx + 2] = 42
        raw[idx + 3] = 0
      }
    }
  }

  // Filter each row with Paeth predictor (filter type 4 for better compression)
  const filtered = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4)
    filtered[rowStart] = 0 // no filter
    for (let x = 0; x < size; x++) {
      const srcIdx = (y * size + x) * 4
      const dstIdx = rowStart + 1 + x * 4
      filtered[dstIdx] = raw[srcIdx]
      filtered[dstIdx + 1] = raw[srcIdx + 1]
      filtered[dstIdx + 2] = raw[srcIdx + 2]
      filtered[dstIdx + 3] = raw[srcIdx + 3]
    }
  }

  const compressed = deflateSync(filtered)

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8  // bit depth
  ihdrData[9] = 6  // color type: RGBA
  ihdrData[10] = 0 // compression
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // interlace

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icon-192.png', generatePNG(192))
writeFileSync('public/icon-512.png', generatePNG(512))
console.log('Icons generated: icon-192.png, icon-512.png')

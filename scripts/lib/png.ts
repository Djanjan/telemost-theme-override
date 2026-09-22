import { deflateSync, inflateSync } from "node:zlib"

/**
 * Minimal PNG reader/writer for 8-bit RGBA, non-interlaced images.
 *
 * Every image inside the extracted Telemost .ico is exactly that shape
 * (verified: IHDR depth=8, colorType=6, interlace=0 for all nine sizes), so a
 * focused implementation is safer than pulling in a general-purpose decoder.
 */

export interface RgbaImage {
  readonly width: number
  readonly height: number
  /** Row-major RGBA, 4 bytes per pixel. */
  readonly data: Buffer
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

export function decodePng(png: Buffer): RgbaImage {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("not a PNG")

  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  const bitDepth = png[24]
  const colorType = png[25]
  const interlace = png[28]

  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`unsupported PNG: depth=${bitDepth} colorType=${colorType} interlace=${interlace}`)
  }

  const idat: Buffer[] = []
  let offset = 8
  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString("latin1")
    if (type === "IDAT") idat.push(png.subarray(offset + 8, offset + 8 + length))
    offset += 12 + length
    if (type === "IEND") break
  }

  const raw = inflateSync(Buffer.concat(idat))
  const bytesPerPixel = 4
  const stride = width * bytesPerPixel
  const data = Buffer.alloc(height * stride)

  let readPos = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[readPos++]
    if (filter === undefined) throw new Error("truncated PNG scanline")
    const rowStart = y * stride

    for (let x = 0; x < stride; x++) {
      const left = x >= bytesPerPixel ? data[rowStart + x - bytesPerPixel] ?? 0 : 0
      const up = y > 0 ? data[rowStart - stride + x] ?? 0 : 0
      const upLeft = x >= bytesPerPixel && y > 0 ? data[rowStart - stride + x - bytesPerPixel] ?? 0 : 0

      let value = raw[readPos + x] ?? 0
      switch (filter) {
        case 0:
          break
        case 1:
          value += left
          break
        case 2:
          value += up
          break
        case 3:
          value += Math.floor((left + up) / 2)
          break
        case 4:
          value += paeth(left, up, upLeft)
          break
        default:
          throw new Error(`unknown PNG filter ${filter}`)
      }
      data[rowStart + x] = value & 0xff
    }
    readPos += stride
  }

  return { width, height, data }
}

function chunk(type: string, payload: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(payload.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), payload])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

export function encodePng(image: RgbaImage): Buffer {
  const { width, height, data } = image
  const stride = width * 4

  // Filter 0 (None) on every row: these are tiny images and the extra
  // compression from adaptive filtering is not worth the complexity here.
  const rawWithFilters = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    rawWithFilters[y * (stride + 1)] = 0
    data.copy(rawWithFilters, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlace

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rawWithFilters, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

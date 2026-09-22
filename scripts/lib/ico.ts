/**
 * ICO container reader/writer.
 *
 * Only PNG-compressed entries are handled, which is what modern Windows icons
 * use above 48x48 and what Telemost ships for every size.
 */

export interface IcoEntry {
  /** 0 in the file means 256. */
  readonly width: number
  readonly height: number
  readonly colorCount: number
  readonly planes: number
  readonly bitCount: number
  readonly payload: Buffer
}

export function parseIco(buffer: Buffer): IcoEntry[] {
  const reserved = buffer.readUInt16LE(0)
  const type = buffer.readUInt16LE(2)
  if (reserved !== 0 || type !== 1) throw new Error("not an .ico file")

  const count = buffer.readUInt16LE(4)
  const entries: IcoEntry[] = []

  for (let i = 0; i < count; i++) {
    const base = 6 + i * 16
    const size = buffer.readUInt32LE(base + 8)
    const offset = buffer.readUInt32LE(base + 12)
    entries.push({
      width: buffer[base] === 0 ? 256 : buffer[base] ?? 0,
      height: buffer[base + 1] === 0 ? 256 : buffer[base + 1] ?? 0,
      colorCount: buffer[base + 2] ?? 0,
      planes: buffer.readUInt16LE(base + 4),
      bitCount: buffer.readUInt16LE(base + 6),
      payload: buffer.subarray(offset, offset + size),
    })
  }

  return entries
}

export function buildIco(entries: readonly IcoEntry[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)

  const directory = Buffer.alloc(entries.length * 16)
  let offset = 6 + entries.length * 16

  entries.forEach((entry, index) => {
    const base = index * 16
    directory[base] = entry.width >= 256 ? 0 : entry.width
    directory[base + 1] = entry.height >= 256 ? 0 : entry.height
    directory[base + 2] = entry.colorCount
    directory[base + 3] = 0
    directory.writeUInt16LE(entry.planes, base + 4)
    directory.writeUInt16LE(entry.bitCount, base + 6)
    directory.writeUInt32LE(entry.payload.length, base + 8)
    directory.writeUInt32LE(offset, base + 12)
    offset += entry.payload.length
  })

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.payload)])
}

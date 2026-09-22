/**
 * Recolors the extracted Telemost icon to match the active theme.
 *
 * Approach: rotate hue in OKLCH toward the theme's accent, keeping each pixel's
 * lightness and alpha. That preserves shading, gradients and the anti-aliased
 * edges — a flat "replace color X with color Y" pass would destroy all three.
 *
 * Only chromatic pixels are touched. The dark plate (#1a1a1a) and the white
 * glyph are near-achromatic and must stay that way, so pixels below a chroma
 * threshold are left exactly as they are.
 */

import { readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { buildIco, parseIco, type IcoEntry } from "./lib/ico"
import { decodePng, encodePng } from "./lib/png"
import { hexToOklch, oklchToHex, hexToRgb, rgbToOklch, oklchToRgb } from "../src/theme/color"
import { desktopThemeSchema } from "../src/schema"
import type { HexColor } from "../src/theme/types"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * Pixels with chroma below this are treated as neutral (the dark plate, the
 * white glyph, grey anti-aliasing) and pass through untouched.
 */
const CHROMA_FLOOR = 0.02

/** PNG signature — used to reject BMP-encoded icon entries early. */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47])

interface RecolorOptions {
  readonly targetHue: number
  /** Scales chroma so a more saturated accent does not blow out the artwork. */
  readonly chromaScale: number
}

function recolorEntry(entry: IcoEntry, options: RecolorOptions): IcoEntry {
  if (!entry.payload.subarray(0, 4).equals(PNG_MAGIC)) {
    throw new Error(`entry ${entry.width}x${entry.height} is not PNG-encoded; cannot recolor safely`)
  }

  const image = decodePng(entry.payload)
  const data = Buffer.from(image.data)

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] ?? 0
    if (alpha === 0) continue

    const r = (data[i] ?? 0) / 255
    const g = (data[i + 1] ?? 0) / 255
    const b = (data[i + 2] ?? 0) / 255

    const oklch = rgbToOklch(r, g, b)
    if (oklch.c < CHROMA_FLOOR) continue

    const recolored = oklchToRgb({
      l: oklch.l,
      c: oklch.c * options.chromaScale,
      h: options.targetHue,
    })

    data[i] = Math.round(Math.min(1, Math.max(0, recolored.r)) * 255)
    data[i + 1] = Math.round(Math.min(1, Math.max(0, recolored.g)) * 255)
    data[i + 2] = Math.round(Math.min(1, Math.max(0, recolored.b)) * 255)
    // alpha untouched
  }

  return { ...entry, payload: encodePng({ width: image.width, height: image.height, data }) }
}

/**
 * Picks the accent the icon should adopt.
 *
 * Prefers the theme's explicit `accentScale` (the same ramp that drives the
 * in-app brand color), falling back to `seeds.interactive`.
 */
function resolveAccent(theme: ReturnType<typeof desktopThemeSchema.parse>): HexColor {
  const scale = theme.dark.accentScale
  // Index 8 is the ramp's saturated anchor (e.g. cobalt #034cff), matching what
  // Orb uses for brand surfaces.
  if (scale && scale[8]) return scale[8] as HexColor
  return theme.dark.seeds.interactive as HexColor
}

async function main(): Promise<void> {
  const sourcePath = resolve(ROOT, "assets/telemost.ico")
  const outputPath = resolve(ROOT, "assets/telemost-themed.ico")
  const themePath = resolve(ROOT, "config/theme.json")

  const theme = desktopThemeSchema.parse(JSON.parse(await readFile(themePath, "utf8")))
  const accent = resolveAccent(theme)
  const accentOklch = hexToOklch(accent)

  // Measured from the stock artwork: its dominant green is #4cee8f.
  const sourceAccent = hexToOklch("#4cee8f")
  const chromaScale = Math.min(1, accentOklch.c / sourceAccent.c)

  const entries = parseIco(await readFile(sourcePath))
  const recolored = entries.map((entry) =>
    recolorEntry(entry, { targetHue: accentOklch.h, chromaScale }),
  )

  await writeFile(outputPath, buildIco(recolored))

  const sampleBefore = hexToRgb("#4cee8f")
  const sampleAfter = oklchToHex({
    l: rgbToOklch(sampleBefore.r, sampleBefore.g, sampleBefore.b).l,
    c: sourceAccent.c * chromaScale,
    h: accentOklch.h,
  })

  console.log(`recolored ${entries.length} images -> assets/telemost-themed.ico`)
  console.log(`  accent      ${accent}  (hue ${accentOklch.h.toFixed(1)}deg)`)
  console.log(`  chromaScale ${chromaScale.toFixed(3)}`)
  console.log(`  #4cee8f     -> ${sampleAfter}`)
}

main().catch((error: unknown) => {
  process.stderr.write(`recolor-icon failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})

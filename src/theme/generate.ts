import { hexToOklch, hexToRgb, oklchToHex } from "./color"
import type { HexColor } from "./types"
import type { BrandRampConfig, MappingConfig, RampStop } from "../schema"
import type { desktopThemeSchema } from "../schema"
import type { z } from "zod"

type DesktopTheme = z.infer<typeof desktopThemeSchema>

/**
 * Orb's numeric ramp stops, observed live in Telemost's `:root`
 * (`--orb-color-ya-telemost-{100..1000}`).
 *
 * Orb numbers behave like Tailwind: LOW number = light tint, HIGH = dark shade.
 * shuvcode's `generateScale` uses the opposite convention (index 0 = lightest in
 * light mode), so we do not reuse it here — we map Orb stops to explicit OKLCH
 * lightness targets instead. Chroma is scaled down at the extremes so tints stay
 * believable rather than neon.
 */
const RAMP_STOPS: readonly RampStop[] = [100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 850, 900, 950, 1000]

/**
 * Lightness + chroma multiplier per Orb stop.
 *
 * MEASURED, not invented: these are the OKLCH coordinates of Telemost's own
 * `--orb-color-ya-telemost-*` ramp, read back over CDP and normalised so the
 * peak-chroma stop has multiplier 1.0 (stock peak is C=0.215 at stop 400).
 *
 * Matching the stock curve matters — an earlier hand-guessed curve put stop 600
 * at L=0.63 where the real one sits at L=0.742, which made every brand surface
 * read noticeably darker and heavier than Telemost's own design intends.
 */
const RAMP_SHAPE: Readonly<Record<RampStop, { l: number; c: number }>> = {
  100: { l: 0.982, c: 0.12 },
  150: { l: 0.961, c: 0.27 },
  200: { l: 0.931, c: 0.51 },
  250: { l: 0.908, c: 0.72 },
  300: { l: 0.891, c: 0.9 },
  400: { l: 0.854, c: 1.0 },
  500: { l: 0.809, c: 0.98 },
  600: { l: 0.742, c: 0.9 },
  700: { l: 0.676, c: 0.87 },
  800: { l: 0.597, c: 0.78 },
  850: { l: 0.524, c: 0.69 },
  900: { l: 0.415, c: 0.53 },
  950: { l: 0.221, c: 0.26 },
  1000: { l: 0.085, c: 0.09 },
}

/** Alpha stops observed in Orb: `--orb-color-<family>-alpha-{100..500}`. */
const ALPHA_STOPS: Readonly<Record<number, number>> = {
  100: 0.1,
  150: 0.13,
  200: 0.2,
  250: 0.3,
  300: 0.4,
  400: 0.6,
  500: 0.8,
}

/** `--orb-color-<family>-light-{400,500,600}` — slightly lifted variants. */
const LIGHT_TRIO_LIFT = 0.06

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function toHex8(hex: HexColor, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  const a = Math.round(clamp01(alpha) * 255)
    .toString(16)
    .padStart(2, "0")
  const rr = Math.round(r * 255)
    .toString(16)
    .padStart(2, "0")
  const gg = Math.round(g * 255)
    .toString(16)
    .padStart(2, "0")
  const bb = Math.round(b * 255)
    .toString(16)
    .padStart(2, "0")
  return `#${rr}${gg}${bb}${a}`
}

/**
 * True if the OKLCH triple survives a round-trip through sRGB unchanged,
 * i.e. it is inside gamut. Out-of-gamut colors get silently clamped by
 * `oklchToHex`, which both desaturates them and shifts their hue.
 */
function isInGamut(color: { l: number; c: number; h: number }): boolean {
  const hex = oklchToHex(color)
  const back = hexToOklch(hex)
  const chromaLoss = color.c - back.c
  let hueDrift = Math.abs(back.h - color.h)
  if (hueDrift > 180) hueDrift = 360 - hueDrift
  return chromaLoss <= 0.012 && (color.c < 0.02 || hueDrift <= 3)
}

/**
 * Reduces chroma until the color fits in sRGB, preserving lightness and hue.
 *
 * This is the standard CSS Color 4 gamut-mapping approach (binary search on
 * chroma). Without it, a saturated blue seed like cobalt `#034cff` (C=0.269)
 * clips hard on the light stops and drifts up to 15 degrees toward cyan,
 * producing the neon look that plain clamping gives you.
 */
function gamutMap(l: number, c: number, h: number): HexColor {
  if (isInGamut({ l, c, h })) return oklchToHex({ l, c, h })

  let low = 0
  let high = c
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2
    if (isInGamut({ l, c: mid, h })) low = mid
    else high = mid
  }
  return oklchToHex({ l, c: low, h })
}

function rampStopFromSeed(seed: HexColor, stop: RampStop): HexColor {
  const base = hexToOklch(seed)
  const shape = RAMP_SHAPE[stop]
  return gamutMap(shape.l, base.c * shape.c, base.h)
}

/**
 * Resamples a hand-authored 12-step scale onto Orb's 14 stops.
 *
 * The source scale is treated as a curve in OKLCH space indexed by lightness:
 * for each Orb stop we interpolate between the two neighbouring source steps.
 * That keeps the designer's chroma and hue choices instead of re-deriving them
 * from a single seed.
 */
function rampStopFromPalette(palette: readonly HexColor[], stop: RampStop): HexColor {
  const points = palette
    .map((hex) => hexToOklch(hex))
    .slice()
    .sort((a, b) => a.l - b.l)

  const target = RAMP_SHAPE[stop].l
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) throw new Error("palette must not be empty")

  // Outside the authored range: keep the endpoint hue/chroma, take our lightness.
  if (target <= first.l) return gamutMap(target, first.c, first.h)
  if (target >= last.l) return gamutMap(target, last.c, last.h)

  for (let i = 0; i < points.length - 1; i++) {
    const lower = points[i]
    const upper = points[i + 1]
    if (!lower || !upper) continue
    if (target >= lower.l && target <= upper.l) {
      const span = upper.l - lower.l
      const t = span === 0 ? 0 : (target - lower.l) / span

      let hueDelta = upper.h - lower.h
      if (hueDelta > 180) hueDelta -= 360
      if (hueDelta < -180) hueDelta += 360

      return gamutMap(target, lower.c + (upper.c - lower.c) * t, lower.h + hueDelta * t)
    }
  }

  return gamutMap(target, last.c, last.h)
}

export interface GeneratedRamp {
  readonly family: string
  readonly declarations: ReadonlyArray<readonly [string, string]>
}

export interface RampSource {
  readonly seedHex?: HexColor
  readonly palette?: readonly HexColor[]
}

export function generateRamp(source: RampSource, config: BrandRampConfig): GeneratedRamp {
  const stopColor = (stop: RampStop): HexColor => {
    if (source.palette) return rampStopFromPalette(source.palette, stop)
    if (source.seedHex) return rampStopFromSeed(source.seedHex, stop)
    throw new Error(`ramp "${config.family}" has neither a palette nor a seed`)
  }

  const declarations: Array<readonly [string, string]> = []

  for (const stop of RAMP_STOPS) {
    declarations.push([`--orb-color-${config.family}-${stop}`, stopColor(stop)])
  }

  const alphaBase = stopColor(config.alphaSource)
  for (const [stop, alpha] of Object.entries(ALPHA_STOPS)) {
    declarations.push([`--orb-color-${config.family}-alpha-${stop}`, toHex8(alphaBase, alpha)])
  }

  if (config.emitLightTrio) {
    for (const stop of [400, 500, 600] as const) {
      const lifted = hexToOklch(stopColor(stop))
      declarations.push([
        `--orb-color-${config.family}-light-${stop}`,
        gamutMap(clamp01(lifted.l + LIGHT_TRIO_LIFT), lifted.c, lifted.h),
      ])
    }
  }

  return { family: config.family, declarations }
}

function renderBlock(selector: string, declarations: ReadonlyArray<readonly [string, string]>): string {
  if (declarations.length === 0) return ""
  const body = declarations.map(([name, value]) => `  ${name}: ${value};`).join("\n")
  return `${selector} {\n${body}\n}`
}

export interface BuildCssOptions {
  readonly theme: DesktopTheme
  readonly mapping: MappingConfig
}

/**
 * Builds the override stylesheet.
 *
 * Strategy: rewrite Orb *primitives*, not the 17 semantic brand tokens that
 * consume them. Telemost may rename a semantic token between releases, but the
 * primitive ramp is the shared foundation — targeting it keeps the patch small
 * and resilient.
 *
 * Specificity: Orb defines primitives on `:root` and brand tokens on
 * `.brand_telemost` compounds. We emit `:root` plus the same compound selectors
 * so the cascade lands after Orb without resorting to `!important` everywhere.
 */
export function buildCss(options: BuildCssOptions): string {
  const { theme, mapping } = options

  const darkRamps: Array<readonly [string, string]> = []
  const lightRamps: Array<readonly [string, string]> = []

  // An explicit accentScale in the theme wins; otherwise fall back to the seed
  // named by the mapping. This keeps theme.json meaningful either way — editing
  // it must always change the result, or the file is a lie.
  for (const ramp of mapping.ramps) {
    const darkSource: RampSource = theme.dark.accentScale
      ? { palette: theme.dark.accentScale as HexColor[] }
      : { seedHex: theme.dark.seeds[ramp.seed] as HexColor }

    const lightSource: RampSource = theme.light.accentScale
      ? { palette: theme.light.accentScale as HexColor[] }
      : { seedHex: theme.light.seeds[ramp.seed] as HexColor }

    darkRamps.push(...generateRamp(darkSource, ramp).declarations)
    lightRamps.push(...generateRamp(lightSource, ramp).declarations)
  }

  const darkOverrides = Object.entries(mapping.darkOverrides)
  const lightOverrides = Object.entries(mapping.lightOverrides)

  const banner = [
    "/* ============================================================",
    ` * telemost-theme-override — ${theme.name} (${theme.id})`,
    mapping.description ? ` * ${mapping.description}` : null,
    " * Generated at runtime. Telemost files are never modified.",
    " * ============================================================ */",
  ]
    .filter((line): line is string => line !== null)
    .join("\n")

  // Orb scopes brand primitives on :root; the dark/light split rides on
  // .theme_dark / .theme_light classes that Telemost puts on <html>.
  const sections = [
    banner,
    renderBlock(":root", lightRamps),
    renderBlock(":root.theme_dark, .theme_dark:root", darkRamps),
    renderBlock(":root, :root.brand_telemost", lightOverrides),
    renderBlock(":root.theme_dark, .theme_dark:root, .theme_dark:root.brand_telemost", darkOverrides),
    // theme_auto follows the OS preference.
    darkRamps.length > 0
      ? `@media (prefers-color-scheme: dark) {\n${renderBlock(":root.theme_auto", darkRamps)
          .split("\n")
          .map((l) => (l ? `  ${l}` : l))
          .join("\n")}\n}`
      : "",
  ]

  return sections.filter((section) => section.length > 0).join("\n\n") + "\n"
}

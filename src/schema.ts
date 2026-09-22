import { z } from "zod"

/**
 * Zod schemas are the single source of truth for every external boundary:
 *  - theme files (seed colors)
 *  - the ramp-mapping config
 *  - CDP wire messages
 *
 * Anything crossing a boundary is parsed, never cast.
 */

export const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "expected a hex color like #1dcc66 or #0bb55233")

/**
 * Seed colors — a deliberately reduced subset of shuvcode's palette.
 *
 * shuvcode themes also carry `diffAdd`/`diffDelete` seeds and a large
 * `overrides` map, but those describe an IDE surface (diff gutters, syntax
 * highlighting, markdown) with no analogue in Telemost. Verified empirically:
 * stripping all 251 overrides out of oc-1.json produced byte-identical CSS,
 * because nothing in this project ever read them.
 *
 * Only seeds matter here — Orb's primitive ramps are regenerated from them.
 */
export const themeSeedColorsSchema = z.object({
  neutral: hexColorSchema,
  primary: hexColorSchema,
  success: hexColorSchema,
  warning: hexColorSchema,
  error: hexColorSchema,
  info: hexColorSchema,
  interactive: hexColorSchema,
})

/**
 * A hand-authored 12-step scale, light-to-dark, copied from shuvcode's
 * `colors.css` (e.g. `cobalt-dark-1..12`).
 *
 * Preferred over deriving everything from `seeds.interactive`: those scales were
 * tuned by hand and already sit inside sRGB, whereas generating a ramp from one
 * highly saturated seed (cobalt is C=0.269 vs the stock green's C=0.194) clips
 * at the light end and drifts hue by up to 15 degrees.
 */
export const paletteScaleSchema = z.array(hexColorSchema).length(12)

export const themeVariantSchema = z.object({
  seeds: themeSeedColorsSchema,
  /**
   * Optional explicit accent ramp. When present it drives the brand color;
   * otherwise the brand is derived from the seed named by the mapping.
   */
  accentScale: paletteScaleSchema.optional(),
})

/**
 * A theme is a light/dark pair of seed sets — nothing else.
 *
 * Porting a theme from shuvcode means copying its two `seeds` objects and
 * dropping `diffAdd`/`diffDelete`. No other transformation is required.
 */
export const desktopThemeSchema = z.object({
  name: z.string().min(1),
  id: z.string().min(1),
  light: themeVariantSchema,
  dark: themeVariantSchema,
})

export type ThemeSeedName = keyof z.infer<typeof themeSeedColorsSchema>

/**
 * Orb exposes a brand ramp as flat primitives. We regenerate that ramp from a
 * shuvcode seed instead of hand-patching the semantic tokens that consume it.
 */
export const rampStopSchema = z.union([
  z.literal(100),
  z.literal(150),
  z.literal(200),
  z.literal(250),
  z.literal(300),
  z.literal(400),
  z.literal(500),
  z.literal(600),
  z.literal(700),
  z.literal(800),
  z.literal(850),
  z.literal(900),
  z.literal(950),
  z.literal(1000),
])

export const seedNameSchema = z.enum(["primary", "interactive", "success", "info", "warning", "error", "neutral"])

export const brandRampConfigSchema = z.object({
  /** Orb primitive family to rewrite, e.g. "ya-telemost". */
  family: z.string().min(1),
  /**
   * Fallback seed, used only when the theme provides no `accentScale`.
   * Ramps generated this way are gamut-mapped, which costs some chroma.
   */
  seed: seedNameSchema,
  /** Stop that alpha variants are derived from. */
  alphaSource: rampStopSchema,
  /** Optional extra `<family>-light-{400,500,600}` trio, present for ya-telemost. */
  emitLightTrio: z.boolean().default(false),
})

export const semanticOverrideSchema = z.record(z.string(), z.string())

export const mappingConfigSchema = z.object({
  /** Human-readable note carried into the generated CSS banner. */
  description: z.string().default(""),
  /**
   * Orb primitive families regenerated from seeds. This is what actually
   * removes the green: every brand token resolves through these primitives.
   */
  ramps: z.array(brandRampConfigSchema).min(1),
  /**
   * Direct token overrides applied after ramps, for anything a ramp cannot
   * express. Values are raw CSS (hex or var() refs).
   */
  darkOverrides: semanticOverrideSchema.default({}),
  lightOverrides: semanticOverrideSchema.default({}),
  /**
   * Tokens asserted against the running app after injection.
   *
   * Must be root-scoped: `getComputedStyle(documentElement)` can only see
   * custom properties declared on `:root`. Orb's four
   * `--orb-button-brand-*` tokens are declared on component scopes
   * (`.yamb-desktop-merge-notice-banner`) and are therefore NOT valid canaries,
   * even though they do consume the brand ramp.
   */
  canaryTokens: z.array(z.string()).default([]),
})

export type MappingConfig = z.infer<typeof mappingConfigSchema>
export type BrandRampConfig = z.infer<typeof brandRampConfigSchema>
export type RampStop = z.infer<typeof rampStopSchema>

export const appConfigSchema = z.object({
  telemostExe: z.string().min(1),
  /** Loopback only. Binding elsewhere would expose remote control of a live session. */
  debugHost: z.literal("127.0.0.1").default("127.0.0.1"),
  debugPort: z.number().int().min(1024).max(65535).default(9333),
  themeFile: z.string().min(1),
  mappingFile: z.string().min(1),
  /** Keep the injector attached and re-apply on navigation. */
  watch: z.boolean().default(true),
  launchTimeoutMs: z.number().int().positive().default(45_000),
})

export type AppConfig = z.infer<typeof appConfigSchema>

/* ---------------------------------- CDP ---------------------------------- */

export const cdpTargetSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  url: z.string(),
  webSocketDebuggerUrl: z.string().optional(),
})

export const cdpTargetListSchema = z.array(cdpTargetSchema)

export const cdpVersionSchema = z.object({
  Browser: z.string(),
  "Protocol-Version": z.string(),
  webSocketDebuggerUrl: z.string(),
})

export const cdpMessageSchema = z.object({
  id: z.number().int().optional(),
  method: z.string().optional(),
  params: z.unknown().optional(),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
    })
    .optional(),
})

export const runtimeEvaluateResultSchema = z.object({
  result: z.object({
    type: z.string(),
    value: z.unknown().optional(),
  }),
  exceptionDetails: z
    .object({
      text: z.string(),
      exception: z.object({ description: z.string().optional() }).optional(),
    })
    .optional(),
})

export const addScriptResultSchema = z.object({
  identifier: z.string(),
})

/** Shape returned by the in-page verification probe. */
export const verificationReportSchema = z.object({
  rootClasses: z.string(),
  styleTagPresent: z.boolean(),
  resolved: z.record(z.string(), z.string()),
  missing: z.array(z.string()),
})

export type VerificationReport = z.infer<typeof verificationReportSchema>

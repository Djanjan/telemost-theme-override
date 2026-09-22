/**
 * Color primitives used by the OKLCH conversion helpers in `color.ts`.
 *
 * Trimmed down from shuvcode's theme types: the IDE-oriented shapes
 * (`ThemeVariant`, `ResolvedTheme`, `TokenCategory`, diff/syntax seeds) have no
 * counterpart in Telemost. Theme shapes proper are defined — and validated — in
 * `src/schema.ts`, which is the single source of truth for that boundary.
 */

export type HexColor = `#${string}`

export interface OklchColor {
  /** Lightness, 0..1 */
  l: number
  /** Chroma, 0..0.4+ */
  c: number
  /** Hue, 0..360 */
  h: number
}

# Orb brand tokens consumed by Telemost

Captured live from Telemost `3.0.1.9940` (QtWebEngine 6.8.3 / Chrome 122) by
enumerating every `CSSStyleRule` in `document.styleSheets` over CDP.

## Why this file exists

These 17 tokens are **not** something this project sets. They belong to Orb,
Yandex's design system, and live inside Telemost. We never write them.

Every one of them resolves through the `--orb-color-ya-telemost-*` primitive
ramp — which is what we *do* rewrite. Repainting 24 primitives therefore
repaints all 17 tokens, and anything else Orb derives from them, for free.

Targeting primitives instead of these tokens is the deliberate design choice:
semantic token names and component class names churn between releases, while the
brand color ramp is the stable foundation everything else is built on.

## Tokens that reference the brand ramp

### Root-scoped (13) — usable as canaries

Declared on `:root` compounds, so `getComputedStyle(document.documentElement)`
can read them back. These form `canaryTokens` in `config/mapping.json`.

| Token | Stock value (dark) |
| --- | --- |
| `--orb-surface-brand` | `var(--orb-color-ya-telemost-600)` |
| `--orb-surface-brand-hovered` | `var(--orb-color-ya-telemost-700)` |
| `--orb-surface-brand-pressed` | `var(--orb-color-ya-telemost-800)` |
| `--orb-surface-brand-light` | `var(--orb-color-ya-telemost-alpha-200)` |
| `--orb-surface-brand-light-hovered` | `var(--orb-color-ya-telemost-alpha-250)` |
| `--orb-surface-brand-light-pressed` | `var(--orb-color-ya-telemost-alpha-300)` |
| `--orb-text-brand` | `var(--orb-color-ya-telemost-600)` |
| `--orb-text-brand-static` | `var(--orb-color-ya-telemost-950)` |
| `--orb-line-brand` | `var(--orb-color-ya-telemost-600)` |
| `--orb-misc-line-focus` | `var(--orb-color-ya-telemost-600)` |
| `--orb-shadow-brand` | `var(--orb-color-ya-telemost-alpha-250)` |
| `--component-desktop-merge-notice-brand-bg` | brand ramp |
| `--component-desktop-merge-notice-brand-color` | brand ramp |

### Component-scoped (4) — NOT valid canaries

Declared on component selectors such as
`.yamb-desktop-merge-notice-banner.Orb-Theme_theme_dark`, never on `:root`.
They are still repainted correctly (they read the same ramp), but they are
invisible to a root-level `getComputedStyle` probe.

Listing them as canaries produces a false "missing token" alarm — this was
observed and corrected during development.

| Token | Stock value (dark) |
| --- | --- |
| `--orb-button-brand-background` | `var(--orb-color-ya-telemost-600)` |
| `--orb-button-brand-background-hover` | `var(--orb-color-ya-telemost-700)` |
| `--orb-button-brand-background-active` | `var(--orb-color-ya-telemost-800)` |
| `--orb-button-brand-text` | `var(--orb-color-ya-telemost-950)` |

## Ramp shape is measured, not invented

`RAMP_SHAPE` in `src/theme/generate.ts` holds the OKLCH coordinates of
Telemost's own stock ramp, read back over CDP:

| Stop | Stock hex | L | C |
| --- | --- | --- | --- |
| 300 | `#57ff9e` | 0.891 | 0.193 |
| 400 | `#33f583` | 0.854 | 0.215 (peak) |
| 500 | `#23e574` | 0.809 | 0.211 |
| 600 | `#1dcc66` | 0.742 | 0.194 |
| 700 | `#0bb552` | 0.676 | 0.186 |
| 850 | `#008035` | 0.524 | 0.148 |

An earlier hand-guessed curve placed stop 600 at L=0.63 instead of the real
0.742. Every brand surface came out darker and heavier than Orb intends. Always
re-measure rather than eyeball this table.

## Gamut mapping

Seeds differ wildly in saturation:

| Color | C (OKLCH) |
| --- | --- |
| stock green `#1dcc66` | 0.194 |
| oc-1 `primary` (dark) `#fab283` | 0.105 |
| oc-1 `interactive` `#034cff` | **0.269** |

Cobalt is 39% more saturated than the green it replaces. Naively multiplying its
chroma by the ramp shape pushes the light stops outside sRGB, where `oklchToHex`
silently clamps them — costing up to 0.076 chroma and drifting hue by 15 degrees
toward cyan. The result reads as harsh neon.

`gamutMap()` binary-searches chroma down until the color round-trips through
sRGB cleanly, preserving lightness and hue (CSS Color 4's approach).

## Palette mode vs seed mode

A ramp may be driven either by a single `seed` or by an explicit 12-step
`palette`. Palette mode is preferred where a hand-tuned scale exists: shuvcode's
`cobalt-dark-1..12` was authored by a designer and already sits in gamut, so
resampling it onto Orb's 14 stops keeps those choices instead of re-deriving
everything from one color.

Resampling interpolates in OKLCH indexed by lightness, with shortest-arc hue
interpolation.

## Contrast check

Measured with WCAG 2.1 relative luminance against Telemost's dark background
`--orb-color-cool-gray-1000` = `#242429`:

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `#7aabff` (new brand 600) on `#242429` | 6.69:1 | AA |
| `#1dcc66` (stock green) on `#242429` | 7.27:1 | AA |

The replacement stays in the same contrast class as the stock color. Both fail
against pure white, which is why Orb pairs brand surfaces with the dark
`--orb-text-brand-static` rather than white.

## The primitives we actually rewrite

Stock `ya-telemost` ramp, declared once on `:root`:

```
100  #ebfff3    400  #33f583    800  #039941
150  #d1ffe4    500  #23e574    850  #008035
200  #a8ffcc    600  #1dcc66    900  #005c27
250  #80ffb5    700  #0bb552    950  #00220e
300  #57ff9e                   1000  #000301

alpha-{100,150,200,250,300,400,500}   derived from #0bb552
light-{400,500,600}                   #4cee8f #30de77 #1ccc65
```

24 declarations total. Rewriting them is the entire mechanism.

## Startup race: the page target precedes the stylesheets

A CDP page target for `ychat://files/index.html` appears **before** Telemost has
parsed any CSS. Measured on a cold start:

| Time | State |
| --- | --- |
| +1512 ms | target exists, `readyState=loading`, `styleSheets.length = 0`, root class is just `desktop` |
| +2772 ms | `readyState=interactive`, 1 stylesheet, root class `desktop theme_dark`, tokens resolvable |

Verifying inside that ~1.3 s window reports **all 13 canaries as missing** even
though the injection succeeded — the stylesheet is in the document, but Orb's
own declarations that our variables are meant to override do not exist yet, so
`getComputedStyle` returns empty strings.

`waitForAppStyles()` in `src/inject.ts` polls a real Orb token until it resolves
before verification runs. It keys on the token rather than `readyState` because
the token is exactly what the assertion depends on.

Note that the injected `<style>` is *not* lost during this window; a transient
reading of `--orb-surface-brand` mid-load (e.g. `#2ac4e5`) is Telemost's own
splash styling, replaced once the real theme mounts.

## Out of scope: avatars and status dots

Avatar monograms and presence indicators are green too, but they come from
*unrelated* Orb accent families (`green`, `lime`, `emerald`, `teal`) via
`--orb-surface-accent-05..09`. They are intentionally left alone — they encode
per-user identity, not brand.

To bring them in, add the relevant family to `ramps` in `config/mapping.json`.

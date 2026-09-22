# telemost-theme-override

Repaints Yandex Telemost with a custom color scheme. **Telemost's own files are
never modified** — the stylesheet is injected at runtime.

Built and verified against Telemost `3.0.1.9940` (Qt WebEngine 6.8.3 / Chrome 122).

## Usage

```
telemost-start.exe          launch Telemost, apply the theme, keep it applied
telemost-start.exe --once   apply once and exit (Telemost keeps running)
telemost-start.exe --where  print config file locations
telemost-start.exe --help
```

On first run it creates:

```
%LOCALAPPDATA%\TelemostThemeOverride\
  theme.json    colors — edit this
  config.json   path to Telemost, debug port, console behaviour
```

### `config.json`

| Key | Default | Meaning |
| --- | --- | --- |
| `telemostExe` | auto-detected | Full path to `YandexTelemost.exe` |
| `debugPort` | `9333` | CDP port, bound to `127.0.0.1` only |
| `watch` | `true` | Stay attached and re-apply on navigation |
| `launchTimeoutSeconds` | `45` | How long to wait for the Telemost window |
| `hideConsole` | `"auto"` | `auto` \| `always` \| `never` — see below |

`hideConsole` controls this launcher's own console window:

- **`auto`** — hide it once the theme is applied, but keep it open if a warning
  needs reading
- **`always`** — hide it regardless
- **`never`** — always keep it visible

This is done at runtime rather than with `bun build --windows-hide-console`,
which strips the console at link time and would make startup errors invisible.

A console belonging to an existing terminal is **never** hidden: the launcher
checks `GetConsoleProcessList` and only acts when it is the sole process
attached, i.e. when Windows created the window for a double-click.

Both are created once and **never overwritten**, so your edits survive tool
upgrades. Delete a file to regenerate it with defaults.

## Changing colors

`theme.json` holds two things per light/dark variant:

- `seeds` — named base colors
- `accentScale` — an explicit 12-step ramp, light to dark, that drives the brand
  color (buttons, outgoing message bubbles, focus rings, the FAB)

`accentScale` wins when present. It exists because generating a whole ramp from
one saturated color clips outside sRGB: cobalt `#034cff` has chroma 0.269 versus
the stock green's 0.194, and naive scaling drifts its hue up to 15° toward cyan.
A hand-authored scale avoids that. Drop `accentScale` and the brand is derived
from `seeds.interactive` instead, with gamut mapping applied.

To port a theme from shuvcode, copy the two `seeds` objects (minus `diffAdd` and
`diffDelete`) and optionally a color ramp from `packages/ui/src/styles/colors.css`.

## How it works

Telemost's UI is a web app served over a custom `ychat://` scheme; `app.js` and
`app.css` are embedded in the 156 MB executable, not on disk, so there is no file
to patch.

Instead the launcher sets `QTWEBENGINE_REMOTE_DEBUGGING` — a stock Qt facility
present in the shipped `Qt6WebEngineCore.dll` — **in the child process only**.
Nothing is written to your environment, no Telemost file is touched, and the
executable signature stays intact. The theme is then injected over the Chrome
DevTools Protocol via `Page.addScriptToEvaluateOnNewDocument`, which survives
reloads and in-app navigation.

The port is pinned to `127.0.0.1` in the schema itself. Binding it to a routable
interface would hand out remote control of a logged-in session.

### Why it survives Telemost updates

All of Telemost's green resolves through a single primitive ramp,
`--orb-color-ya-telemost-*`, declared once on `:root`. Rewriting those 24
declarations repaints all 17 semantic brand tokens that consume them.

Targeting primitives rather than component selectors is deliberate: class names
and semantic tokens churn between releases, the brand color ramp does not.

If Telemost ever does rename them, the tool reports it loudly rather than
degrading silently — after injecting it reads the tokens back from the live
document and exits with code 2 if any are missing.

See [`docs/brand-tokens.md`](docs/brand-tokens.md) for the full token contract.

## Development

```
bun install
bun run start          run from source
bun run build-css      print the generated stylesheet
bun run doctor         inspect a running Telemost
bun run typecheck
bun run build          compile dist/telemost-start.exe
```

`config/*.json` are the source of truth; `bun run build` bakes them into the
binary via `scripts/sync-defaults.ts`, so the two copies cannot drift.

`assets/telemost.ico` was extracted from `YandexTelemost.exe` (9 sizes,
16×16 to 256×256) and is used as the launcher's icon.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path"
import { z } from "zod"

import { BUILTIN_PRESETS } from "./defaults/presets"
import { appConfigFilePath, presetsDir } from "./paths"
import { desktopThemeSchema, type DesktopTheme } from "./schema"
import { resolveThemeBackgrounds } from "./theme/backgrounds"
import { userConfigSchema, type UserConfig } from "./bootstrap"

export class PresetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PresetError"
  }
}

export type PresetSource = "builtin" | "user" | "repo" | "file"

export interface PresetInfo {
  readonly id: string
  readonly name: string
  readonly source: PresetSource
  readonly path?: string
  readonly theme: DesktopTheme
}

export interface PresetResolution {
  readonly theme: DesktopTheme
  readonly id: string
  readonly name: string
  readonly source: PresetSource
  readonly path?: string
}

export interface PresetOptions {
  readonly env?: NodeJS.ProcessEnv
  readonly repoDir?: string
}

function describeIssues(issues: ReadonlyArray<z.core.$ZodIssue>): string {
  return issues.map((issue) => `  - ${issue.path.join(".") || "<root>"}: ${issue.message}`).join("\n")
}

/**
 * Formats a list of presets into a human-readable table.
 */
export function formatPresetList(presets: ReadonlyArray<PresetInfo>, activeId?: string): string {
  const lines: string[] = []
  lines.push("Available theme presets:")
  lines.push("")
  const header = `  ${"ID".padEnd(20)} ${"NAME".padEnd(30)} ${"SOURCE".padEnd(10)} ACCENT`
  lines.push(header)
  lines.push(`  ${"-".repeat(70)}`)
  for (const preset of presets) {
    const isCurrent = activeId && (preset.id === activeId || preset.name === activeId)
    const marker = isCurrent ? "* " : "  "
    const id = preset.id.padEnd(20)
    const name = preset.name.padEnd(30)
    const source = `[${preset.source}]`.padEnd(10)
    const accent = preset.theme.dark.seeds.interactive || preset.theme.dark.seeds.primary || ""
    lines.push(`${marker}${id} ${name} ${source} ${accent}`)
  }
  lines.push("")
  lines.push("Usage:")
  lines.push("  --preset <id|path>            launch with specified preset")
  lines.push("  --set-preset <id>             set default preset in config.json")
  lines.push("  --save-preset <name>          save current theme as preset")
  lines.push("  --import-preset <path>        import a theme file into presets")
  lines.push("  --export-preset <id> [--out]  export self-contained theme JSON")
  return lines.join("\n")
}

/**
 * Normalizes a preset name or identifier to a lowercase alphanumeric slug.
 */
export function normalizePresetId(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\.json$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Reads and validates a theme JSON file from disk.
 */
export async function readThemeFile(path: string): Promise<DesktopTheme> {
  const fullPath = resolve(path)
  let raw: string
  try {
    raw = await readFile(fullPath, "utf8")
  } catch (error) {
    throw new PresetError(`cannot read theme file ${fullPath}: ${error instanceof Error ? error.message : error}`)
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (error) {
    throw new PresetError(`${fullPath} is not valid JSON: ${error instanceof Error ? error.message : error}`)
  }

  const parsed = desktopThemeSchema.safeParse(json)
  if (!parsed.success) {
    throw new PresetError(`${fullPath} is not a valid theme:\n${describeIssues(parsed.error.issues)}`)
  }

  try {
    return await resolveThemeBackgrounds(parsed.data, dirname(fullPath))
  } catch (error) {
    throw new PresetError(`invalid theme ${fullPath}: ${error instanceof Error ? error.message : error}`)
  }
}

/**
 * Lists all available presets across built-in defaults, user presets folder,
 * and repo presets folder (if present).
 */
export async function listPresets(options: PresetOptions = {}): Promise<PresetInfo[]> {
  const map = new Map<string, PresetInfo>()

  // 1. Built-in presets
  for (const [id, theme] of Object.entries(BUILTIN_PRESETS)) {
    map.set(id, {
      id,
      name: theme.name,
      source: "builtin",
      theme,
    })
  }

  // 2. Repo presets directory (if running in repo workspace)
  const repoPresets = options.repoDir ? resolve(options.repoDir, "presets") : resolve(process.cwd(), "presets")
  if (existsSync(repoPresets)) {
    try {
      const entries = await readdir(repoPresets, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".json")) {
          const filePath = join(repoPresets, entry.name)
          try {
            const theme = await readThemeFile(filePath)
            map.set(theme.id, {
              id: theme.id,
              name: theme.name,
              source: "repo",
              path: filePath,
              theme,
            })
          } catch {
            // Ignore invalid repo presets in directory listing
          }
        }
      }
    } catch {
      // Directory read error ignored
    }
  }

  // 3. User presets directory (%LOCALAPPDATA%\TelemostThemeOverride\presets)
  const userDir = presetsDir(options.env)
  if (existsSync(userDir)) {
    try {
      const entries = await readdir(userDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".json")) {
          const filePath = join(userDir, entry.name)
          try {
            const theme = await readThemeFile(filePath)
            // User presets take precedence over repo/builtin with the same id
            map.set(theme.id, {
              id: theme.id,
              name: theme.name,
              source: "user",
              path: filePath,
              theme,
            })
          } catch {
            // Ignore invalid user presets in listing
          }
        }
      }
    } catch {
      // Directory read error ignored
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Resolves a preset by name, ID, or file path.
 *
 * Lookup order:
 *  1. Direct file path if it exists or ends with .json
 *  2. User presets directory (%LOCALAPPDATA%\TelemostThemeOverride\presets)
 *  3. Repo presets directory (presets/)
 *  4. Built-in presets (compiled into binary)
 */
export async function resolvePreset(nameOrPath: string, options: PresetOptions = {}): Promise<PresetResolution> {
  const trimmed = nameOrPath.trim()
  if (!trimmed) {
    throw new PresetError("preset name or path cannot be empty")
  }

  // 1. Direct file path
  if (
    trimmed.endsWith(".json") ||
    isAbsolute(trimmed) ||
    trimmed.startsWith("./") ||
    trimmed.startsWith(".\\") ||
    trimmed.startsWith("../") ||
    trimmed.startsWith("..\\")
  ) {
    const resolvedPath = resolve(trimmed)
    if (existsSync(resolvedPath)) {
      const theme = await readThemeFile(resolvedPath)
      return {
        theme,
        id: theme.id,
        name: theme.name,
        source: "file",
        path: resolvedPath,
      }
    }
  }

  const normalizedId = normalizePresetId(trimmed)
  const normalizedLower = trimmed.toLowerCase()

  // 2. User presets directory
  const userDir = presetsDir(options.env)
  if (existsSync(userDir)) {
    const candidates = [
      join(userDir, `${normalizedId}.json`),
      join(userDir, `${trimmed}.json`),
      join(userDir, trimmed),
    ]
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        const theme = await readThemeFile(candidate)
        return {
          theme,
          id: theme.id,
          name: theme.name,
          source: "user",
          path: candidate,
        }
      }
    }

    // Scan user directory for matching ID or name
    try {
      const entries = await readdir(userDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".json")) {
          const filePath = join(userDir, entry.name)
          try {
            const theme = await readThemeFile(filePath)
            if (
              theme.id === trimmed ||
              theme.id === normalizedId ||
              theme.name.toLowerCase() === normalizedLower ||
              normalizePresetId(theme.name) === normalizedId
            ) {
              return {
                theme,
                id: theme.id,
                name: theme.name,
                source: "user",
                path: filePath,
              }
            }
          } catch {
            // ignore unparseable files
          }
        }
      }
    } catch {
      // ignore readdir error
    }
  }

  // 3. Repo presets directory
  const repoPresets = options.repoDir ? resolve(options.repoDir, "presets") : resolve(process.cwd(), "presets")
  if (existsSync(repoPresets)) {
    const candidate = join(repoPresets, `${normalizedId}.json`)
    if (existsSync(candidate)) {
      const theme = await readThemeFile(candidate)
      return {
        theme,
        id: theme.id,
        name: theme.name,
        source: "repo",
        path: candidate,
      }
    }

    try {
      const entries = await readdir(repoPresets, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".json")) {
          const filePath = join(repoPresets, entry.name)
          try {
            const theme = await readThemeFile(filePath)
            if (
              theme.id === trimmed ||
              theme.id === normalizedId ||
              theme.name.toLowerCase() === normalizedLower ||
              normalizePresetId(theme.name) === normalizedId
            ) {
              return {
                theme,
                id: theme.id,
                name: theme.name,
                source: "repo",
                path: filePath,
              }
            }
          } catch {
            // ignore unparseable files
          }
        }
      }
    } catch {
      // ignore readdir error
    }
  }

  // 4. Built-in presets
  if (BUILTIN_PRESETS[trimmed]) {
    const theme = BUILTIN_PRESETS[trimmed]!
    return { theme, id: trimmed, name: theme.name, source: "builtin" }
  }
  if (BUILTIN_PRESETS[normalizedId]) {
    const theme = BUILTIN_PRESETS[normalizedId]!
    return { theme, id: normalizedId, name: theme.name, source: "builtin" }
  }
  for (const [id, theme] of Object.entries(BUILTIN_PRESETS)) {
    if (
      theme.id === trimmed ||
      theme.id === normalizedId ||
      theme.name.toLowerCase() === normalizedLower ||
      normalizePresetId(theme.name) === normalizedId
    ) {
      return { theme, id, name: theme.name, source: "builtin" }
    }
  }

  // 5. Not found — format error with available presets
  const allPresets = await listPresets(options)
  const availableList = allPresets.map((p) => `  - ${p.id.padEnd(20)} (${p.name}) [${p.source}]`).join("\n")

  throw new PresetError(
    `Preset "${trimmed}" not found.\n\nAvailable presets:\n${availableList || "  (none)"}\n\n` +
      `You can also pass a direct path to a theme JSON file.`,
  )
}

/**
 * Saves a theme as a named preset in the user presets directory.
 */
export async function savePreset(
  themeInput: DesktopTheme | string,
  nameOrId?: string,
  options: PresetOptions = {},
): Promise<{ path: string; preset: PresetInfo }> {
  let theme: DesktopTheme
  if (typeof themeInput === "string") {
    theme = await readThemeFile(themeInput)
  } else {
    theme = desktopThemeSchema.parse(themeInput)
  }

  const id = nameOrId ? normalizePresetId(nameOrId) : theme.id
  const name = nameOrId && nameOrId !== id ? nameOrId : theme.name

  const updatedTheme: DesktopTheme = {
    ...theme,
    id,
    name,
  }

  const userDir = presetsDir(options.env)
  await mkdir(userDir, { recursive: true })

  const targetPath = join(userDir, `${id}.json`)
  await writeFile(targetPath, `${JSON.stringify(updatedTheme, null, 2)}\n`, "utf8")

  const preset: PresetInfo = {
    id,
    name,
    source: "user",
    path: targetPath,
    theme: updatedTheme,
  }

  return { path: targetPath, preset }
}

/**
 * Imports a theme file into the user presets directory.
 */
export async function importPreset(
  sourcePath: string,
  options: PresetOptions = {},
): Promise<{ path: string; preset: PresetInfo }> {
  const fullSource = resolve(sourcePath)
  if (!existsSync(fullSource)) {
    throw new PresetError(`source theme file not found: ${fullSource}`)
  }

  const theme = await readThemeFile(fullSource)
  const id = theme.id || normalizePresetId(basename(fullSource, extname(fullSource)))

  return savePreset(theme, id, options)
}

/**
 * Exports a preset to self-contained JSON with all local background images embedded as Base64 Data URIs.
 */
export async function exportPreset(
  nameOrPathOrTheme: string | DesktopTheme,
  outPath?: string,
  options: PresetOptions = {},
): Promise<{ exportedJson: string; outPath?: string; preset: PresetInfo }> {
  let theme: DesktopTheme
  let id: string
  let name: string
  let source: PresetSource

  if (typeof nameOrPathOrTheme === "string") {
    const resolved = await resolvePreset(nameOrPathOrTheme, options)
    theme = resolved.theme
    id = resolved.id
    name = resolved.name
    source = resolved.source
  } else {
    theme = desktopThemeSchema.parse(nameOrPathOrTheme)
    id = theme.id
    name = theme.name
    source = "file"
  }

  // Ensure all backgrounds are resolved to Data URIs
  const selfContainedTheme = await resolveThemeBackgrounds(theme, process.cwd())
  const exportedJson = `${JSON.stringify(selfContainedTheme, null, 2)}\n`

  if (outPath) {
    const fullOut = resolve(outPath)
    await mkdir(dirname(fullOut), { recursive: true })
    await writeFile(fullOut, exportedJson, "utf8")
    return {
      exportedJson,
      outPath: fullOut,
      preset: { id, name, source, path: fullOut, theme: selfContainedTheme },
    }
  }

  return {
    exportedJson,
    preset: { id, name, source, theme: selfContainedTheme },
  }
}

/**
 * Sets the default active preset in the user's config.json.
 */
export async function setActivePreset(
  presetName: string,
  options: PresetOptions = {},
): Promise<{ configPath: string; preset: string; theme: DesktopTheme }> {
  const resolved = await resolvePreset(presetName, options)
  const configPath = appConfigFilePath(options.env)

  let userConfig: UserConfig
  if (existsSync(configPath)) {
    const raw = await readFile(configPath, "utf8")
    userConfig = userConfigSchema.parse(JSON.parse(raw))
  } else {
    throw new PresetError(`config file not found at ${configPath}. Run telemost-start first to initialize.`)
  }

  const updatedConfig: UserConfig = {
    ...userConfig,
    preset: resolved.id,
  }

  await writeFile(configPath, `${JSON.stringify(updatedConfig, null, 2)}\n`, "utf8")

  return {
    configPath,
    preset: resolved.id,
    theme: resolved.theme,
  }
}

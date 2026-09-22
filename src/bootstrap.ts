import { mkdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { z } from "zod"

import { appConfigFilePath, configDir, findTelemost, telemostCandidates, themeFilePath } from "./paths"
import { desktopThemeSchema, mappingConfigSchema, type MappingConfig } from "./schema"
import { DEFAULT_THEME } from "./defaults/theme"
import { DEFAULT_MAPPING } from "./defaults/mapping"

export type DesktopTheme = z.infer<typeof desktopThemeSchema>

export class BootstrapError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BootstrapError"
  }
}

/**
 * User-editable launcher settings.
 *
 * Kept separate from the theme so a user can repoint the executable without
 * touching colors, and vice versa.
 */
/**
 * What to do with the console window this launcher owns.
 *
 *  - `auto`   hide it once the theme has been applied, but leave it open on
 *             failure so the error stays readable. This is the default.
 *  - `always` hide as soon as possible, even when something went wrong.
 *  - `never`  always keep the window visible.
 *
 * Hiding only ever happens for a console this process owns exclusively (i.e. a
 * double-click from Explorer). Launched from an existing terminal, the window
 * belongs to the shell and is left alone regardless of this setting.
 */
export const consoleModeSchema = z.enum(["auto", "always", "never"])

export type ConsoleMode = z.infer<typeof consoleModeSchema>

export const userConfigSchema = z.object({
  telemostExe: z.string().min(1),
  debugPort: z.number().int().min(1024).max(65535).default(9333),
  /** Stay attached and re-apply the theme on navigation. */
  watch: z.boolean().default(true),
  /** Seconds to wait for the Telemost window to register a CDP target. */
  launchTimeoutSeconds: z.number().int().positive().default(45),
  /** See `consoleModeSchema`. */
  hideConsole: consoleModeSchema.default("auto"),
})

export type UserConfig = z.infer<typeof userConfigSchema>

function describeIssues(issues: ReadonlyArray<z.core.$ZodIssue>): string {
  return issues.map((issue) => `  - ${issue.path.join(".") || "<root>"}: ${issue.message}`).join("\n")
}

export interface BootstrapResult {
  readonly directory: string
  readonly themePath: string
  readonly configPath: string
  readonly createdTheme: boolean
  readonly createdConfig: boolean
  readonly theme: DesktopTheme
  readonly config: UserConfig
  readonly mapping: MappingConfig
}

/**
 * Ensures the config directory exists and is populated, then loads it.
 *
 * First run writes both files with the defaults baked into this binary.
 * Subsequent runs read whatever the user left there — files are never
 * overwritten, so hand edits survive upgrades of this tool.
 */
export async function bootstrap(env: NodeJS.ProcessEnv = process.env): Promise<BootstrapResult> {
  const directory = configDir(env)
  const themePath = themeFilePath(env)
  const configPath = appConfigFilePath(env)

  await mkdir(directory, { recursive: true })

  let createdTheme = false
  if (!existsSync(themePath)) {
    await writeFile(themePath, `${JSON.stringify(DEFAULT_THEME, null, 2)}\n`, "utf8")
    createdTheme = true
  }

  let createdConfig = false
  if (!existsSync(configPath)) {
    const detected = findTelemost(env)
    if (!detected) {
      throw new BootstrapError(
        [
          "Could not find YandexTelemost.exe in any known location:",
          ...telemostCandidates(env).map((path) => `  ${path}`),
          "",
          `Create ${configPath} manually with:`,
          '  { "telemostExe": "<full path to YandexTelemost.exe>" }',
        ].join("\n"),
      )
    }
    const seed: UserConfig = userConfigSchema.parse({ telemostExe: detected })
    await writeFile(configPath, `${JSON.stringify(seed, null, 2)}\n`, "utf8")
    createdConfig = true
  }

  const theme = await readValidated(themePath, desktopThemeSchema, "theme")
  const config = await readValidated(configPath, userConfigSchema, "config")

  if (!existsSync(config.telemostExe)) {
    throw new BootstrapError(
      `Telemost executable not found at:\n  ${config.telemostExe}\n\nFix "telemostExe" in ${configPath}`,
    )
  }

  // The token mapping is an implementation detail of how Orb is structured,
  // not a user preference, so it stays compiled in rather than on disk.
  const mapping = mappingConfigSchema.parse(DEFAULT_MAPPING)

  return { directory, themePath, configPath, createdTheme, createdConfig, theme, config, mapping }
}

async function readValidated<T>(path: string, schema: z.ZodType<T>, label: string): Promise<T> {
  let raw: string
  try {
    raw = await readFile(path, "utf8")
  } catch (error) {
    throw new BootstrapError(`cannot read ${label} file ${path}: ${error instanceof Error ? error.message : error}`)
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch (error) {
    throw new BootstrapError(
      `${path} is not valid JSON: ${error instanceof Error ? error.message : error}\n\n` +
        `Delete the file to regenerate it with defaults.`,
    )
  }

  const result = schema.safeParse(parsedJson)
  if (!result.success) {
    throw new BootstrapError(
      `${path} is not a valid ${label} file:\n${describeIssues(result.error.issues)}\n\n` +
        `Delete the file to regenerate it with defaults.`,
    )
  }
  return result.data
}

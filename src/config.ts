import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { appConfigSchema, desktopThemeSchema, mappingConfigSchema, type AppConfig, type MappingConfig } from "./schema"
import type { z } from "zod"

export type DesktopTheme = z.infer<typeof desktopThemeSchema>

export const DEFAULT_TELEMOST_EXE = "C:\\Program Files\\Yandex\\YandexTelemost\\YandexTelemost.exe"

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConfigError"
  }
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new ConfigError(`cannot read JSON from ${path}: ${reason}`)
  }
}

function describeIssues(issues: ReadonlyArray<z.core.$ZodIssue>): string {
  return issues.map((issue) => `  - ${issue.path.join(".") || "<root>"}: ${issue.message}`).join("\n")
}

export async function loadTheme(path: string): Promise<DesktopTheme> {
  const parsed = desktopThemeSchema.safeParse(await readJson(path))
  if (!parsed.success) {
    throw new ConfigError(`invalid theme file ${path}:\n${describeIssues(parsed.error.issues)}`)
  }
  return parsed.data
}

export async function loadMapping(path: string): Promise<MappingConfig> {
  const parsed = mappingConfigSchema.safeParse(await readJson(path))
  if (!parsed.success) {
    throw new ConfigError(`invalid mapping file ${path}:\n${describeIssues(parsed.error.issues)}`)
  }
  return parsed.data
}

export interface CliOverrides {
  readonly theme?: string
  readonly mapping?: string
  readonly port?: number
  readonly exe?: string
  readonly watch?: boolean
}

export function buildAppConfig(root: string, overrides: CliOverrides): AppConfig {
  const parsed = appConfigSchema.safeParse({
    telemostExe: overrides.exe ?? DEFAULT_TELEMOST_EXE,
    debugHost: "127.0.0.1",
    debugPort: overrides.port ?? 9333,
    themeFile: resolve(root, overrides.theme ?? "config/theme.json"),
    mappingFile: resolve(root, overrides.mapping ?? "config/mapping.json"),
    watch: overrides.watch ?? true,
    launchTimeoutMs: 45_000,
  })

  if (!parsed.success) {
    throw new ConfigError(`invalid runtime configuration:\n${describeIssues(parsed.error.issues)}`)
  }
  return parsed.data
}

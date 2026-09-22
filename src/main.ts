import { parseArgs } from "node:util"
import { writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { buildAppConfig, loadMapping, loadTheme, ConfigError } from "./config"
import { buildCss } from "./theme/generate"
import { CdpSession, fetchVersion, waitForPageTarget, type CdpTarget } from "./cdp/client"
import { applyToLiveDocument, buildAgentSource, verify, waitForAppStyles } from "./inject"
import { isDebuggerUp, launchTelemost } from "./launcher"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const HELP = `telemost-theme-override

Repaints Yandex Telemost with a shuvcode theme. Telemost's own files are never
modified — the stylesheet is injected at runtime over Qt WebEngine's DevTools
protocol, which Telemost exposes through the stock QTWEBENGINE_REMOTE_DEBUGGING
environment variable.

Usage:
  bun run apply                 launch Telemost (if needed), inject, keep watching
  bun run apply -- --once       inject and exit
  bun run build-css             print the generated CSS, touch nothing
  bun run doctor                report what is currently running and resolvable

Options:
  --theme <path>    seed colors (default: config/theme.json)
  --mapping <path>  token mapping (default: config/mapping.json)
  --port <number>   CDP port on 127.0.0.1 (default: 9333)
  --exe <path>      Telemost executable
  --out <path>      with build-css: write to a file instead of stdout
  --once            do not stay attached
  --help            this text
`

function isTelemostPage(target: CdpTarget): boolean {
  return target.url.startsWith("ychat://") || target.url.includes("telemost")
}

async function commandBuildCss(overrides: ReturnType<typeof readOverrides>, out: string | undefined): Promise<void> {
  const config = buildAppConfig(ROOT, overrides)
  const [theme, mapping] = await Promise.all([loadTheme(config.themeFile), loadMapping(config.mappingFile)])
  const css = buildCss({ theme, mapping })

  if (out) {
    await writeFile(resolve(ROOT, out), css, "utf8")
    console.log(`wrote ${css.length} bytes to ${out}`)
  } else {
    process.stdout.write(css)
  }
}

async function commandDoctor(overrides: ReturnType<typeof readOverrides>): Promise<void> {
  const config = buildAppConfig(ROOT, overrides)
  const up = await isDebuggerUp(config.debugHost, config.debugPort)
  console.log(`CDP endpoint  : http://${config.debugHost}:${config.debugPort} — ${up ? "reachable" : "not reachable"}`)

  if (!up) {
    console.log("\nTelemost is not running with remote debugging enabled.")
    console.log("Run `bun run apply` to start it correctly.")
    return
  }

  const version = await fetchVersion(config.debugHost, config.debugPort)
  console.log(`browser       : ${version.Browser}`)
  console.log(`CDP protocol  : ${version["Protocol-Version"]}`)

  const target = await waitForPageTarget(config.debugHost, config.debugPort, isTelemostPage, 5_000)
  console.log(`page target   : ${target.url}`)

  const session = await CdpSession.connect(target.webSocketDebuggerUrl ?? "")
  try {
    const mapping = await loadMapping(config.mappingFile)
    const report = await verify(session, mapping)
    console.log(`root classes  : ${report.rootClasses}`)
    console.log(`override tag  : ${report.styleTagPresent ? "present" : "absent"}`)
    console.log("\nresolved tokens:")
    for (const [token, value] of Object.entries(report.resolved)) {
      console.log(`  ${token.padEnd(38)} ${value}`)
    }
    if (report.missing.length > 0) {
      console.log("\nMISSING tokens (Telemost may have renamed them):")
      for (const token of report.missing) console.log(`  ${token}`)
    }
  } finally {
    session.close()
  }
}

async function commandApply(overrides: ReturnType<typeof readOverrides>, once: boolean): Promise<void> {
  const config = buildAppConfig(ROOT, overrides)
  const [theme, mapping] = await Promise.all([loadTheme(config.themeFile), loadMapping(config.mappingFile)])
  const css = buildCss({ theme, mapping })
  console.log(`theme         : ${theme.name} (${theme.id})`)

  const launch = await launchTelemost(config, {
    onRestart: () => console.log("Telemost      : running without debugging — restarting to attach"),
  })

  console.log(
    launch.alreadyRunning
      ? `Telemost      : already running with debugging on port ${config.debugPort}`
      : `Telemost      : ${launch.restarted ? "restarted" : "started"} (pid ${launch.pid ?? "unknown"})`,
  )

  const target = await waitForPageTarget(config.debugHost, config.debugPort, isTelemostPage, config.launchTimeoutMs)
  console.log(`page target   : ${target.url}`)

  const wsUrl = target.webSocketDebuggerUrl
  if (!wsUrl) throw new Error("target has no webSocketDebuggerUrl")

  const session = await CdpSession.connect(wsUrl)

  try {
    await session.send("Page.enable")
    await session.send("Runtime.enable")

    // Survives reloads and in-app navigation.
    const identifier = await session.addScriptOnNewDocument(buildAgentSource(css))
    // And take effect on the document that is already on screen.
    await applyToLiveDocument(session, css)
    console.log(`injected      : persistent script ${identifier} + live document`)

    // The page target shows up before Telemost parses its CSS; verifying in
    // that window reports every token missing even though injection worked.
    const styled = await waitForAppStyles(session, mapping, 30_000)
    if (styled) await applyToLiveDocument(session, css)
    else console.warn("note          : Telemost still loading; verification may be incomplete")

    const report = await verify(session, mapping)
    console.log(`root classes  : ${report.rootClasses}`)
    console.log(`override tag  : ${report.styleTagPresent ? "present" : "absent"}`)

    const sample = Object.entries(report.resolved).slice(0, 6)
    for (const [token, value] of sample) console.log(`  ${token.padEnd(38)} ${value}`)

    if (report.missing.length > 0) {
      console.warn(`\nWARNING: ${report.missing.length} expected token(s) are missing:`)
      for (const token of report.missing) console.warn(`  ${token}`)
      console.warn("Telemost likely renamed them. Update config/mapping.json.")
      process.exitCode = 2
    }

    if (once || !config.watch) return

    console.log("\nAttached. Re-applies on every navigation. Ctrl+C to detach (Telemost keeps running).")
    session.on("Page.frameNavigated", () => {
      void applyToLiveDocument(session, css).catch((error: unknown) => {
        console.warn(`re-apply failed: ${error instanceof Error ? error.message : String(error)}`)
      })
    })

    await new Promise<void>((resolvePromise) => {
      const stop = (): void => resolvePromise()
      process.once("SIGINT", stop)
      process.once("SIGTERM", stop)
    })
  } finally {
    session.close()
  }
}

function readOverrides(values: Record<string, string | boolean | undefined>): {
  theme?: string
  mapping?: string
  port?: number
  exe?: string
  watch?: boolean
} {
  const port = typeof values.port === "string" ? Number.parseInt(values.port, 10) : undefined
  if (port !== undefined && Number.isNaN(port)) throw new ConfigError("--port must be a number")

  return {
    theme: typeof values.theme === "string" ? values.theme : undefined,
    mapping: typeof values.mapping === "string" ? values.mapping : undefined,
    port,
    exe: typeof values.exe === "string" ? values.exe : undefined,
    watch: values.once === true ? false : undefined,
  }
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      theme: { type: "string" },
      mapping: { type: "string" },
      port: { type: "string" },
      exe: { type: "string" },
      out: { type: "string" },
      once: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  })

  if (values.help) {
    process.stdout.write(HELP)
    return
  }

  const command = positionals[0] ?? "apply"
  const overrides = readOverrides(values)

  switch (command) {
    case "apply":
      await commandApply(overrides, values.once === true)
      return
    case "build-css":
      await commandBuildCss(overrides, typeof values.out === "string" ? values.out : undefined)
      return
    case "doctor":
      await commandDoctor(overrides)
      return
    default:
      process.stderr.write(`unknown command: ${command}\n\n${HELP}`)
      process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`\nerror: ${message}\n`)
  process.exitCode = 1
})

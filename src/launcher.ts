import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import type { AppConfig } from "./schema"
import { findRunning, stopTelemost } from "./process"

export class LauncherError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LauncherError"
  }
}

/**
 * Starts Telemost with the Qt WebEngine DevTools server enabled.
 *
 * `QTWEBENGINE_REMOTE_DEBUGGING` is a stock Qt facility (present in the shipped
 * Qt6WebEngineCore.dll). Passing it as an environment variable of the child
 * process means:
 *   - no Telemost file is touched
 *   - the executable signature stays intact
 *   - nothing is written to the user's or machine's persistent environment
 *
 * Format is `host:port` or bare `port`; Qt parses everything before the last
 * colon as the bind address. We pin it to loopback on purpose — binding to a
 * routable interface would hand out remote control of a logged-in session.
 */
export function buildEnv(config: AppConfig, base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return {
    ...base,
    QTWEBENGINE_REMOTE_DEBUGGING: `${config.debugHost}:${config.debugPort}`,
  }
}

export interface LaunchResult {
  readonly pid: number | undefined
  readonly alreadyRunning: boolean
  /** True when a debugger-less instance had to be closed first. */
  readonly restarted: boolean
}

export async function isDebuggerUp(host: string, port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://${host}:${port}/json/version`, {
      signal: AbortSignal.timeout(1_500),
    })
    return response.ok
  } catch {
    return false
  }
}

export interface LaunchOptions {
  /** Invoked before an existing debugger-less instance is stopped. */
  readonly onRestart?: (running: number) => void
}

export async function launchTelemost(config: AppConfig, options: LaunchOptions = {}): Promise<LaunchResult> {
  // An instance that already exposes the DevTools port is one we can use as-is.
  if (await isDebuggerUp(config.debugHost, config.debugPort)) {
    return { pid: undefined, alreadyRunning: true, restarted: false }
  }

  if (!existsSync(config.telemostExe)) {
    throw new LauncherError(`Telemost executable not found: ${config.telemostExe}`)
  }

  /*
   * Telemost is single-instance. Launching a second copy just forwards the
   * arguments to the running one and exits, and QTWEBENGINE_REMOTE_DEBUGGING is
   * only read at process start — so an instance launched from the ordinary
   * shortcut can never be attached to. Restarting it is the only way in.
   */
  const running = await findRunning(config.telemostExe)
  let restarted = false
  if (running.length > 0) {
    options.onRestart?.(running.length)
    await stopTelemost(config.telemostExe)
    restarted = true
  }

  const child = spawn(config.telemostExe, [], {
    env: buildEnv(config),
    detached: true,
    stdio: "ignore",
  })
  child.unref()

  return { pid: child.pid, alreadyRunning: false, restarted }
}

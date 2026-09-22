import { spawn } from "node:child_process"
import { basename } from "node:path"

/**
 * Stopping a running Telemost before launching our own.
 *
 * This is required, not cosmetic. Telemost enforces a single instance: a second
 * launch hands its arguments to the existing process and exits immediately
 * ("Sending 2nd instance my launch args and quit" in its own log). Since
 * QTWEBENGINE_REMOTE_DEBUGGING is read once at startup, an instance that was
 * started from the normal shortcut has no DevTools server, and nothing we do
 * afterwards can attach to it — the launcher just times out.
 */

export interface RunningProcess {
  readonly pid: number
  readonly name: string
}

/**
 * Runs a PowerShell snippet and returns stdout.
 *
 * The trailing `exit 0` is load-bearing: PowerShell reports exit code 1 when a
 * pipeline produces no output, even with `-ErrorAction SilentlyContinue` and an
 * empty stderr. "No Telemost is running" is a completely normal state here, so
 * without this an ordinary empty result would look like a failure.
 */
function runPowerShell(script: string, timeoutMs = 15_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell", ["-NoProfile", "-NonInteractive", "-Command", `${script}; exit 0`], {
      shell: false,
    })

    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error("powershell call timed out"))
    }, timeoutMs)

    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()))
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()))
    child.on("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on("exit", (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(stdout)
      else reject(new Error(stderr.trim() || `powershell exited with ${code}`))
    })
  })
}

/** Process names Telemost spawns, main window first. */
function processNamesFor(exePath: string): string[] {
  const main = basename(exePath).replace(/\.exe$/i, "")
  return [main, "QtWebEngineProcess"]
}

export async function findRunning(exePath: string): Promise<RunningProcess[]> {
  const names = processNamesFor(exePath)
    .map((name) => `'${name.replace(/'/g, "''")}'`)
    .join(",")

  // `Select-Object` + CSV rather than a "$($_.Id)" interpolated string: the
  // subexpression syntax does not survive being passed through spawn() without
  // a shell, and fails with an empty stderr that is impossible to diagnose.
  const output = await runPowerShell(
    `Get-Process -Name ${names} -ErrorAction SilentlyContinue |` +
      ` Select-Object -Property Id,ProcessName |` +
      ` ConvertTo-Csv -NoTypeInformation`,
  )

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('"Id"'))
    .map((line) => {
      const cells = line.split(",").map((cell) => cell.replace(/^"|"$/g, ""))
      return { pid: Number(cells[0]), name: cells[1] ?? "" }
    })
    .filter((entry) => Number.isInteger(entry.pid) && entry.pid > 0)
}

export interface StopResult {
  readonly stopped: number
  readonly forced: boolean
}

/**
 * Closes a running Telemost.
 *
 * A window-close request goes first so the app gets a chance to flush state.
 * Note that Telemost usually does NOT exit on it — measured: still alive after
 * 79 s, because closing the window minimises it to the tray. The grace period
 * is therefore short by design; it exists to catch the case where Telemost is
 * genuinely quitting, not to wait out a minimise.
 *
 * `QtWebEngineProcess` children normally die with their parent and are only
 * swept at the end if they were orphaned.
 */
export async function stopTelemost(exePath: string, gracePeriodMs = 2_500): Promise<StopResult> {
  const running = await findRunning(exePath)
  if (running.length === 0) return { stopped: 0, forced: false }

  const mainName = processNamesFor(exePath)[0] ?? "YandexTelemost"
  const escapedMain = mainName.replace(/'/g, "''")

  // CloseMainWindow is the equivalent of clicking the window's X: it lets
  // Telemost shut down its call session and persist settings.
  await runPowerShell(
    `Get-Process -Name '${escapedMain}' -ErrorAction SilentlyContinue |` +
      ` ForEach-Object { [void]$_.CloseMainWindow() }`,
  ).catch(() => {
    /* best effort — we verify below regardless */
  })

  const deadline = Date.now() + gracePeriodMs
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    if ((await findRunning(exePath)).length === 0) {
      return { stopped: running.length, forced: false }
    }
  }

  // Still alive (no window, or it ignored the request) — terminate.
  await runPowerShell(
    `Get-Process -Name '${escapedMain}' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue`,
  ).catch(() => {})

  await new Promise((resolve) => setTimeout(resolve, 1_000))

  // Sweep renderer processes only if they outlived their parent.
  const orphans = await findRunning(exePath)
  if (orphans.length > 0) {
    await runPowerShell(
      `Get-Process -Name 'QtWebEngineProcess' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue`,
    ).catch(() => {})
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return { stopped: running.length, forced: true }
}

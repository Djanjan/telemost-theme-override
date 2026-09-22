import { dlopen, FFIType, ptr, suffix } from "bun:ffi"

/**
 * Hides the console window this process owns.
 *
 * Why not `bun build --windows-hide-console`: that flag strips the console at
 * link time, so startup errors and the token-verification warnings become
 * invisible with no way to get them back. Hiding at runtime keeps the window
 * available for failures and lets the behaviour be configured.
 *
 * The critical safety property is ownership. `GetConsoleProcessList` reports
 * every process attached to the current console:
 *
 *   - exactly 1  -> Windows created this console for us (double-click from
 *                   Explorer); hiding it affects nobody else
 *   - 2 or more  -> we are running inside someone's shell (measured: 10 for a
 *                   PowerShell session); hiding it would take away their
 *                   terminal, so we refuse
 */

const SW_HIDE = 0

interface ConsoleApi {
  readonly getConsoleWindow: () => number | bigint | null
  readonly getProcessCount: () => number
  readonly showWindow: (handle: number | bigint, command: number) => boolean
}

let cachedApi: ConsoleApi | null | undefined

function loadApi(): ConsoleApi | null {
  if (cachedApi !== undefined) return cachedApi

  if (process.platform !== "win32") {
    cachedApi = null
    return cachedApi
  }

  try {
    const kernel32 = dlopen(`kernel32.${suffix}`, {
      GetConsoleWindow: { args: [], returns: FFIType.ptr },
      GetConsoleProcessList: { args: [FFIType.ptr, FFIType.u32], returns: FFIType.u32 },
    })

    const user32 = dlopen(`user32.${suffix}`, {
      ShowWindow: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.bool },
    })

    cachedApi = {
      getConsoleWindow: () => kernel32.symbols.GetConsoleWindow(),
      getProcessCount: () => {
        // DWORD array — must be 32-bit, a 64-bit buffer yields garbage pids.
        const buffer = new Uint32Array(16)
        return Number(kernel32.symbols.GetConsoleProcessList(ptr(buffer), 16))
      },
      showWindow: (handle, command) => Boolean(user32.symbols.ShowWindow(handle as never, command)),
    }
  } catch {
    // FFI unavailable (non-Windows, or a locked-down environment).
    cachedApi = null
  }

  return cachedApi
}

export interface ConsoleOwnership {
  readonly hasConsole: boolean
  /** True when this process is the only one attached — safe to hide. */
  readonly ownsConsole: boolean
  readonly attachedProcesses: number
}

export function inspectConsole(): ConsoleOwnership {
  const api = loadApi()
  if (!api) return { hasConsole: false, ownsConsole: false, attachedProcesses: 0 }

  const handle = api.getConsoleWindow()
  const hasConsole = handle !== null && Number(handle) !== 0
  if (!hasConsole) return { hasConsole: false, ownsConsole: false, attachedProcesses: 0 }

  const attachedProcesses = api.getProcessCount()
  return { hasConsole, ownsConsole: attachedProcesses === 1, attachedProcesses }
}

/**
 * Hides the console window if — and only if — this process owns it.
 *
 * Returns true when the window was actually hidden.
 */
export function hideConsoleWindow(): boolean {
  const api = loadApi()
  if (!api) return false

  const ownership = inspectConsole()
  if (!ownership.hasConsole || !ownership.ownsConsole) return false

  const handle = api.getConsoleWindow()
  if (handle === null || Number(handle) === 0) return false

  return api.showWindow(handle, SW_HIDE)
}

import {
  addScriptResultSchema,
  cdpMessageSchema,
  cdpTargetListSchema,
  cdpVersionSchema,
  runtimeEvaluateResultSchema,
} from "../schema"
import type { z } from "zod"

export type CdpTarget = z.infer<typeof cdpTargetListSchema>[number]

export class CdpError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message)
    this.name = "CdpError"
  }
}

interface Pending {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const DEFAULT_TIMEOUT_MS = 20_000

export async function fetchVersion(host: string, port: number): Promise<z.infer<typeof cdpVersionSchema>> {
  const response = await fetch(`http://${host}:${port}/json/version`)
  if (!response.ok) throw new CdpError(`/json/version returned ${response.status}`)
  return cdpVersionSchema.parse(await response.json())
}

export async function listTargets(host: string, port: number): Promise<CdpTarget[]> {
  const response = await fetch(`http://${host}:${port}/json/list`)
  if (!response.ok) throw new CdpError(`/json/list returned ${response.status}`)
  return cdpTargetListSchema.parse(await response.json())
}

/**
 * Waits until the Telemost UI page shows up as a CDP target.
 *
 * Verified empirically on Qt WebEngine 6.8.3 (Chrome/122): pages served from the
 * custom `ychat://` scheme DO appear in /json/list — the target is registered per
 * WebContents, independent of URL scheme.
 */
export async function waitForPageTarget(
  host: string,
  port: number,
  matcher: (target: CdpTarget) => boolean,
  timeoutMs: number,
): Promise<CdpTarget> {
  const deadline = Date.now() + timeoutMs
  let lastError = "no targets seen"

  while (Date.now() < deadline) {
    try {
      const targets = await listTargets(host, port)
      const match = targets.find((target) => target.type === "page" && matcher(target) && target.webSocketDebuggerUrl)
      if (match) return match
      lastError = `targets present but none matched (${targets.map((t) => t.url).join(", ") || "empty"})`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new CdpError(`timed out waiting for a Telemost page target: ${lastError}`)
}

export class CdpSession {
  private socket: WebSocket | null = null
  private nextId = 0
  private readonly pending = new Map<number, Pending>()
  private readonly listeners = new Map<string, Set<(params: unknown) => void>>()
  private closed = false

  private constructor(private readonly url: string) {}

  static async connect(webSocketDebuggerUrl: string): Promise<CdpSession> {
    const session = new CdpSession(webSocketDebuggerUrl)
    await session.open()
    return session
  }

  private open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url)
      const failFast = (event: Event | ErrorEvent): void => {
        const detail = "message" in event && typeof event.message === "string" ? event.message : "connection failed"
        reject(new CdpError(`websocket error: ${detail}`))
      }

      socket.addEventListener("open", () => {
        socket.removeEventListener("error", failFast)
        this.socket = socket
        resolve()
      })
      socket.addEventListener("error", failFast)
      socket.addEventListener("close", () => {
        this.closed = true
        for (const [, pending] of this.pending) {
          clearTimeout(pending.timer)
          pending.reject(new CdpError("websocket closed before response"))
        }
        this.pending.clear()
      })
      socket.addEventListener("message", (event: MessageEvent) => {
        this.handleMessage(typeof event.data === "string" ? event.data : "")
      })
    })
  }

  private handleMessage(raw: string): void {
    if (!raw) return
    const parsed = cdpMessageSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return
    const message = parsed.data

    if (typeof message.id === "number") {
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      clearTimeout(pending.timer)
      if (message.error) {
        pending.reject(new CdpError(message.error.message, message.error.code))
      } else {
        pending.resolve(message.result ?? {})
      }
      return
    }

    if (message.method) {
      const handlers = this.listeners.get(message.method)
      if (handlers) for (const handler of handlers) handler(message.params)
    }
  }

  on(method: string, handler: (params: unknown) => void): void {
    const existing = this.listeners.get(method) ?? new Set()
    existing.add(handler)
    this.listeners.set(method, existing)
  }

  send(method: string, params: Record<string, unknown> = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
    const socket = this.socket
    if (!socket || this.closed) return Promise.reject(new CdpError("session is not connected"))

    const id = ++this.nextId
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new CdpError(`timeout waiting for ${method}`))
      }, timeoutMs)

      this.pending.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }

  async evaluate<T>(expression: string, schema: z.ZodType<T>): Promise<T> {
    const raw = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    const parsed = runtimeEvaluateResultSchema.parse(raw)
    if (parsed.exceptionDetails) {
      const description = parsed.exceptionDetails.exception?.description ?? parsed.exceptionDetails.text
      throw new CdpError(`page threw while evaluating: ${description}`)
    }
    return schema.parse(parsed.result.value)
  }

  /** Persists across reloads and navigations — this is what makes the theme stick. */
  async addScriptOnNewDocument(source: string): Promise<string> {
    const raw = await this.send("Page.addScriptToEvaluateOnNewDocument", { source })
    return addScriptResultSchema.parse(raw).identifier
  }

  async removeScriptOnNewDocument(identifier: string): Promise<void> {
    await this.send("Page.removeScriptToEvaluateOnNewDocument", { identifier })
  }

  close(): void {
    this.closed = true
    this.socket?.close()
    this.socket = null
  }
}

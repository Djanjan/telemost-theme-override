/**
 * Full build pipeline for dist/telemost-start.exe.
 *
 *   1. sync-defaults   bake config/*.json into src/defaults/*.ts
 *   2. recolor-icon    derive assets/telemost-themed.ico from the theme
 *   3. bun build       compile the standalone executable
 *   4. embed-icon      replace Bun's icon group with ours (see below)
 *   5. verify          assert exactly one icon group survived
 *
 * Step 4 exists because `bun build --windows-icon` ADDS a resource group
 * instead of replacing Bun's, leaving two RT_GROUP_ICON entries. Windows
 * resolves a file's display icon to the group with the lowest resource ID, so
 * the result is not deterministic. We rewrite the resource section ourselves.
 */

import { spawn } from "node:child_process"
import { mkdir, stat } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const EXE = resolve(ROOT, "dist/telemost-start.exe")
const ICON = resolve(ROOT, "assets/telemost-themed.ico")

const METADATA = {
  title: "Telemost Theme Override",
  description: "Launches Yandex Telemost with a custom theme",
  publisher: "telemost-theme-override",
  version: "1.0.0.0",
} as const

function run(command: string, args: readonly string[], label: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: "inherit", shell: false })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`${label} exited with code ${code}`))
    })
  })
}

function runCapture(command: string, args: readonly string[]): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: ROOT, shell: false })
    let out = ""
    let err = ""
    child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString()))
    child.stderr.on("data", (chunk: Buffer) => (err += chunk.toString()))
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolvePromise(out)
      else reject(new Error(err.trim() || `exited with code ${code}`))
    })
  })
}

async function main(): Promise<void> {
  console.log("[1/5] syncing defaults")
  await run("bun", ["run", "scripts/sync-defaults.ts"], "sync-defaults")

  console.log("[2/5] recoloring icon")
  await run("bun", ["run", "scripts/recolor-icon.ts"], "recolor-icon")

  console.log("[3/5] compiling executable")
  await mkdir(resolve(ROOT, "dist"), { recursive: true })
  await run(
    "bun",
    [
      "build",
      "src/start.ts",
      "--compile",
      "--outfile",
      "dist/telemost-start.exe",
      "--windows-icon",
      "assets/telemost-themed.ico",
      "--windows-title",
      METADATA.title,
      "--windows-description",
      METADATA.description,
      "--windows-publisher",
      METADATA.publisher,
      "--windows-version",
      METADATA.version,
    ],
    "bun build",
  )

  console.log("[4/5] embedding icon as the sole resource group")
  const embedOutput = await runCapture("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    resolve(ROOT, "scripts/embed-icon.ps1"),
    "-ExePath",
    EXE,
    "-IcoPath",
    ICON,
  ])
  process.stdout.write(embedOutput)

  console.log("[5/5] verifying")
  const verifyOutput = (
    await runCapture("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      resolve(ROOT, "scripts/verify-icon.ps1"),
      "-ExePath",
      EXE,
    ])
  ).trim()

  const match = /groups=(\d+) primary=(\d+)x(\d+)/.exec(verifyOutput)
  if (!match) throw new Error(`could not verify embedded icon: ${verifyOutput}`)

  const groups = Number(match[1])
  if (groups !== 1) {
    throw new Error(`expected exactly 1 icon group in the executable, found ${groups}`)
  }

  const size = (await stat(EXE)).size
  console.log(`      ${verifyOutput}`)
  console.log(`\ndist/telemost-start.exe  ${(size / 1024 / 1024).toFixed(1)} MB`)
}

main().catch((error: unknown) => {
  process.stderr.write(`\nbuild failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})

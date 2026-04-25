// ~/.wizardo/auth.json — stores token for local dev. Gitignored,
// mode 600. In CI, use WIZARDO_TOKEN env var instead.

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import { chmod } from "node:fs/promises"

const AUTH_FILE = join(homedir(), ".wizardo", "auth.json")

type AuthFile = {
  token: string
  baseUrl?: string
}

export async function readStoredToken(): Promise<string | null> {
  try {
    const raw = await readFile(AUTH_FILE, "utf8")
    const parsed = JSON.parse(raw) as AuthFile
    return parsed.token ?? null
  } catch {
    return null
  }
}

export async function writeStoredToken(token: string, baseUrl?: string): Promise<void> {
  await mkdir(join(homedir(), ".wizardo"), { recursive: true })
  const contents: AuthFile = { token, ...(baseUrl ? { baseUrl } : {}) }
  await writeFile(AUTH_FILE, JSON.stringify(contents, null, 2), { encoding: "utf8", mode: 0o600 })
  await chmod(AUTH_FILE, 0o600)
}

export async function clearStoredToken(): Promise<void> {
  try {
    await writeFile(AUTH_FILE, JSON.stringify({}), "utf8")
  } catch { /* file may not exist */ }
}

// Auth resolution order: --token flag > WIZARDO_TOKEN env > ~/.wizardo/auth.json
export async function resolveToken(flagToken?: string): Promise<string | null> {
  if (flagToken) return flagToken
  if (process.env.WIZARDO_TOKEN) return process.env.WIZARDO_TOKEN
  return readStoredToken()
}

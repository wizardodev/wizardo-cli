// .wizardo/project.json in the repo root — links a directory to a
// wizardo project + remote. Committed to source control.

import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

const CONFIG_FILE = ".wizardo/project.json"

export type ProjectConfig = {
  version: 1
  projectSlug: string
  remoteName: string
  apiBaseUrl?: string
}

export async function readProjectConfig(
  cwd = process.cwd()
): Promise<ProjectConfig | null> {
  try {
    const raw = await readFile(join(cwd, CONFIG_FILE), "utf8")
    const parsed = JSON.parse(raw) as ProjectConfig
    if (parsed.version !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export async function writeProjectConfig(
  config: ProjectConfig,
  cwd = process.cwd()
): Promise<void> {
  await mkdir(join(cwd, ".wizardo"), { recursive: true })
  await writeFile(
    join(cwd, CONFIG_FILE),
    JSON.stringify(config, null, 2) + "\n",
    "utf8"
  )
}

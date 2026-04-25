import { join, resolve } from "node:path"
import { WizardoClient, WizardoApiError } from "@wizardo/sdk"
import type { DeployProgress } from "@wizardo/sdk"
import type { Command } from "commander"

import { detectCi } from "../ci/detect.js"
import { resolveToken } from "../config/auth.js"
import { readProjectConfig } from "../config/project.js"

export function registerDeployCommand(program: Command) {
  program
    .command("deploy [dir]")
    .description("Deploy a built dist directory to a Wizardo environment")
    .option("-p, --project <slug>", "project slug (overrides .wizardo/project.json)")
    .option("-r, --remote <name>", "remote name, e.g. @myorg/dashboard")
    .option("-e, --env <name>", "environment name (required: dev, staging, production, …)")
    .option("-t, --token <token>", "API token (overrides WIZARDO_TOKEN env var)")
    .option("--entry <file>", "entry file within dist/, e.g. index.js")
    .option("--git-sha <sha>", "git commit SHA (auto-detected from CI env)")
    .option("--git-branch <branch>", "git branch (auto-detected from CI env)")
    .option("--base-url <url>", "API base URL (default: https://api.wizardo.dev)")
    .option("--json", "output machine-readable JSON to stdout; human text goes to stderr")
    .option("--concurrency <n>", "upload concurrency (default: 8)", "8")
    .action(async (dirArg: string | undefined, opts: Record<string, string | undefined>) => {
      const jsonMode = !!opts.json
      const log = jsonMode ? (...a: unknown[]) => process.stderr.write(a.join(" ") + "\n") : console.log.bind(console)
      const err = jsonMode ? (...a: unknown[]) => process.stderr.write(a.join(" ") + "\n") : console.error.bind(console)

      // --- Resolve configuration ---
      const token = await resolveToken(opts.token)
      if (!token) {
        err("error: no token found. Set WIZARDO_TOKEN or run `wizardo login`.")
        process.exit(1)
      }

      const projectConfig = await readProjectConfig()

      const remoteName = opts.remote ?? projectConfig?.remoteName
      if (!remoteName) {
        err("error: --remote is required (or run `wizardo link` to set a default)")
        process.exit(1)
      }

      const envName = opts.env
      if (!envName) {
        err("error: --env is required (e.g. --env production)")
        process.exit(1)
      }

      const distDir = resolve(dirArg ?? "dist")
      const baseUrl = opts.baseUrl ?? projectConfig?.apiBaseUrl ?? undefined

      // --- CI auto-detect ---
      const ci = detectCi()
      const gitSha = opts.gitSha ?? ci.sha ?? undefined
      const gitBranch = opts.gitBranch ?? ci.branch ?? undefined

      if (ci.provider) {
        log(`ℹ detected CI: ${ci.provider}${gitSha ? ` @ ${gitSha.slice(0, 7)}` : ""}`)
      }

      log(`↑ deploying ${join(distDir)} → ${remoteName} (${envName})`)

      const client = new WizardoClient({ token, baseUrl })
      const concurrency = Math.max(1, parseInt(opts.concurrency ?? "8", 10))
      let fileCount = 0

      try {
        const result = await client.deploy({
          remoteName,
          envName,
          dir: distDir,
          entryFile: opts.entry,
          gitSha,
          gitBranch,
          ciProvider: ci.provider ?? undefined,
          concurrency,
          onProgress(event: DeployProgress) {
            switch (event.kind) {
              case "create":
                log(`  created deploy ${event.deployId.slice(0, 8)}`)
                break
              case "upload":
                fileCount++
                process.stderr.write(`\r  uploading… ${fileCount} files`)
                break
              case "finalize":
                process.stderr.write("\n")
                log("  finalizing…")
                break
            }
          },
        })

        if (jsonMode) {
          process.stdout.write(
            JSON.stringify({
              deployId: result.deployId,
              buildId: result.buildId,
              releaseId: result.releaseId,
              envId: result.envId,
              envName: result.envName,
            }) + "\n"
          )
        } else {
          log(`✓ deployed ${fileCount} files`)
          log(`  deploy: ${result.deployId}`)
          log(`  release: ${result.releaseId}`)
          log(`  env: ${result.envName}`)
        }
      } catch (e) {
        process.stderr.write("\n")
        if (e instanceof WizardoApiError) {
          err(`error [${e.code}]: ${e.message} (HTTP ${e.status})`)
        } else {
          err(`error: ${e instanceof Error ? e.message : String(e)}`)
        }
        process.exit(1)
      }
    })
}

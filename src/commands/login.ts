import { WizardoClient } from "@wizardo/sdk"
import type { Command } from "commander"

import { writeStoredToken } from "../config/auth.js"

export function registerLoginCommand(program: Command) {
  program
    .command("login")
    .description("Save an API token for local development")
    .option("--token <token>", "API token (if omitted, prompts interactively)")
    .option("--base-url <url>", "API base URL")
    .action(async (opts: { token?: string; baseUrl?: string }) => {
      let token = opts.token
      if (!token) {
        // Simple stdin prompt — works in any terminal.
        process.stdout.write("Paste your Wizardo API token: ")
        token = await readLine()
      }
      token = token.trim()
      if (!token) {
        console.error("error: token cannot be empty")
        process.exit(1)
      }

      // Verify the token before saving.
      try {
        const client = new WizardoClient({ token, baseUrl: opts.baseUrl })
        const me = await client.whoami()
        await writeStoredToken(token, opts.baseUrl)
        console.log(`✓ logged in — scope: project=${me.projectId} org=${me.orgId}`)
        console.log("  token saved to ~/.wizardo/auth.json (chmod 600)")
      } catch {
        console.error("error: token verification failed. Check the token and try again.")
        process.exit(1)
      }
    })
}

function readLine(): Promise<string> {
  return new Promise((resolve) => {
    let buf = ""
    process.stdin.setEncoding("utf8")
    process.stdin.resume()
    process.stdin.on("data", (chunk: string) => {
      const nl = chunk.indexOf("\n")
      if (nl >= 0) {
        buf += chunk.slice(0, nl)
        process.stdin.pause()
        resolve(buf)
      } else {
        buf += chunk
      }
    })
  })
}

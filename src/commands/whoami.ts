import { WizardoClient, WizardoApiError } from "@wizardo/sdk"
import type { Command } from "commander"

import { resolveToken } from "../config/auth.js"

export function registerWhoamiCommand(program: Command) {
  program
    .command("whoami")
    .description("Show the current authenticated token scope")
    .option("-t, --token <token>", "API token")
    .option("--base-url <url>", "API base URL")
    .action(async (opts: { token?: string; baseUrl?: string }) => {
      const token = await resolveToken(opts.token)
      if (!token) {
        console.error("error: not logged in. Run `wizardo login` or set WIZARDO_TOKEN.")
        process.exit(1)
      }
      try {
        const client = new WizardoClient({ token, baseUrl: opts.baseUrl })
        const me = await client.whoami()
        console.log(`tokenId:   ${me.tokenId}`)
        console.log(`orgId:     ${me.orgId}`)
        console.log(`projectId: ${me.projectId}`)
        console.log(`scope:     ${me.scope.join(", ")}`)
      } catch (e) {
        if (e instanceof WizardoApiError) {
          console.error(`error [${e.code}]: ${e.message}`)
        } else {
          console.error(`error: ${e instanceof Error ? e.message : String(e)}`)
        }
        process.exit(1)
      }
    })
}

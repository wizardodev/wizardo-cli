import { Command } from "commander"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

import { registerDeployCommand } from "./commands/deploy.js"
import { registerLoginCommand } from "./commands/login.js"
import { registerWhoamiCommand } from "./commands/whoami.js"

const require = createRequire(import.meta.url)
const pkg = require(join(dirname(fileURLToPath(import.meta.url)), "../package.json")) as {
  version: string
}

const program = new Command()
  .name("wizardo")
  .description("Deploy microfrontends to Wizardo from any CI/CD pipeline")
  .version(pkg.version)

registerLoginCommand(program)
registerWhoamiCommand(program)
registerDeployCommand(program)

program.parse(process.argv)

import chalk from "chalk"

import fs from "fs"
import util from "util"
import path from "path"

import pkg from "../package.json"

const fsAccess = util.promisify(fs.access)
const CWD = process.cwd()

const IS_INTERACTIVE = process.stdout.isTTY

if (IS_INTERACTIVE) {
  process.stdout.write(
    process.platform === "win32" ? "\x1Bc" : "\x1B[2J\x1B[3J\x1B[H"
  )
}

async function main() {
  console.log(chalk.bold(`edge bootstrap ${chalk.green(`v${pkg.version}`)}`))
  console.log()

  try {
    await fsAccess(path.join(CWD, "package.json"))
  } catch ({}) {
    console.log(chalk.red(`No package.json found in current path ${CWD}`))
    console.log(chalk.cyan(`> You might want to run ${chalk.white.bold("npm init")} first`))
    return
  }

  try {
    await fsAccess(path.join(__dirname, "..", "template.tar"))
  } catch ({}) {
    console.log(chalk.red(`No template.tar found in path ${__dirname}/..`))
    return
  }
}

main().catch(error => console.log(chalk.red(error.stack)))

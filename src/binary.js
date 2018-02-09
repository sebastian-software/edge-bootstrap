import chalk from "chalk"
import pkg from "../package.json"

const IS_INTERACTIVE = process.stdout.isTTY

if (IS_INTERACTIVE) {
  process.stdout.write(
    process.platform === "win32" ? "\x1Bc" : "\x1B[2J\x1B[3J\x1B[H"
  )
}

console.log(chalk.bold(`edge bootstrap ${chalk.green(`v${pkg.version}`)}`))

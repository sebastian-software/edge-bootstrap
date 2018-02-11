/* eslint-disable no-console, security/detect-non-literal-fs-filename, security/detect-object-injection */
import chalk from "chalk"
import mkdirp from "mkdirp"
import tar from "tar"
import ora from "ora"
import clipboardy from "clipboardy"

import fs from "fs"
import util from "util"
import path from "path"

import pkg from "../package.json"

const fsAccess = util.promisify(fs.access)
const fsReadFile = util.promisify(fs.readFile)
const CWD = process.cwd()

const IS_INTERACTIVE = process.stdout.isTTY

if (IS_INTERACTIVE) {
  process.stdout.write(process.platform === "win32" ? "\x1Bc" : "\x1B[2J\x1B[3J\x1B[H")
}

function writePackageJson(packageJsonPath, baseObj, templateObj) {
  const newContent = { ...baseObj }

  for (const key of ["main", "module", "bin", "files"]) {
    newContent[key] = templateObj[key]
  }

  for (const key of ["scripts", "dependencies", "devDependencies"]) {
    newContent[key] = newContent[key] || {}

    for (const valueKeys of Object.keys(templateObj[key])) {
      newContent[key][valueKeys] = templateObj[key][valueKeys]
    }
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(newContent, null, 2))
}

async function main() {
  console.log(chalk.bold(`edge create ${chalk.green(`v${pkg.version}`)}`))
  console.log()

  const packageJsonPath = path.join(CWD, "package.json")
  try {
    await fsAccess(packageJsonPath)
  } catch (error) {
    console.log(chalk.red(`No package.json found in current path ${CWD}`))
    console.log(
      chalk.cyan(`> You might want to run ${chalk.white.bold("npm init")} first`)
    )
    return
  }

  const templatePath = path.join(__dirname, "..", "template.tar")
  try {
    await fsAccess(templatePath)
  } catch (error) {
    console.log(chalk.red(`No template.tar found in path ${__dirname}/..`))
    return
  }

  const packageJsonContent = JSON.parse(await fsReadFile(packageJsonPath, "utf8"))

  const spinner = ora("Write project files from template").start()

  const tarParser = new tar.Parse()
  fs
    .createReadStream(templatePath)
    .pipe(tarParser)
    .on("entry", (entry) => {
      const entryPath = path.join(CWD, entry.path)

      if (entry.type === "Directory") {
        spinner.text = `Create path ${entryPath}`
        mkdirp(entryPath, () => {
          entry.resume()
        })
      } else if (entry.type === "File") {
        if (entry.path.endsWith("/package.json")) {
          spinner.text = "Update file package.json"
          entry.on("data", (data) => {
            const templatePackageJson = JSON.parse(data.toString())

            writePackageJson(packageJsonPath, packageJsonContent, templatePackageJson)
          })
        } else {
          spinner.text = `Create file ${entryPath}`
          entry.pipe(fs.createWriteStream(entryPath))
        }
      }
    })
    .on("end", () => {
      spinner.succeed("Wrote project files from template")

      const gettingStartedCommand = "npm install && npm run dev"

      console.log()
      console.log(
        chalk.cyan(
          `Run ${chalk.yellow(gettingStartedCommand)} to start development mode.`
        )
      )
      console.log(
        chalk.cyan("It's on your clipboard right now, so press CTRL-V or CMD-V!")
      )

      clipboardy.writeSync(gettingStartedCommand)
    })
}

main().catch((error) => console.log(chalk.red(error.stack)))
